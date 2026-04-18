import 'leaflet/dist/leaflet.css';
import './styles/main.css';

import { FORMS } from './config/forms.js';
import { fetchFormData } from './api/jotform.js';
import { BUILDERS } from './components/cards.js';
import { initMap, rebuildMap, focusEvent, addTileLayer } from './components/map.js';
import { state } from './state.js';

// ── Expose to window for HTML onclick attributes ──────────────
window.focusEvent   = focusEvent;
window.switchTab    = switchTab;
window.loadAll      = loadAll;
window.filterCards  = filterCards;
window.closeSidebar = closeSidebar;

// ── Stat/badge ID maps ────────────────────────────────────────
const STAT_IDS  = { checkins:'s-checkins', messages:'s-messages', sightings:'s-sightings', notes:'s-notes', tips:'s-tips' };
const BADGE_IDS = { checkins:'b-checkins', messages:'b-messages', sightings:'b-sightings', notes:'b-notes', tips:'b-tips' };

// ── Card rendering ────────────────────────────────────────────
function renderCards(slug, rows) {
  const el = document.getElementById(`cards-${slug}`);
  if (!rows.length) { el.innerHTML = '<div class="empty">No submissions found.</div>'; return; }
  el.innerHTML = rows.map(BUILDERS[slug]).join('');
}

export function filterCards(slug, query) {
  const rows = state.cache[slug] || [];
  const q = query.toLowerCase().trim();
  const filtered = q ? rows.filter(r => Object.values(r).join(' ').toLowerCase().includes(q)) : rows;
  renderCards(slug, filtered);
  if (filtered.length === 0) document.getElementById(`cards-${slug}`).innerHTML = '<div class="empty">No results.</div>';
}

// ── Data loading ──────────────────────────────────────────────
async function loadForm(slug) {
  const el = document.getElementById(`cards-${slug}`);
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Loading…</div>';
  try {
    const rows = await fetchFormData(FORMS[slug]);
    state.cache[slug] = rows;
    document.getElementById(STAT_IDS[slug]).textContent  = rows.length;
    document.getElementById(BADGE_IDS[slug]).textContent = rows.length;
    renderCards(slug, rows);
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
  if (state.mapReady) rebuildMap();
}

// ── Tab switching (desktop sidebar + mobile bottom nav) ───────
let currentTab = 'checkins';

export function switchTab(slug, btn) {
  currentTab = slug;

  // sidebar buttons
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  // mobile nav buttons
  document.querySelectorAll('.mnav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === slug);
  });
  // mark the clicked sidebar btn active (if it's a sidebar btn)
  if (btn.classList.contains('tab-btn')) btn.classList.add('active');

  // panes
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
  document.getElementById(`pane-${slug}`).classList.add('active');

  // map init / resize
  if (slug === 'map') {
    if (!state.mapReady) initMap();
    else setTimeout(() => state.map.invalidateSize(), 50);
  }

  // close mobile sidebar if open
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
    state.map.eachLayer(layer => { if (layer._url) state.map.removeLayer(layer); });
    addTileLayer(dark ? DARK_TILE : LIGHT_TILE);
  }
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  applyTheme(document.documentElement.getAttribute('data-theme') !== 'light');
});

// restore saved theme (default: dark)
applyTheme(localStorage.getItem('theme') !== 'light');

// ── Loading screen ────────────────────────────────────────────
const ls = document.getElementById('loading-screen');

async function boot() {
  await loadAll();
  // small extra delay so the animation feels intentional
  await new Promise(r => setTimeout(r, 600));
  ls.classList.add('hidden');
}

boot();
