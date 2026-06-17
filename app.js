'use strict';

// ══════════════════════════════════
// STATE
// ══════════════════════════════════
const state = {
  level: 1,
  puzzles: [],          // filtered by level
  currentIndex: 0,
  selectedConnector: null,
  checked: false,
  score: 0,
  correctCount: 0,
  hintUsed: false,
  totalTime: 0,
  startTime: null,
};

// Color rotation for option buttons
const OPTION_COLORS = ['color-green', 'color-blue', 'color-yellow'];

// Owl messages
const OWL_IDLE    = "מצא את המילה שמחברת את הרעיונות!";
const OWL_CORRECT = ["כל הכבוד! 🎉", "מעולה! ⭐", "נכון מאוד! 🌟", "יופי של תשובה! 🏆"];
const OWL_WRONG   = ["נסה שוב! 💪", "כמעט! ממשיכים 😊", "אל תוותר! 🦉"];
const OWL_HINT    = (h) => h;

// ══════════════════════════════════
// DOM REFS
// ══════════════════════════════════
const $ = (id) => document.getElementById(id);
const screens = {
  welcome: $('screen-welcome'),
  game:    $('screen-game'),
  result:  $('screen-result'),
};

// ══════════════════════════════════
// SCREEN MANAGEMENT
// ══════════════════════════════════
function showScreen(name) {
  Object.entries(screens).forEach(([k, el]) => {
    el.classList.toggle('hidden', k !== name);
  });
}

// ══════════════════════════════════
// WELCOME SCREEN
// ══════════════════════════════════
function initWelcome() {
  document.querySelectorAll('.level-btn').forEach(btn => {
    const handler = (e) => {
      e.preventDefault();
      startGame(parseInt(btn.dataset.level));
    };
    btn.addEventListener('touchend', handler, { passive: false });
    btn.addEventListener('click', handler);
  });
}

// ══════════════════════════════════
// GAME START
// ══════════════════════════════════
function startGame(level) {
  state.level = level;
  state.puzzles = shuffle(PUZZLES.filter(p => p.level === level));
  state.currentIndex = 0;
  state.score = 0;
  state.correctCount = 0;
  state.totalTime = 0;
  state.startTime = Date.now();

  updateScoreDisplay();
  showScreen('game');
  loadPuzzle();
}

// ══════════════════════════════════
// LOAD PUZZLE
// ══════════════════════════════════
function loadPuzzle() {
  const puzzle = state.puzzles[state.currentIndex];
  state.selectedConnector = null;
  state.checked = false;
  state.hintUsed = false;

  // Stage info
  const total = state.puzzles.length;
  const current = state.currentIndex + 1;
  $('stage-num').textContent = `שלב ${current} מתוך ${total}`;
  $('stage-title').textContent = `רמה ${state.level} — ${LEVEL_NAMES[state.level]}`;

  // Progress
  const pct = ((current - 1) / total) * 100;
  $('progress-fill').style.width = pct + '%';
  $('progress-text').textContent = `${current}/${total}`;

  // Pieces
  $('part-a').textContent = puzzle.partA;
  $('part-b').textContent = puzzle.partB;

  // Connector slot
  const slot = $('connector-slot');
  slot.textContent = '?';
  slot.className = 'connector-slot';

  // Options
  const shuffledOpts = shuffle([...puzzle.options]);
  const grid = $('options-grid');
  grid.innerHTML = '';
  shuffledOpts.forEach((word, i) => {
    const btn = document.createElement('button');
    btn.className = `option-btn ${OPTION_COLORS[i % 3]}`;
    btn.textContent = word;
    btn.dataset.word = word;
    btn.addEventListener('click', () => selectConnector(word, btn));
    grid.appendChild(btn);
  });

  // Buttons
  const checkBtn = $('btn-check');
  checkBtn.textContent = 'בדיקה ✓';
  checkBtn.className = 'btn-check';
  checkBtn.disabled = true;

  $('btn-hint').disabled = false;

  // Owl
  setOwlMessage(OWL_IDLE, false);
}

// ══════════════════════════════════
// SELECT CONNECTOR
// ══════════════════════════════════
function selectConnector(word, btnEl) {
  if (state.checked) return;

  state.selectedConnector = word;

  // Update option button states
  document.querySelectorAll('.option-btn').forEach(b => {
    b.classList.toggle('selected', b === btnEl);
    b.disabled = false;
  });
  btnEl.classList.add('selected');

  // Fill slot
  const slot = $('connector-slot');
  slot.textContent = word;
  slot.className = 'connector-slot filled';

  // Enable check
  $('btn-check').disabled = false;

  // Owl anticipation
  setOwlMessage("בחרת: "" + word + "" — לחץ בדיקה!", false);
}

// ══════════════════════════════════
// CHECK ANSWER
// ══════════════════════════════════
function checkAnswer() {
  if (state.checked) {
    nextPuzzle();
    return;
  }
  if (!state.selectedConnector) return;

  state.checked = true;
  const puzzle = state.puzzles[state.currentIndex];
  const correct = state.selectedConnector === puzzle.correctConnector;

  const slot = $('connector-slot');
  const checkBtn = $('btn-check');

  // Disable options
  document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  $('btn-hint').disabled = true;

  if (correct) {
    slot.className = 'connector-slot correct';
    const points = state.hintUsed ? 50 : 100;
    state.score += points;
    state.correctCount++;
    updateScoreDisplay();
    checkBtn.textContent = 'הבא ➜';
    checkBtn.className = 'btn-check next-mode';
    checkBtn.disabled = false;

    const msg = OWL_CORRECT[Math.floor(Math.random() * OWL_CORRECT.length)];
    setOwlMessage(`${msg} +${points} נקודות!`, true);

    if (state.correctCount >= 3) {
      launchConfetti();
    }
    playSound('correct');
  } else {
    slot.className = 'connector-slot wrong';
    setOwlMessage(OWL_WRONG[Math.floor(Math.random() * OWL_WRONG.length)], true);
    playSound('wrong');

    // After shake, re-enable options for retry
    setTimeout(() => {
      state.checked = false;
      state.selectedConnector = null;
      slot.textContent = '?';
      slot.className = 'connector-slot';
      document.querySelectorAll('.option-btn').forEach(b => {
        b.disabled = false;
        b.classList.remove('selected');
      });
      checkBtn.disabled = true;
      $('btn-hint').disabled = state.hintUsed;
      setOwlMessage("נסה שוב — אתה יכול! 💪", false);
    }, 1000);
  }
}

// ══════════════════════════════════
// NEXT PUZZLE
// ══════════════════════════════════
function nextPuzzle() {
  state.currentIndex++;
  if (state.currentIndex >= state.puzzles.length) {
    showResult();
  } else {
    loadPuzzle();
  }
}

// ══════════════════════════════════
// HINT
// ══════════════════════════════════
function showHint() {
  if (state.hintUsed || state.checked) return;
  state.hintUsed = true;
  $('btn-hint').disabled = true;

  const puzzle = state.puzzles[state.currentIndex];
  setOwlMessage('💡 ' + puzzle.hint, true, true);
}

// ══════════════════════════════════
// OWL MESSAGE
// ══════════════════════════════════
function setOwlMessage(msg, animate = false, hintMode = false) {
  const bubble = $('speech-bubble');
  const owl = $('owl-figure');
  bubble.textContent = msg;
  bubble.classList.toggle('hint-mode', hintMode);
  if (animate) {
    owl.classList.remove('talking');
    void owl.offsetWidth; // reflow
    owl.classList.add('talking');
  }
}

// ══════════════════════════════════
// SCORE DISPLAY
// ══════════════════════════════════
function updateScoreDisplay() {
  $('score-display').textContent = state.score;
}

// ══════════════════════════════════
// RESULT SCREEN
// ══════════════════════════════════
function showResult() {
  const total = state.puzzles.length;
  const pct = state.correctCount / total;
  const stars = pct >= 0.9 ? '⭐⭐⭐' : pct >= 0.6 ? '⭐⭐' : '⭐';
  const resultTitle = pct >= 0.9 ? 'מעולה! 🎉' : pct >= 0.6 ? 'כל הכבוד! 👏' : 'המשיכו לנסות! 💪';

  $('result-title').textContent = resultTitle;
  $('result-score-num').textContent = state.score;
  $('result-stars').textContent = stars;
  $('result-correct').textContent = state.correctCount;
  $('result-total').textContent = total;

  // Save high score per level
  const key = `puzzle-hs-${state.level}`;
  const prev = parseInt(localStorage.getItem(key) || '0');
  if (state.score > prev) localStorage.setItem(key, state.score);

  showScreen('result');
  launchConfetti();
}

// ══════════════════════════════════
// CONFETTI
// ══════════════════════════════════
function launchConfetti() {
  const canvas = $('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 200,
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 4,
    size: 6 + Math.random() * 8,
    color: ['#FFD060','#4CB85C','#4A9FD4','#9B6DD4','#FF7050','#FF9040'][Math.floor(Math.random()*6)],
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 8,
  }));

  let frame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size * 0.5);
      ctx.restore();
      p.x += p.vx; p.y += p.vy;
      p.rot += p.rotV; p.vy += 0.05;
    });
    const alive = pieces.some(p => p.y < canvas.height + 20);
    if (alive) frame = requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  if (frame) cancelAnimationFrame(frame);
  draw();
}

// ══════════════════════════════════
// SOUNDS
// ══════════════════════════════════
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    if (type === 'correct') {
      o.frequency.setValueAtTime(523, ctx.currentTime);
      o.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      o.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
    } else {
      o.frequency.setValueAtTime(300, ctx.currentTime);
      o.frequency.setValueAtTime(200, ctx.currentTime + 0.15);
    }
    o.start(); o.stop(ctx.currentTime + 0.4);
  } catch(e) {}
}

// ══════════════════════════════════
// UTILS
// ══════════════════════════════════
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ══════════════════════════════════
// INIT
// ══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initWelcome();

  $('btn-check').addEventListener('click', checkAnswer);
  $('btn-hint').addEventListener('click', showHint);
  $('btn-back').addEventListener('click', () => showScreen('welcome'));

  $('btn-play-again').addEventListener('click', () => startGame(state.level));
  $('btn-change-level').addEventListener('click', () => showScreen('welcome'));

  // PWA service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});
