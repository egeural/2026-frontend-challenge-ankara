import L from 'leaflet';
import { FORMS } from '../config/forms.js';
import { state } from '../state.js';
import { extractEvent, buildPopupHtml, parseCoords } from '../utils/events.js';
import { buildTimeline } from './timeline.js';

export function focusEvent(key) {
  document.querySelectorAll('.tl-card').forEach(c => c.classList.remove('tl-active'));
  const card = document.getElementById(`tlc-${key}`);
  if (card) {
    card.classList.add('tl-active');
    card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
  const ref = state.markerRefs[key];
  if (ref && state.map) {
    state.map.setView(ref.coords, Math.max(state.map.getZoom(), 15), { animate: true });
    setTimeout(() => ref.marker.openPopup(), 300);
  }
}

export function addMarkersToMap() {
  Object.keys(FORMS).forEach(slug => {
    (state.cache[slug] || []).forEach(data => {
      const ev = extractEvent(slug, data);
      const coords = parseCoords(ev.coords);
      if (!coords) return;

      const key = `${slug}-${data._id}`;
      const color = FORMS[slug].color;

      const marker = L.circleMarker(coords, {
        radius: 9,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      }).addTo(state.map);

      marker.bindPopup(buildPopupHtml(slug, ev), { maxWidth: 300 });

      marker.on('click', () => {
        document.querySelectorAll('.tl-card').forEach(c => c.classList.remove('tl-active'));
        const card = document.getElementById(`tlc-${key}`);
        if (card) {
          card.classList.add('tl-active');
          card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      });

      state.markerRefs[key] = { marker, coords };
    });
  });
}

export function initMap() {
  if (state.mapReady) return;
  state.mapReady = true;

  state.map = L.map('map-container', { zoomControl: true }).setView([39.915, 32.855], 14);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(state.map);

  addMarkersToMap();
  buildTimeline();
}

export function rebuildMap() {
  Object.values(state.markerRefs).forEach(r => r.marker.remove());
  Object.keys(state.markerRefs).forEach(k => delete state.markerRefs[k]);
  addMarkersToMap();
  buildTimeline();
}
