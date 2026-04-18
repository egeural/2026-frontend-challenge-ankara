const WORDS = [
  'KITTY', 'TABBY', 'TRACE', 'ALIBI', 'SNEAK',
  'PROWL', 'CATCH', 'HISSY', 'CLUES', 'FURRY',
  'PAWED', 'MEOWS', 'SLEEK', 'SPOOK', 'DECOY',
  'CLOAK', 'THEFT', 'SHADY', 'PURRS', 'SLINK',
  'STALK', 'HEIST', 'ROGUE', 'DODGE', 'TIGER',
  'SNOOP', 'TALON', 'CAPER', 'MANGY', 'CATTY',
  'MOGGY', 'FANGS', 'CLAWS', 'DETER', 'RISKY',
];

const MAX_GUESSES = 6;
const WORD_LEN = 5;

const WIN_MSGS = [
  "Purrfect detective work! 🐱",
  "Podo couldn't hide from you! 🕵️",
  "Case closed! Kağan confesses! 🎉",
  "Even the cat is impressed! 😸",
  "Sherlock Meow-lmes strikes again! 🔍",
];

const LOSE_MSGS = [
  "Podo escapes again... 😿",
  "The cat outwitted the detective! 🐱‍💨",
  "Back to the evidence board! 📋",
  "Podo is laughing somewhere in Ankara! 🏃",
  "Meow means 'you lost' in cat. 😾",
];

const HINT_MSGS = [
  "Think like a cat detective! 🔍",
  "Every clue leads to Podo! 📍",
  "What would Podo's accomplice say? 🐟",
  "The answer is hiding... like Podo! 😺",
  "Channel your inner feline fury! 🐾",
  "Kağan knows the word... probably. 🤫",
];

let ws = {
  answer: '',
  guesses: [],
  current: '',
  over: false,
  won: false,
};

function getTodayWord() {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return WORDS[dayIndex % WORDS.length];
}

export function initWordle() {
  ws = { answer: getTodayWord(), guesses: [], current: '', over: false, won: false };
  renderWordle();
}

function letterResult(guess, answer, i) {
  if (guess[i] === answer[i]) return 'correct';
  if (answer.includes(guess[i])) return 'present';
  return 'absent';
}

function letterStates(guesses, answer) {
  const s = {};
  for (const g of guesses) {
    for (let i = 0; i < g.length; i++) {
      const r = letterResult(g, answer, i);
      if (!s[g[i]] || s[g[i]] === 'absent' || (s[g[i]] === 'present' && r === 'correct')) {
        s[g[i]] = r;
      }
    }
  }
  return s;
}

function renderWordle() {
  const el = document.getElementById('wordle-content');
  if (!el) return;

  const { answer, guesses, current, over, won } = ws;

  let gridHTML = '<div class="w-grid">';
  for (let r = 0; r < MAX_GUESSES; r++) {
    gridHTML += '<div class="w-row">';
    const g = guesses[r];
    for (let c = 0; c < WORD_LEN; c++) {
      let cls = 'w-cell';
      let letter = '';
      if (g) {
        letter = g[c];
        cls += ' ' + letterResult(g, answer, c);
      } else if (r === guesses.length && !over) {
        letter = current[c] || '';
        if (letter) cls += ' filled';
      }
      gridHTML += `<div class="${cls}">${letter}</div>`;
    }
    gridHTML += '</div>';
  }
  gridHTML += '</div>';

  const kbRows = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','⌫'],
  ];
  const ls = letterStates(guesses, answer);
  let kbHTML = '<div class="w-keyboard">';
  for (const row of kbRows) {
    kbHTML += '<div class="w-kb-row">';
    for (const k of row) {
      const st = ls[k] || '';
      const wide = (k === 'ENTER' || k === '⌫') ? ' wide' : '';
      kbHTML += `<button class="w-key${wide} ${st}" onclick="wordleKey('${k}')">${k}</button>`;
    }
    kbHTML += '</div>';
  }
  kbHTML += '</div>';

  let statusHTML = '';
  if (over) {
    const msgs = won ? WIN_MSGS : LOSE_MSGS;
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    statusHTML = `<div class="w-status ${won ? 'w-win' : 'w-lose'}">
      <div class="w-status-msg">${msg}</div>
      ${!won ? `<div class="w-answer">The word was <strong>${answer}</strong></div>` : ''}
      <button class="w-play-again" onclick="initWordle()">Play Again 🔄</button>
    </div>`;
  } else {
    const hint = HINT_MSGS[guesses.length % HINT_MSGS.length];
    statusHTML = `<div class="w-hint">${hint}</div>`;
  }

  el.innerHTML = `
    <div class="w-title">🐱 Podo-rdle
      <div class="w-subtitle">Guess the 5-letter cat detective word!</div>
    </div>
    ${statusHTML}
    ${gridHTML}
    ${kbHTML}
    <div class="w-error" id="w-error"></div>
  `;
}

function showError(msg) {
  const el = document.getElementById('w-error');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2000);
}

export function wordleKey(key) {
  if (ws.over) return;
  if (key === '⌫') {
    ws.current = ws.current.slice(0, -1);
  } else if (key === 'ENTER') {
    if (ws.current.length < WORD_LEN) { showError('Not enough letters! 😾'); return; }
    ws.guesses = [...ws.guesses, ws.current];
    ws.current = '';
    if (ws.guesses[ws.guesses.length - 1] === ws.answer) {
      ws.over = true; ws.won = true;
    } else if (ws.guesses.length >= MAX_GUESSES) {
      ws.over = true;
    }
  } else if (ws.current.length < WORD_LEN) {
    ws.current += key;
  }
  renderWordle();
}

export function handleWordleKeydown(e) {
  const modal = document.getElementById('wordle-modal');
  if (!modal?.classList.contains('active')) return;
  if (e.key === 'Backspace') wordleKey('⌫');
  else if (e.key === 'Enter') wordleKey('ENTER');
  else if (/^[a-zA-Z]$/.test(e.key)) wordleKey(e.key.toUpperCase());
}
