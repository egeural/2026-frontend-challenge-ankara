import { LEVEL_COLORS, FORMS } from '../config/forms.js';

export function parseCoords(str) {
  if (!str) return null;
  const parts = str.split(',').map(s => parseFloat(s.trim()));
  return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) ? parts : null;
}

export function parseTimestamp(ts) {
  if (!ts) return 0;
  const m = ts.match(/(\d+)-(\d+)-(\d+)\s+(\d+):(\d+)/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime() : 0;
}

export function timeHHMM(ts) {
  if (!ts) return '??:??';
  const m = ts.match(/(\d+):(\d+)$/);
  return m ? `${m[1]}:${m[2]}` : ts;
}

// Normalises a raw row into a consistent event shape regardless of form type
export function extractEvent(slug, data) {
  if (slug === 'checkins') return {
    title: data.personName || '—',
    subtitle: 'Checked in',
    body: data.note || '',
    location: data.location || '',
    timestamp: data.timestamp || '',
    coords: data.coordinates || '',
    level: null,
  };
  if (slug === 'messages') return {
    title: `${data.senderName || '—'} → ${data.recipientName || '—'}`,
    subtitle: 'Message',
    body: data.text || data.message || '',
    location: data.location || '',
    timestamp: data.timestamp || '',
    coords: data.coordinates || '',
    level: (data.urgency || '').toLowerCase(),
  };
  if (slug === 'sightings') return {
    title: data.personName || '—',
    subtitle: `Seen with ${data.seenWith || '—'}`,
    body: data.note || '',
    location: data.location || '',
    timestamp: data.timestamp || '',
    coords: data.coordinates || '',
    level: null,
  };
  if (slug === 'notes') {
    const m = Array.isArray(data.mentionedPeople)
      ? data.mentionedPeople.join(', ')
      : (data.mentionedPeople || '');
    return {
      title: data.authorName || '—',
      subtitle: m ? `Mentions: ${m}` : 'Personal note',
      body: data.note || '',
      location: data.location || '',
      timestamp: data.timestamp || '',
      coords: data.coordinates || '',
      level: null,
    };
  }
  if (slug === 'tips') return {
    title: `Suspect: ${data.suspectName || '—'}`,
    subtitle: 'Anonymous tip',
    body: data.tip || '',
    location: data.location || '',
    timestamp: data.timestamp || '',
    coords: data.coordinates || '',
    level: (data.confidence || '').toLowerCase(),
  };
  return {};
}

export function buildPopupHtml(slug, ev) {
  const { color, label } = FORMS[slug];
  const lc = ev.level ? LEVEL_COLORS[ev.level] : null;

  const metaRows = [
    ev.timestamp ? `<div class="popup-meta-label">Time</div><div class="popup-meta-val">${ev.timestamp}</div>` : '',
    ev.location  ? `<div class="popup-meta-label">Location</div><div class="popup-meta-val">${ev.location}</div>` : '',
    ev.subtitle && !['Checked in','Message','Personal note'].includes(ev.subtitle)
      ? `<div class="popup-meta-label">Detail</div><div class="popup-meta-val">${ev.subtitle}</div>` : '',
  ].filter(Boolean).join('');

  return `<div class="popup-inner">
    <div class="popup-type-badge" style="background:${color}22;color:${color}">${label}</div>
    <div class="popup-title">${ev.title}</div>
    ${ev.subtitle ? `<div class="popup-subtitle">${ev.subtitle}</div>` : ''}
    ${ev.body ? `<div class="popup-divider"></div><div class="popup-body">${ev.body}</div>` : ''}
    ${metaRows ? `<div class="popup-divider"></div><div class="popup-meta-grid">${metaRows}</div>` : ''}
    ${lc ? `<div class="popup-level" style="background:${lc}22;color:${lc}">${ev.level}</div>` : ''}
  </div>`;
}
