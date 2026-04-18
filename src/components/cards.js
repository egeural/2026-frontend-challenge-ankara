function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function badgeHtml(level) {
  if (!level) return '';
  return `<span class="badge-urg badge-${level.toLowerCase()}">${level}</span>`;
}

function metaHtml(icon, text) {
  if (!text) return '';
  return `<span class="meta-item"><span class="ico">${icon}</span>${text}</span>`;
}

function coordLink(coords) {
  if (!coords) return '';
  return metaHtml('🗺', `<a href="https://maps.google.com/?q=${encodeURIComponent(coords)}" target="_blank" style="color:var(--accent);text-decoration:none">${coords}</a>`);
}

export function buildCheckinCard(data) {
  const name = data.personName || '—';
  return `<div class="card">
    <div class="card-header">
      <div class="avatar">${initials(name)}</div>
      <div class="card-meta">
        <div class="card-title">${name}</div>
        <div class="card-sub">Check-in</div>
      </div>
    </div>
    <div class="card-body">${data.note || ''}</div>
    <div class="card-footer">
      ${metaHtml('🕐', data.timestamp)}
      ${metaHtml('📍', data.location)}
      ${coordLink(data.coordinates)}
    </div>
  </div>`;
}

export function buildMessageCard(data) {
  const sender = data.senderName || '—';
  const recipient = data.recipientName || '—';
  const urgency = (data.urgency || '').toLowerCase();
  return `<div class="card">
    <div class="card-header">
      <div class="avatar" style="background:var(--accent)">${initials(sender)}</div>
      <div class="card-meta">
        <div class="card-title">${sender} → ${recipient}</div>
        <div class="card-sub">Message</div>
      </div>
      ${badgeHtml(urgency)}
    </div>
    <div class="card-body"><div class="message-text">${data.text || data.message || ''}</div></div>
    <div class="card-footer">
      ${metaHtml('🕐', data.timestamp)}
      ${metaHtml('📍', data.location)}
      ${coordLink(data.coordinates)}
    </div>
  </div>`;
}

export function buildSightingCard(data) {
  const person = data.personName || '—';
  return `<div class="card">
    <div class="card-header">
      <div class="avatar" style="background:#2b6cb0">${initials(person)}</div>
      <div class="card-meta">
        <div class="card-title">${person}</div>
        <div class="card-sub">Seen with: <strong>${data.seenWith || '—'}</strong></div>
      </div>
    </div>
    <div class="card-body">${data.note || ''}</div>
    <div class="card-footer">
      ${metaHtml('🕐', data.timestamp)}
      ${metaHtml('📍', data.location)}
      ${coordLink(data.coordinates)}
    </div>
  </div>`;
}

export function buildNoteCard(data) {
  const author = data.authorName || '—';
  const mentioned = Array.isArray(data.mentionedPeople)
    ? data.mentionedPeople.join(', ')
    : (data.mentionedPeople || '');
  return `<div class="card">
    <div class="card-header">
      <div class="avatar" style="background:#2d6a4f">${initials(author)}</div>
      <div class="card-meta">
        <div class="card-title">${author}</div>
        <div class="card-sub">Personal Note</div>
      </div>
    </div>
    <div class="card-body">${data.note || ''}</div>
    <div class="card-footer">
      ${metaHtml('🕐', data.timestamp)}
      ${metaHtml('📍', data.location)}
      ${mentioned ? metaHtml('👤', mentioned) : ''}
      ${coordLink(data.coordinates)}
    </div>
  </div>`;
}

export function buildTipCard(data) {
  const confidence = (data.confidence || '').toLowerCase();
  return `<div class="card">
    <div class="card-header">
      <div class="avatar" style="background:#742a2a">${initials(data.suspectName)}</div>
      <div class="card-meta">
        <div class="card-title">Suspect: ${data.suspectName || '—'}</div>
        <div class="card-sub">Anonymous Tip</div>
      </div>
      ${badgeHtml(confidence)}
    </div>
    <div class="card-body">${data.tip || ''}</div>
    <div class="card-footer">
      ${metaHtml('🕐', data.timestamp)}
      ${metaHtml('📍', data.location)}
      ${coordLink(data.coordinates)}
    </div>
  </div>`;
}

export const BUILDERS = {
  checkins:  buildCheckinCard,
  messages:  buildMessageCard,
  sightings: buildSightingCard,
  notes:     buildNoteCard,
  tips:      buildTipCard,
};
