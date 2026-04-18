import { FORMS, LEVEL_COLORS } from '../config/forms.js';
import { extractEvent, parseTimestamp, timeHHMM } from '../utils/events.js';
import { state } from '../state.js';

export function buildTimeline() {
  const scroll = document.getElementById('timeline-scroll');
  const allEvents = [];

  Object.keys(FORMS).forEach(slug => {
    (state.cache[slug] || []).forEach(data => {
      const ev = extractEvent(slug, data);
      if (!ev.coords) return;
      allEvents.push({ key: `${slug}-${data._id}`, slug, ev, ts: parseTimestamp(ev.timestamp) });
    });
  });

  allEvents.sort((a, b) => a.ts - b.ts);

  scroll.innerHTML = allEvents.map(({ key, slug, ev }) => {
    const color = FORMS[slug].color;
    const label = FORMS[slug].label;
    const lc = ev.level ? LEVEL_COLORS[ev.level] : null;
    const levelBadge = lc
      ? `<div style="margin-top:4px;display:inline-block;padding:1px 6px;border-radius:99px;font-size:9px;font-weight:700;text-transform:uppercase;background:${lc}22;color:${lc}">${ev.level}</div>`
      : '';
    return `<div class="tl-card" id="tlc-${key}" style="border-left-color:${color}" onclick="focusEvent('${key}')">
      <div class="tl-time" style="color:${color}">${timeHHMM(ev.timestamp)}</div>
      <div class="tl-type">${label}</div>
      <div class="tl-name">${ev.title}</div>
      <div class="tl-desc">${ev.body || ev.subtitle || ''}</div>
      <div class="tl-loc">📍 ${ev.location}</div>
      ${levelBadge}
    </div>`;
  }).join('');
}
