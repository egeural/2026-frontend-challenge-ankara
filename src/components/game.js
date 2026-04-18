import { state } from '../state.js';

// ── Suspicion scoring ─────────────────────────────────────────
function calcSuspicion(name) {
  const n = name.toLowerCase();
  let score = 0;
  const evidence = [];

  (state.cache.tips || []).forEach(tip => {
    if ((tip.suspectName || '').toLowerCase() !== n) return;
    const mult = { high: 3, medium: 2, low: 1 }[(tip.confidence || '').toLowerCase()] || 1;
    score += 20 * mult;
    evidence.push({ icon: '🔎', text: `Anonymous tip — ${tip.confidence || '?'} confidence`, detail: tip.tip });
  });

  (state.cache.sightings || []).forEach(s => {
    if ((s.personName || '').toLowerCase() !== n) return;
    score += 12;
    evidence.push({ icon: '👁', text: `Sighting at ${s.location || '?'} · ${s.timestamp || ''}`, detail: s.note });
  });

  (state.cache.checkins || []).forEach(c => {
    if ((c.personName || '').toLowerCase() !== n) return;
    score += 10;
    evidence.push({ icon: '📍', text: `Checked in at ${c.location || '?'} · ${c.timestamp || ''}`, detail: c.note });
  });

  (state.cache.messages || []).forEach(m => {
    const urgMult = { high: 3, medium: 2, low: 1 }[(m.urgency || '').toLowerCase()] || 1;
    if ((m.senderName || '').toLowerCase() === n) {
      score += 5 * urgMult;
      evidence.push({ icon: '💬', text: `Sent ${m.urgency || ''} message to ${m.recipientName || '?'}`, detail: m.text || m.message });
    }
    if ((m.recipientName || '').toLowerCase() === n) score += 2;
  });

  (state.cache.notes || []).forEach(note => {
    const mentioned = Array.isArray(note.mentionedPeople)
      ? note.mentionedPeople : (note.mentionedPeople ? [note.mentionedPeople] : []);
    if (mentioned.some(p => p.toLowerCase() === n)) {
      score += 8;
      evidence.push({ icon: '📝', text: `Mentioned in field notes at ${note.location || '?'}`, detail: '' });
    }
    if ((note.authorName || '').toLowerCase() === n) score += 5;
  });

  return { score, evidence };
}

// ── Collect all person names from data ────────────────────────
function collectSuspects() {
  const names = new Set();
  (state.cache.checkins  || []).forEach(r => r.personName  && names.add(r.personName));
  (state.cache.sightings || []).forEach(r => r.personName  && names.add(r.personName));
  (state.cache.messages  || []).forEach(r => {
    r.senderName    && names.add(r.senderName);
    r.recipientName && names.add(r.recipientName);
  });
  (state.cache.notes || []).forEach(r => r.authorName && names.add(r.authorName));
  (state.cache.tips  || []).forEach(r => r.suspectName && names.add(r.suspectName));

  return [...names]
    .map(name => ({ name, ...calcSuspicion(name) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ── Modal helpers ─────────────────────────────────────────────
function closeGame() {
  document.getElementById('game-modal')?.remove();
}

function scoreBar(score, max) {
  const pct = Math.min(100, Math.round((score / max) * 100));
  let color = '#68d391';
  if (pct > 40) color = '#f6c90e';
  if (pct > 70) color = '#fc8181';
  return `<div class="g-score-bar-wrap">
    <div class="g-score-bar" style="width:${pct}%;background:${color}"></div>
  </div>`;
}

function renderStep1(suspects, top4) {
  return `
    <div class="g-header">
      <div class="g-badge">🕵️ Investigation Mode</div>
      <div class="g-title">Who took Podo?</div>
      <div class="g-sub">You've studied the evidence. Pick your prime suspect.</div>
    </div>
    <div class="g-suspects">
      ${top4.map((s, i) => `
        <button class="g-suspect-btn" onclick="window._gameGuess(${i})">
          <div class="g-suspect-avatar">${s.name.slice(0,2).toUpperCase()}</div>
          <div class="g-suspect-name">${s.name}</div>
          <div class="g-suspect-hint">${s.evidence.length} piece${s.evidence.length !== 1 ? 's' : ''} of evidence</div>
        </button>
      `).join('')}
    </div>
    <button class="g-close-link" onclick="window._gameClose()">← Back to dashboard</button>`;
}

function renderStep2(chosen, top, allSuspects) {
  const isCorrect = chosen.name === top.name;
  const maxScore  = top.score || 1;

  const evidenceHtml = chosen.evidence.slice(0, 5).map(e => `
    <div class="g-evidence-item">
      <span class="g-ev-icon">${e.icon}</span>
      <div>
        <div class="g-ev-text">${e.text}</div>
        ${e.detail ? `<div class="g-ev-detail">${e.detail.slice(0, 100)}${e.detail.length > 100 ? '…' : ''}</div>` : ''}
      </div>
    </div>`).join('');

  const topThreeHtml = allSuspects.slice(0, 3).map((s, i) => `
    <div class="g-rank-item ${s.name === chosen.name ? 'g-rank-you' : ''}">
      <span class="g-rank-num">#${i + 1}</span>
      <span class="g-rank-name">${s.name}</span>
      ${scoreBar(s.score, maxScore)}
      <span class="g-rank-score">${s.score}pts</span>
    </div>`).join('');

  return `
    <div class="g-header">
      <div class="g-badge ${isCorrect ? 'g-badge-correct' : 'g-badge-wrong'}">
        ${isCorrect ? '✔ Sharp eye, detective' : '✖ Not quite'}
      </div>
      <div class="g-title">${chosen.name}</div>
      <div class="g-sub">${isCorrect
        ? 'Your instinct matched the data. Here\'s what the evidence says:'
        : `The data points harder at <strong>${top.name}</strong>. But here's what we have on ${chosen.name}:`}
      </div>
    </div>

    <div class="g-score-big">
      <span class="g-score-num">${chosen.score}</span>
      <span class="g-score-label">suspicion points</span>
    </div>
    ${scoreBar(chosen.score, maxScore)}

    ${evidenceHtml ? `
    <div class="g-section-label">Evidence trail</div>
    <div class="g-evidence">${evidenceHtml}</div>` : '<div class="g-section-label">No direct evidence found for this person.</div>'}

    <div class="g-section-label">Suspicion leaderboard</div>
    <div class="g-ranks">${topThreeHtml}</div>

    <div class="g-actions">
      <button class="g-btn g-btn-outline" onclick="window._gameRestart()">Try again</button>
      <button class="g-btn g-btn-primary" onclick="window._gameClose()">Close</button>
    </div>`;
}

// ── Public entry point ────────────────────────────────────────
export function openGame() {
  const suspects = collectSuspects();
  if (!suspects.length) {
    alert('No data loaded yet — wait for forms to finish loading.');
    return;
  }

  const top4 = suspects.slice(0, 4);

  const modal = document.createElement('div');
  modal.id = 'game-modal';
  modal.innerHTML = `
    <div class="g-overlay" onclick="window._gameClose()"></div>
    <div class="g-panel">
      <div class="g-inner" id="g-inner"></div>
    </div>`;
  document.body.appendChild(modal);

  const inner = document.getElementById('g-inner');
  inner.innerHTML = renderStep1(suspects, top4);

  window._gameGuess = (idx) => {
    const chosen = top4[idx];
    inner.innerHTML = renderStep2(chosen, suspects[0], suspects);
  };
  window._gameRestart = () => {
    inner.innerHTML = renderStep1(suspects, top4);
  };
  window._gameClose = closeGame;
}
