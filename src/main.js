import 'leaflet/dist/leaflet.css';
import './styles/main.css';

import { FORMS } from './config/forms.js';
import { fetchFormData } from './api/jotform.js';
import { BUILDERS } from './components/cards.js';
import { initMap, rebuildMap, focusEvent, addTileLayer } from './components/map.js';
import { extractEvent, parseTimestamp, timeHHMM } from './utils/events.js';
import { state } from './state.js';

// ── Window exports ────────────────────────────────────────────
window.focusEvent   = focusEvent;
window.switchTab    = switchTab;
window.loadAll      = loadAll;
window.closeSidebar = closeSidebar;

// ── ID maps ───────────────────────────────────────────────────
const STAT_IDS  = { checkins:'s-checkins', messages:'s-messages', sightings:'s-sightings', notes:'s-notes', tips:'s-tips' };
const CARD_IDS  = { checkins:'dbn-checkins', messages:'dbn-messages', sightings:'dbn-sightings', notes:'dbn-notes', tips:'dbn-tips' };
const BADGE_IDS = { checkins:'b-checkins', messages:'b-messages', sightings:'b-sightings', notes:'b-notes', tips:'b-tips' };

// ── Filter state per slug ─────────────────────────────────────
const filters = {};
Object.keys(FORMS).forEach(s => { filters[s] = { query: '', location: '', level: '' }; });
filters.all = { query: '', type: '', location: '' };

// ── Apply filters & re-render ─────────────────────────────────
function applyFilters(slug) {
  if (slug === 'all') { renderAll(); return; }
  const f = filters[slug];
  const rows = (state.cache[slug] || []).filter(r => {
    const txt  = Object.values(r).join(' ').toLowerCase();
    const loc  = (r.location || r.coordinates || '').toLowerCase();
    const lvl  = (r.urgency || r.confidence || '').toLowerCase();
    if (f.query    && !txt.includes(f.query.toLowerCase()))    return false;
    if (f.location && !loc.includes(f.location.toLowerCase())) return false;
    if (f.level    && lvl !== f.level)                         return false;
    return true;
  });
  const el = document.getElementById(`cards-${slug}`);
  if (!rows.length) { el.innerHTML = '<div class="empty">No results for these filters.</div>'; return; }
  el.innerHTML = rows.map(BUILDERS[slug]).join('');
}

// ── Build filter bar after data loads ─────────────────────────
function buildFilterBar(slug) {
  const bar = document.getElementById(`filter-bar-${slug}`);
  if (!bar) return;
  const rows = state.cache[slug] || [];

  // unique locations
  const locs = [...new Set(rows.map(r => r.location).filter(Boolean))].sort();
  const locOptions = locs.map(l => `<option value="${l}">${l}</option>`).join('');

  // level chips: messages=urgency, tips=confidence
  let levelChips = '';
  if (slug === 'messages') {
    levelChips = `<div class="chip-group">
      ${['', 'low', 'medium', 'high'].map(v => `
        <button class="chip${filters[slug].level === v ? ' active' : ''}" onclick="setFilter('${slug}','level','${v}')">
          ${v || 'All'}
        </button>`).join('')}
    </div>`;
  }
  if (slug === 'tips') {
    levelChips = `<div class="chip-group">
      ${['', 'low', 'medium', 'high'].map(v => `
        <button class="chip${filters[slug].level === v ? ' active' : ''}" onclick="setFilter('${slug}','level','${v}')">
          ${v || 'All'}
        </button>`).join('')}
    </div>`;
  }

  bar.innerHTML = `
    <div class="filter-row">
      <div class="filter-search-wrap">
        <span class="filter-icon">🔍</span>
        <input class="search-input" placeholder="Search by name, note, text…"
          value="${filters[slug].query}"
          oninput="setFilter('${slug}','query',this.value)" />
      </div>
      ${locs.length ? `
      <div class="filter-select-wrap">
        <span class="filter-icon">📍</span>
        <select class="filter-select" onchange="setFilter('${slug}','location',this.value)">
          <option value="">All Locations</option>
          ${locOptions}
        </select>
      </div>` : ''}
      ${levelChips}
    </div>`;
}

function buildAllFilterBar() {
  const bar = document.getElementById('filter-bar-all');
  if (!bar) return;

  const allLocs = [...new Set(
    Object.keys(FORMS).flatMap(s => (state.cache[s] || []).map(r => r.location).filter(Boolean))
  )].sort();

  const formChips = [
    { val: '', label: 'All' },
    ...Object.entries(FORMS).map(([s, f]) => ({ val: s, label: f.label })),
  ];

  bar.innerHTML = `
    <div class="filter-row">
      <div class="filter-search-wrap">
        <span class="filter-icon">🔍</span>
        <input class="search-input" placeholder="Search across all events…"
          value="${filters.all.query}"
          oninput="setFilter('all','query',this.value)" />
      </div>
      ${allLocs.length ? `
      <div class="filter-select-wrap">
        <span class="filter-icon">📍</span>
        <select class="filter-select" onchange="setFilter('all','location',this.value)">
          <option value="">All Locations</option>
          ${allLocs.map(l => `<option value="${l}">${l}</option>`).join('')}
        </select>
      </div>` : ''}
      <div class="chip-group">
        ${formChips.map(({ val, label }) => `
          <button class="chip${filters.all.type === val ? ' active' : ''}"
            style="${val ? `--chip-c:${FORMS[val]?.color}` : ''}"
            onclick="setFilter('all','type','${val}')">
            ${label}
          </button>`).join('')}
      </div>
    </div>`;
}

// ── Set a filter value and re-render ──────────────────────────
window.setFilter = function(slug, key, val) {
  filters[slug][key] = val;
  buildFilterBar(slug);      // rebuild to refresh chip active states
  if (slug === 'all') { buildAllFilterBar(); renderAll(); }
  else applyFilters(slug);
};

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

  all.sort((a, b) => a.ts - b.ts);

  const filtered = all.filter(({ slug, data, ev }) => {
    if (f.type && slug !== f.type) return false;
    if (f.location && !(ev.location || '').toLowerCase().includes(f.location.toLowerCase())) return false;
    if (f.query) {
      const txt = Object.values(data).join(' ').toLowerCase();
      if (!txt.includes(f.query.toLowerCase())) return false;
    }
    return true;
  });

  if (!filtered.length) { el.innerHTML = '<div class="empty">No events match these filters.</div>'; return; }

  el.innerHTML = filtered.map(({ slug, ev }) => {
    const color = FORMS[slug].color;
    const label = FORMS[slug].label;
    const lc = ev.level ? ({ low:'#68d391', medium:'#f6c90e', high:'#fc8181' }[ev.level]) : null;
    return `
      <div class="card all-card" style="border-left: 4px solid ${color}">
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
  await Promise.all(Object.keys(FORMS).map(loadForm));
  btn.disabled = false;
  btn.textContent = '↻ Refresh';
  buildAllFilterBar();
  renderAll();
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

// FIX: was !== 'light' which kept it dark always
document.getElementById('theme-toggle').addEventListener('click', () => {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'light');
});

applyTheme(localStorage.getItem('theme') !== 'light');

// ── Boot & loading screen ─────────────────────────────────────
const ls = document.getElementById('loading-screen');

async function boot() {
  await loadAll();
  await new Promise(r => setTimeout(r, 500));
  ls.classList.add('hidden');
}

boot();
