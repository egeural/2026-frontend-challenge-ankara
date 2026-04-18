import 'leaflet/dist/leaflet.css';
import './styles/main.css';

import { FORMS } from './config/forms.js';
import { fetchFormData } from './api/jotform.js';
import { BUILDERS } from './components/cards.js';
import { initMap, rebuildMap, focusEvent, addTileLayer } from './components/map.js';
import { state } from './state.js';

// Expose to window for HTML onclick attributes
window.focusEvent = focusEvent;
window.switchTab = switchTab;
window.loadAll = loadAll;
window.filterCards = filterCards;

// ── Theme toggle ─────────────────────────────────────────────
const DARK_TILE  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.getElementById('theme-toggle').textContent = dark ? '🌙' : '☀️';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  swapTileLayer(dark ? DARK_TILE : LIGHT_TILE);
}

function swapTileLayer(url) {
  if (!state.mapReady || !state.map) return;
  state.map.eachLayer(layer => {
    if (layer._url) state.map.removeLayer(layer);
  });
  addTileLayer(url);
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  applyTheme(!isDark);
});

// restore saved preference
const saved = localStorage.getItem('theme');
applyTheme(saved ? saved === 'dark' : true);

const STAT_IDS  = { checkins: 's-checkins', messages: 's-messages', sightings: 's-sightings', notes: 's-notes', tips: 's-tips' };
const BADGE_IDS = { checkins: 'b-checkins', messages: 'b-messages', sightings: 'b-sightings', notes: 'b-notes', tips: 'b-tips' };

function renderCards(slug, rows) {
  const container = document.getElementById(`cards-${slug}`);
  if (!rows.length) { container.innerHTML = '<div class="empty">No submissions found.</div>'; return; }
  container.innerHTML = rows.map(BUILDERS[slug]).join('');
}

export function filterCards(slug, query) {
  const rows = state.cache[slug] || [];
  const q = query.toLowerCase().trim();
  const filtered = q ? rows.filter(r => Object.values(r).join(' ').toLowerCase().includes(q)) : rows;
  renderCards(slug, filtered);
  if (filtered.length === 0) document.getElementById(`cards-${slug}`).innerHTML = '<div class="empty">No results.</div>';
}

async function loadForm(slug) {
  const container = document.getElementById(`cards-${slug}`);
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading…</div>';
  try {
    const rows = await fetchFormData(FORMS[slug]);
    state.cache[slug] = rows;
    document.getElementById(STAT_IDS[slug]).textContent = rows.length;
    document.getElementById(BADGE_IDS[slug]).textContent = rows.length;
    renderCards(slug, rows);
  } catch (e) {
    container.innerHTML = `<div class="empty">⚠️ Failed: ${e.message}</div>`;
  }
}

export function switchTab(slug, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`pane-${slug}`).classList.add('active');
  if (slug === 'map') {
    if (!state.mapReady) initMap();
    else setTimeout(() => state.map.invalidateSize(), 50);
  }
}

export async function loadAll() {
  const btn = document.getElementById('refresh-btn');
  btn.disabled = true;
  btn.textContent = '↻ Loading…';
  await Promise.all(Object.keys(FORMS).map(loadForm));
  btn.disabled = false;
  btn.textContent = '↻ Refresh';
  if (state.mapReady) rebuildMap();
}

loadAll();
