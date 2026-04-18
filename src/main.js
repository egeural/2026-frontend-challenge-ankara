import 'leaflet/dist/leaflet.css';
import './styles/main.css';

import { FORMS } from './config/forms.js';
import { fetchFormData } from './api/jotform.js';
import { BUILDERS } from './components/cards.js';
import { initMap, rebuildMap, focusEvent, addTileLayer } from './components/map.js';
import { extractEvent, parseTimestamp, timeHHMM } from './utils/events.js';
import { buildInvestigationGame } from './utils/investigation.js';
import { initWordle, wordleKey, handleWordleKeydown } from './utils/wordle.js';
import { state } from './state.js';

// ── Window exports ─────────────────────────────────────────────
window.focusEvent   = focusEvent;
window.switchTab    = switchTab;
window.loadAll      = loadAll;
window.closeSidebar = closeSidebar;
window.toggleLevel  = toggleLevel;
window.toggleType   = toggleType;
window.openInvestigation = openInvestigation;
window.closeInvestigation = closeInvestigation;
window.selectSuspect = selectSuspect;
window.submitSuspectGuess = submitSuspectGuess;
window.resetInvestigation = resetInvestigation;
window.openWordle = openWordle;
window.closeWordle = closeWordle;
window.wordleKey = wordleKey;
window.initWordle = initWordle;

// ── ID maps ───────────────────────────────────────────────────
const STAT_IDS  = { checkins:'s-checkins', messages:'s-messages', sightings:'s-sightings', notes:'s-notes', tips:'s-tips' };
const CARD_IDS  = { checkins:'dbn-checkins', messages:'dbn-messages', sightings:'dbn-sightings', notes:'dbn-notes', tips:'dbn-tips' };
const BADGE_IDS = { checkins:'b-checkins', messages:'b-messages', sightings:'b-sightings', notes:'b-notes', tips:'b-tips' };

// ── Filter state per slug ─────────────────────────────────────
function freshFilters() {
  const f = {};
  Object.keys(FORMS).forEach(s => { f[s] = { query: '', location: '', levels: [], sort: 'time-asc' }; });
  f.all = { query: '', types: [], location: '', sort: 'time-asc' };
  return f;
}
let filters = freshFilters();
const investigation = { game: null, selected: '', submitted: false };

// ── Sort helpers ──────────────────────────────────────────────
function getNameField(slug, r) {
  if (slug === 'checkins')  return r.personName || '';
  if (slug === 'messages')  return r.senderName || '';
  if (slug === 'sightings') return r.personName || '';
  if (slug === 'notes')     return r.authorName || '';
  if (slug === 'tips')      return r.suspectName || '';
  return '';
}

function sortRows(slug, rows, key) {
  const s = [...rows];
  if (key === 'time-asc')  return s.sort((a,b) => parseTimestamp(a.timestamp||'') - parseTimestamp(b.timestamp||''));
  if (key === 'time-desc') return s.sort((a,b) => parseTimestamp(b.timestamp||'') - parseTimestamp(a.timestamp||''));
  if (key === 'name-asc')  return s.sort((a,b) => getNameField(slug,a).localeCompare(getNameField(slug,b)));
  if (key === 'name-desc') return s.sort((a,b) => getNameField(slug,b).localeCompare(getNameField(slug,a)));
  return s;
}

// ── Apply filters & re-render ─────────────────────────────────
function applyFilters(slug) {
  if (slug === 'all') { renderAll(); return; }
  const f = filters[slug];
  let rows = (state.cache[slug] || []).filter(r => {
    const txt = Object.values(r).join(' ').toLowerCase();
    const loc = (r.location || r.coordinates || '').toLowerCase();
    const lvl = (r.urgency || r.confidence || '').toLowerCase();
    if (f.query    && !txt.includes(f.query.toLowerCase()))    return false;
    if (f.location && !loc.includes(f.location.toLowerCase())) return false;
    if (f.levels.length && !f.levels.includes(lvl))           return false;
    return true;
  });
  rows = sortRows(slug, rows, f.sort);
  const el = document.getElementById(`cards-${slug}`);
  if (!rows.length) { el.innerHTML = '<div class="empty">No results for these filters.</div>'; return; }
  el.innerHTML = rows.map(BUILDERS[slug]).join('');
}

// ── Multi-select level chip toggle ────────────────────────────
function toggleLevel(slug, val) {
  const f = filters[slug];
  const i = f.levels.indexOf(val);
  if (i === -1) f.levels.push(val); else f.levels.splice(i, 1);
  document.getElementById(`filter-bar-${slug}`)
    ?.querySelectorAll('.chip[data-level]')
    .forEach(c => c.classList.toggle('active', f.levels.includes(c.dataset.level)));
  applyFilters(slug);
}

// ── Type chip toggle (all pane) ───────────────────────────────
function toggleType(val) {
  const f = filters.all;
  if (val === '') {
    f.types = [];
  } else {
    const i = f.types.indexOf(val);
    if (i === -1) f.types.push(val); else f.types.splice(i, 1);
  }
  const bar = document.getElementById('filter-bar-all');
  if (bar) {
    bar.querySelectorAll('.chip[data-type]').forEach(c => {
      const v = c.dataset.type;
      c.classList.toggle('active', v === '' ? f.types.length === 0 : f.types.includes(v));
    });
  }
  renderAll();
}

// ── Build filter bar (built once after data loads) ────────────
function buildFilterBar(slug) {
  const bar = document.getElementById(`filter-bar-${slug}`);
  if (!bar || bar.dataset.built) return;
  bar.dataset.built = '1';

  const rows = state.cache[slug] || [];
  const locs = [...new Set(rows.map(r => r.location).filter(Boolean))].sort();

  let levelHtml = '';
  if (slug === 'messages' || slug === 'tips') {
    levelHtml = `<div class="chip-group">
      ${['low','medium','high'].map(v => `
        <button class="chip" data-level="${v}" onclick="toggleLevel('${slug}','${v}')">${v[0].toUpperCase()+v.slice(1)}</button>
      `).join('')}
    </div>`;
  }

  bar.innerHTML = `
    <div class="filter-row">
      <div class="filter-search-wrap">
        <span class="filter-icon">🔍</span>
        <input class="search-input filter-query" placeholder="Search by name, location, note…" />
      </div>
      ${locs.length ? `
      <div class="filter-select-wrap">
        <span class="filter-icon">📍</span>
        <select class="filter-select filter-loc">
          <option value="">All Locations</option>
          ${locs.map(l => `<option value="${l}">${l}</option>`).join('')}
        </select>
      </div>` : ''}
      <div class="filter-select-wrap">
        <span class="filter-icon">↕</span>
        <select class="filter-select filter-sort">
          <option value="time-asc">Time ↑</option>
          <option value="time-desc">Time ↓</option>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
        </select>
      </div>
      ${levelHtml}
    </div>`;

  bar.querySelector('.filter-query').addEventListener('input', e => {
    filters[slug].query = e.target.value;
    applyFilters(slug);
  });
  bar.querySelector('.filter-loc')?.addEventListener('change', e => {
    filters[slug].location = e.target.value;
    applyFilters(slug);
  });
  bar.querySelector('.filter-sort').addEventListener('change', e => {
    filters[slug].sort = e.target.value;
    applyFilters(slug);
  });
}

function buildAllFilterBar() {
  const bar = document.getElementById('filter-bar-all');
  if (!bar || bar.dataset.built) return;
  bar.dataset.built = '1';

  const allLocs = [...new Set(
    Object.keys(FORMS).flatMap(s => (state.cache[s] || []).map(r => r.location).filter(Boolean))
  )].sort();

  bar.innerHTML = `
    <div class="filter-row">
      <div class="filter-search-wrap">
        <span class="filter-icon">🔍</span>
        <input class="search-input filter-query" placeholder="Search across all events…" />
      </div>
      ${allLocs.length ? `
      <div class="filter-select-wrap">
        <span class="filter-icon">📍</span>
        <select class="filter-select filter-loc">
          <option value="">All Locations</option>
          ${allLocs.map(l => `<option value="${l}">${l}</option>`).join('')}
        </select>
      </div>` : ''}
      <div class="filter-select-wrap">
        <span class="filter-icon">↕</span>
        <select class="filter-select filter-sort">
          <option value="time-asc">Time ↑</option>
          <option value="time-desc">Time ↓</option>
        </select>
      </div>
      <div class="chip-group">
        <button class="chip active" data-type="" onclick="toggleType('')">All</button>
        ${Object.entries(FORMS).map(([s, f]) => `
          <button class="chip" data-type="${s}" style="--chip-c:${f.color}" onclick="toggleType('${s}')">${f.label}</button>
        `).join('')}
      </div>
    </div>`;

  bar.querySelector('.filter-query').addEventListener('input', e => {
    filters.all.query = e.target.value;
    renderAll();
  });
  bar.querySelector('.filter-loc')?.addEventListener('change', e => {
    filters.all.location = e.target.value;
    renderAll();
  });
  bar.querySelector('.filter-sort').addEventListener('change', e => {
    filters.all.sort = e.target.value;
    renderAll();
  });
}

// ── Card rendering ────────────────────────────────────────────
function renderCards(slug, rows) {
  const el = document.getElementById(`cards-${slug}`);
  if (!rows.length) { el.innerHTML = '<div class="empty">No submissions found.</div>'; return; }
  el.innerHTML = rows.map(BUILDERS[slug]).join('');
}

// ── All Events combined view ──────────────────────────────────
function renderAll() {
  const el = document.getElementById('cards-all');
  const f  = filters.all;

  const all = [];
  Object.keys(FORMS).forEach(slug => {
    (state.cache[slug] || []).forEach(data => {
      const ev = extractEvent(slug, data);
      all.push({ slug, data, ev, ts: parseTimestamp(ev.timestamp) });
    });
  });

  if (f.sort === 'time-desc') all.sort((a,b) => b.ts - a.ts);
  else all.sort((a,b) => a.ts - b.ts);

  const filtered = all.filter(({ slug, data, ev }) => {
    if (f.types.length && !f.types.includes(slug)) return false;
    if (f.location && !(ev.location || '').toLowerCase().includes(f.location.toLowerCase())) return false;
    if (f.query) {
      if (!Object.values(data).join(' ').toLowerCase().includes(f.query.toLowerCase())) return false;
    }
    return true;
  });

  if (!filtered.length) { el.innerHTML = '<div class="empty">No events match these filters.</div>'; return; }

  el.innerHTML = filtered.map(({ slug, ev }) => {
    const color = FORMS[slug].color;
    const label = FORMS[slug].label;
    const lc = ev.level ? ({ low:'#68d391', medium:'#f6c90e', high:'#fc8181' }[ev.level]) : null;
    return `
      <div class="card all-card" style="border-left:4px solid ${color}">
        <div class="all-card-type" style="color:${color};background:${color}18">${label}</div>
        <div class="card-header" style="margin-bottom:6px">
          <div class="avatar" style="background:${color}">${(ev.title||'?').slice(0,2).toUpperCase()}</div>
          <div class="card-meta">
            <div class="card-title">${ev.title}</div>
            <div class="card-sub">${ev.subtitle || ''}</div>
          </div>
          ${lc ? `<span class="badge-urg badge-${ev.level}">${ev.level}</span>` : ''}
        </div>
        ${ev.body ? `<div class="card-body" style="margin-bottom:8px;font-size:13px;opacity:.85">${ev.body}</div>` : ''}
        <div class="card-footer">
          <span class="meta-item">🕐 ${ev.timestamp ? timeHHMM(ev.timestamp) : '—'}</span>
          <span class="meta-item">📍 ${ev.location || '—'}</span>
        </div>
      </div>`;
  }).join('');
}

// ── Investigation quiz ──────────────────────────────────────────
function refreshInvestigation() {
  investigation.game = buildInvestigationGame(state.cache);
  investigation.selected = '';
  investigation.submitted = false;
  renderInvestigation();
}

function openInvestigation() {
  if (!investigation.game) refreshInvestigation();
  const modal = document.getElementById('investigation-modal');
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  renderInvestigation();
}

function closeInvestigation() {
  const modal = document.getElementById('investigation-modal');
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function selectSuspect(name) {
  investigation.selected = name;
  investigation.submitted = false;
  renderInvestigation();
}

function submitSuspectGuess() {
  if (!investigation.selected) return;
  investigation.submitted = true;
  renderInvestigation();
}

function resetInvestigation() {
  investigation.selected = '';
  investigation.submitted = false;
  renderInvestigation();
}

function renderInvestigation() {
  const content = document.getElementById('investigation-content');
  if (!content) return;

  const game = investigation.game;
  if (!game || !game.topSuspect) {
    content.innerHTML = `
      <div class="investigation-head">
        <div class="investigation-kicker">Investigation mode</div>
        <h2 id="investigation-title">Who looks suspicious?</h2>
        <p class="investigation-copy">Load the evidence first, then test your theory against the timeline.</p>
      </div>
      <div class="investigation-empty">No suspect analysis is available yet.</div>`;
    return;
  }

  if (!investigation.submitted) {
    const options = game.suspects.map(suspect => `
      <button
        class="suspect-option ${investigation.selected === suspect.name ? 'active' : ''}"
        onclick="selectSuspect(decodeURIComponent('${encodeURIComponent(suspect.name)}'))"
      >
        <span class="suspect-option-name">${suspect.name}</span>
        <span class="suspect-option-meta">${suspect.relatedCount} clues collected</span>
      </button>
    `).join('');

    content.innerHTML = `
      <div class="investigation-head">
        <div class="investigation-kicker">Investigation mode</div>
        <h2 id="investigation-title">Who looks most suspicious based on the evidence?</h2>
        <p class="investigation-copy">Pick a suspect, submit your guess, and compare it against sightings, connections, and timeline overlap with Podo.</p>
      </div>
      <div class="suspect-grid">${options}</div>
      <div class="investigation-actions">
        <button class="investigation-submit" ${investigation.selected ? '' : 'disabled'} onclick="submitSuspectGuess()">Submit guess</button>
      </div>`;
    return;
  }

  const selected = game.allAnalyses.find(suspect => suspect.name === investigation.selected) || game.topSuspect;
  const correct = selected.name === game.topSuspect.name;
  const connections = selected.connections.length
    ? selected.connections.slice(0, 4).join(', ')
    : 'No strong named connections';
  const locations = selected.locations.length
    ? selected.locations.join(', ')
    : 'No repeated location pattern';
  const timelineGap = selected.lastSeenGapMinutes == null
    ? 'No reliable timeline gap'
    : `${selected.lastSeenGapMinutes} min before Podo vanished`;
  const verdict = correct
    ? `Good pick. ${selected.summary}`
    : `Not quite. ${selected.summary} ${game.topSuspect.name} has the stronger pattern in the evidence.`;

  content.innerHTML = `
    <div class="investigation-head">
      <div class="investigation-kicker">Analysis</div>
      <h2 id="investigation-title">${correct ? 'Correct lead' : 'Not quite'}</h2>
      <p class="investigation-copy">${verdict}</p>
    </div>
    <div class="investigation-score ${correct ? 'success' : 'warning'}">
      <span class="investigation-score-label">Suspicion score</span>
      <strong>${selected.score}%</strong>
    </div>
    <div class="investigation-metrics">
      <div class="investigation-metric">
        <span>Connections</span>
        <strong>${selected.connectionsCount}</strong>
        <small>${connections}</small>
      </div>
      <div class="investigation-metric">
        <span>Sightings with Podo</span>
        <strong>${selected.sightingsWithPodo}</strong>
        <small>${selected.relatedCount} total evidence points</small>
      </div>
      <div class="investigation-metric">
        <span>Timeline overlap</span>
        <strong>${selected.overlaps}</strong>
        <small>${timelineGap}</small>
      </div>
      <div class="investigation-metric">
        <span>Linked locations</span>
        <strong>${selected.locationsCount}</strong>
        <small>${locations}</small>
      </div>
    </div>
    <div class="investigation-actions">
      <button class="investigation-secondary" onclick="resetInvestigation()">Try another suspect</button>
      <button class="investigation-submit" onclick="closeInvestigation();switchTab('map', null)">Back to map</button>
    </div>`;
}

// ── Data loading ──────────────────────────────────────────────
async function loadForm(slug) {
  const el = document.getElementById(`cards-${slug}`);
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Loading…</div>';
  try {
    const rows = await fetchFormData(FORMS[slug]);
    state.cache[slug] = rows;
    const n = rows.length;
    document.getElementById(STAT_IDS[slug]).textContent  = n;
    document.getElementById(BADGE_IDS[slug]).textContent = n;
    document.getElementById(CARD_IDS[slug]).textContent  = n;
    renderCards(slug, rows);
    buildFilterBar(slug);
  } catch (e) {
    el.innerHTML = `<div class="empty">⚠️ ${e.message}</div>`;
  }
}

export async function loadAll() {
  const btn = document.getElementById('refresh-btn');
  btn.disabled = true;
  btn.textContent = '↻ …';
  document.querySelectorAll('.filter-bar[data-built]').forEach(b => b.removeAttribute('data-built'));
  filters = freshFilters();
  await Promise.all(Object.keys(FORMS).map(loadForm));
  btn.disabled = false;
  btn.textContent = '↻ Refresh';
  buildAllFilterBar();
  renderAll();
  refreshInvestigation();
  if (state.mapReady) rebuildMap();
}

// ── Tab switching ─────────────────────────────────────────────
export function switchTab(slug, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mnav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === slug);
  });
  if (btn?.classList?.contains('tab-btn')) btn.classList.add('active');
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
  document.getElementById(`pane-${slug}`).classList.add('active');
  if (slug === 'map') {
    if (!state.mapReady) initMap();
    else setTimeout(() => state.map.invalidateSize(), 50);
  }
  closeSidebar();
}

// ── Mobile sidebar ────────────────────────────────────────────
document.getElementById('burger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('active');
});

document.getElementById('investigation-modal').addEventListener('click', e => {
  if (e.target.id === 'investigation-modal') closeInvestigation();
});

// ── Wordle modal ──────────────────────────────────────────────
function openWordle() {
  const modal = document.getElementById('wordle-modal');
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  initWordle();
}

function closeWordle() {
  const modal = document.getElementById('wordle-modal');
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', handleWordleKeydown);

export function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

// ── Theme toggle ─────────────────────────────────────────────
const DARK_TILE  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.getElementById('theme-toggle').textContent = dark ? '🌙' : '☀️';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  if (state.mapReady && state.map) {
    state.map.eachLayer(l => { if (l._url) state.map.removeLayer(l); });
    addTileLayer(dark ? DARK_TILE : LIGHT_TILE);
  }
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'light');
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeInvestigation();
});

applyTheme(localStorage.getItem('theme') !== 'light');

// ── Boot ──────────────────────────────────────────────────────
const ls = document.getElementById('loading-screen');

async function boot() {
  await loadAll();
  await new Promise(r => setTimeout(r, 500));
  ls.classList.add('hidden');
}

boot();
