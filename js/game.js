/**
 * Beat Strike — Rhythm Click Game
 * Click when the approach ring meets the target circle.
 * Chain successful hits to stack combo points.
 */

// ─── Configuration ───────────────────────────────────────────────
const CONFIG = {
  bpm: 128,
  gameDuration: 60,          // seconds
  approachTime: 1500,        // ms for ring to shrink to target
  perfectWindow: 80,         // ms tolerance for perfect
  goodWindow: 160,           // ms tolerance for good
  basePoints: 100,
  noteRadius: 50,
  approachStartScale: 3.5,
  spawnMargin: 80,           // keep notes away from edges
  missLimit: 10,             // game ends after this many misses
};

// ─── Game State ──────────────────────────────────────────────────
const state = {
  running: false,
  score: 0,
  combo: 0,
  bestCombo: 0,
  perfects: 0,
  goods: 0,
  misses: 0,
  totalNotes: 0,
  startTime: 0,
  lastSpawnTime: 0,
  notes: [],
  particles: [],
  audioCtx: null,
};

// ─── DOM Elements ────────────────────────────────────────────────
const screens = {
  start: document.getElementById('start-screen'),
  game: document.getElementById('game-screen'),
  results: document.getElementById('results-screen'),
};

const els = {
  score: document.getElementById('score'),
  comboDisplay: document.getElementById('combo-display'),
  comboCount: document.getElementById('combo-count'),
  bestCombo: document.getElementById('best-combo'),
  feedback: document.getElementById('feedback'),
  progressFill: document.getElementById('progress-fill'),
  canvas: document.getElementById('game-canvas'),
  finalScore: document.getElementById('final-score'),
  finalCombo: document.getElementById('final-combo'),
  finalAccuracy: document.getElementById('final-accuracy'),
  perfectCount: document.getElementById('perfect-count'),
  goodCount: document.getElementById('good-count'),
  missCount: document.getElementById('miss-count'),
};

const ctx = els.canvas.getContext('2d');

// ─── Screen Management ───────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ─── Audio ───────────────────────────────────────────────────────
function initAudio() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
}

function playTone(freq, duration = 0.1, type = 'sine', volume = 0.15) {
  if (!state.audioCtx) return;
  const osc = state.audioCtx.createOscillator();
  const gain = state.audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, state.audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(state.audioCtx.destination);
  osc.start();
  osc.stop(state.audioCtx.currentTime + duration);
}

function playHitSound(rating) {
  const tones = { perfect: 880, good: 660, miss: 220 };
  const types = { perfect: 'sine', good: 'triangle', miss: 'sawtooth' };
  playTone(tones[rating], rating === 'miss' ? 0.2 : 0.12, types[rating], 0.12);
}

function playBeatTick() {
  playTone(440, 0.05, 'square', 0.06);
}

// ─── Canvas Setup ────────────────────────────────────────────────
function resizeCanvas() {
  const area = document.getElementById('game-area');
  els.canvas.width = area.clientWidth;
  els.canvas.height = area.clientHeight;
}

// ─── Note Spawning ───────────────────────────────────────────────
function spawnNote() {
  const w = els.canvas.width;
  const h = els.canvas.height;
  const margin = CONFIG.spawnMargin + CONFIG.noteRadius * CONFIG.approachStartScale;

  const note = {
    id: state.totalNotes++,
    x: margin + Math.random() * (w - margin * 2),
    y: margin + Math.random() * (h - margin * 2),
    hitTime: performance.now() + CONFIG.approachTime,
    hit: false,
    missed: false,
    rating: null,
  };

  state.notes.push(note);
  playBeatTick();
}

function getBeatInterval() {
  return (60 / CONFIG.bpm) * 1000;
}

// ─── Scoring ─────────────────────────────────────────────────────
function calculatePoints(rating) {
  const multiplier = state.combo > 0 ? state.combo : 1;
  const base = rating === 'perfect' ? CONFIG.basePoints : CONFIG.basePoints * 0.5;
  return Math.round(base * multiplier);
}

function registerHit(rating) {
  if (rating === 'miss') {
    state.misses++;
    state.combo = 0;
    updateComboDisplay();
    showFeedback('MISS', 'miss');
    playHitSound('miss');

    if (state.misses >= CONFIG.missLimit) {
      endGame();
    }
    return;
  }

  state.combo++;
  if (state.combo > state.bestCombo) {
    state.bestCombo = state.combo;
  }

  const points = calculatePoints(rating);
  state.score += points;

  if (rating === 'perfect') state.perfects++;
  else state.goods++;

  updateHUD();
  updateComboDisplay();
  showFeedback(rating.toUpperCase() + ' +' + points, rating);
  playHitSound(rating);
  spawnParticles();
}

// ─── Input Handling ──────────────────────────────────────────────
function handleInput() {
  if (!state.running) return;

  const now = performance.now();
  let closestNote = null;
  let closestDiff = Infinity;

  for (const note of state.notes) {
    if (note.hit || note.missed) continue;
    const diff = Math.abs(now - note.hitTime);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestNote = note;
    }
  }

  if (!closestNote || closestDiff > CONFIG.goodWindow) {
    registerHit('miss');
    return;
  }

  closestNote.hit = true;

  if (closestDiff <= CONFIG.perfectWindow) {
    closestNote.rating = 'perfect';
    registerHit('perfect');
  } else {
    closestNote.rating = 'good';
    registerHit('good');
  }
}

// ─── Particles ───────────────────────────────────────────────────
function spawnParticles() {
  const w = els.canvas.width;
  const h = els.canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    state.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * (2 + Math.random() * 4),
      vy: Math.sin(angle) * (2 + Math.random() * 4),
      life: 1,
      color: state.combo > 5
        ? `hsl(${30 + state.combo * 5}, 100%, 60%)`
        : '#00f0ff',
    });
  }
}

// ─── Rendering ───────────────────────────────────────────────────
function drawNote(note, now) {
  const timeLeft = note.hitTime - now;
  const progress = 1 - timeLeft / CONFIG.approachTime;
  const approachRadius = CONFIG.noteRadius * (CONFIG.approachStartScale - (CONFIG.approachStartScale - 1) * progress);

  if (note.hit) {
    const alpha = Math.max(0, 1 - (now - note.hitTime) / 300);
    if (alpha <= 0) return;

    const color = note.rating === 'perfect' ? '#00f0ff' : '#ffd700';
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(note.x, note.y, CONFIG.noteRadius * (1 + (1 - alpha) * 0.5), 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  if (note.missed) {
    const alpha = Math.max(0, 1 - (now - note.hitTime) / 500);
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha * 0.5;
    ctx.beginPath();
    ctx.arc(note.x, note.y, CONFIG.noteRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ff4466';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    return;
  }

  // Target circle
  ctx.beginPath();
  ctx.arc(note.x, note.y, CONFIG.noteRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Approach ring
  ctx.beginPath();
  ctx.arc(note.x, note.y, approachRadius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 0, 170, 0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner dot
  ctx.beginPath();
  ctx.arc(note.x, note.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#00f0ff';
  ctx.fill();
}

function drawParticles() {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.03;

    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }

    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function render(now) {
  const w = els.canvas.width;
  const h = els.canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Background grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Auto-miss notes that weren't hit in time
  for (const note of state.notes) {
    if (!note.hit && !note.missed && now > note.hitTime + CONFIG.goodWindow) {
      note.missed = true;
      registerHit('miss');
    }
  }

  // Draw notes
  for (const note of state.notes) {
    drawNote(note, now);
  }

  drawParticles();

  // Clean up old notes
  state.notes = state.notes.filter(n => {
    if (n.hit && now - n.hitTime > 400) return false;
    if (n.missed && now - n.hitTime > 600) return false;
    return true;
  });
}

// ─── HUD Updates ─────────────────────────────────────────────────
function updateHUD() {
  els.score.textContent = state.score.toLocaleString();
  els.bestCombo.textContent = state.bestCombo;
}

function updateComboDisplay() {
  if (state.combo >= 2) {
    els.comboDisplay.classList.remove('hidden');
    els.comboCount.textContent = state.combo;
    els.comboDisplay.style.animation = 'none';
    els.comboDisplay.offsetHeight; // reflow
    els.comboDisplay.style.animation = '';
  } else {
    els.comboDisplay.classList.add('hidden');
  }
}

function showFeedback(text, className) {
  els.feedback.textContent = text;
  els.feedback.className = 'feedback ' + className;
  els.feedback.style.animation = 'none';
  els.feedback.offsetHeight;
  els.feedback.style.animation = '';
}

function updateProgress(elapsed) {
  const pct = Math.min(100, (elapsed / (CONFIG.gameDuration * 1000)) * 100);
  els.progressFill.style.width = pct + '%';
}

// ─── Game Loop ───────────────────────────────────────────────────
function gameLoop(timestamp) {
  if (!state.running) return;

  const elapsed = timestamp - state.startTime;
  const beatInterval = getBeatInterval();

  // Spawn notes on beat
  if (timestamp - state.lastSpawnTime >= beatInterval) {
    spawnNote();
    state.lastSpawnTime = timestamp;
  }

  render(timestamp);
  updateProgress(elapsed);

  if (elapsed >= CONFIG.gameDuration * 1000) {
    endGame();
    return;
  }

  requestAnimationFrame(gameLoop);
}

// ─── Game Flow ───────────────────────────────────────────────────
function startGame() {
  initAudio();
  resizeCanvas();

  state.running = true;
  state.score = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.perfects = 0;
  state.goods = 0;
  state.misses = 0;
  state.totalNotes = 0;
  state.notes = [];
  state.particles = [];
  state.startTime = performance.now();
  state.lastSpawnTime = state.startTime - getBeatInterval();

  updateHUD();
  updateComboDisplay();
  showScreen('game');

  requestAnimationFrame(gameLoop);
}

function endGame() {
  state.running = false;

  const totalHits = state.perfects + state.goods + state.misses;
  const accuracy = totalHits > 0
    ? Math.round(((state.perfects + state.goods) / totalHits) * 100)
    : 0;

  els.finalScore.textContent = state.score.toLocaleString();
  els.finalCombo.textContent = state.bestCombo;
  els.finalAccuracy.textContent = accuracy + '%';
  els.perfectCount.textContent = state.perfects;
  els.goodCount.textContent = state.goods;
  els.missCount.textContent = state.misses;

  showScreen('results');
}

// ─── Event Listeners ─────────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('retry-btn').addEventListener('click', startGame);

els.canvas.addEventListener('click', handleInput);

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (screens.start.classList.contains('active')) {
      startGame();
    } else if (screens.results.classList.contains('active')) {
      startGame();
    } else {
      handleInput();
    }
  }
});

window.addEventListener('resize', () => {
  if (screens.game.classList.contains('active')) {
    resizeCanvas();
  }
});

// Initial canvas size
resizeCanvas();
