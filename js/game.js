/**
 * Beat Strike — Rhythm Click Game
 * Shrinking line outlines converge on target shapes — press when they align.
 */

// ─── Configuration ───────────────────────────────────────────────
const CONFIG = {
  bpm: 128,
  gameDuration: 60,
  approachTime: 1600,
  perfectWindow: 70,
  goodWindow: 140,
  basePoints: 100,
  shapeSize: 58,
  approachStartScale: 3.2,
  spawnMargin: 100,
  missLimit: 10,
};

const SHAPE_TYPES = ['circle', 'square', 'triangle', 'hexagon', 'diamond'];

// ─── Game State ──────────────────────────────────────────────────
const state = {
  running: false,
  score: 0,
  combo: 0,
  bestCombo: 0,
  perfects: 0,
  goods: 0,
  earlys: 0,
  lates: 0,
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
  progressLabel: document.getElementById('progress-label'),
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
  const tones = { perfect: 880, good: 660, early: 600, late: 600, miss: 220 };
  const types = { perfect: 'sine', good: 'triangle', early: 'triangle', late: 'triangle', miss: 'sawtooth' };
  playTone(tones[rating] || 220, rating === 'miss' ? 0.2 : 0.12, types[rating] || 'sawtooth', 0.12);
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

// ─── Shape Drawing ───────────────────────────────────────────────
function traceShape(type, size) {
  const s = size;
  switch (type) {
    case 'circle':
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      break;
    case 'square':
      ctx.rect(-s, -s, s * 2, s * 2);
      break;
    case 'triangle':
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.866, s * 0.5);
      ctx.lineTo(-s * 0.866, s * 0.5);
      ctx.closePath();
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const px = Math.cos(angle) * s;
        const py = Math.sin(angle) * s;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.65, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.65, 0);
      ctx.closePath();
      break;
  }
}

function drawShapeOutline(x, y, type, size, color, lineWidth, fill = null) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  traceShape(type, size);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

// ─── Note Spawning ───────────────────────────────────────────────
function spawnNote() {
  const w = els.canvas.width;
  const h = els.canvas.height;
  const margin = CONFIG.spawnMargin + CONFIG.shapeSize * CONFIG.approachStartScale;

  const note = {
    id: state.totalNotes++,
    x: margin + Math.random() * (w - margin * 2),
    y: margin + Math.random() * (h - margin * 2),
    shape: SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)],
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

function registerHit(rating, note) {
  if (rating === 'miss') {
    state.misses++;
    state.combo = 0;
    updateComboDisplay();
    showFeedback('MISS', 'miss');
    playHitSound('miss');
    if (state.misses >= CONFIG.missLimit) endGame();
    return;
  }

  if (rating === 'early' || rating === 'late') {
    state.combo = 0;
    if (rating === 'early') state.earlys++;
    else state.lates++;
    updateComboDisplay();
    showFeedback(rating.toUpperCase(), rating);
    playHitSound(rating);
    return;
  }

  state.combo++;
  if (state.combo > state.bestCombo) state.bestCombo = state.combo;

  const points = calculatePoints(rating);
  state.score += points;

  if (rating === 'perfect') state.perfects++;
  else state.goods++;

  updateHUD();
  updateComboDisplay();
  showFeedback(rating.toUpperCase() + ' +' + points, rating);
  playHitSound(rating);
  if (note) spawnParticles(note.x, note.y);
}

// ─── Input Handling ──────────────────────────────────────────────
function handleInput() {
  if (!state.running) return;

  const now = performance.now();
  let closestNote = null;
  let closestDiff = Infinity;

  for (const note of state.notes) {
    if (note.hit || note.missed) continue;
    const diff = now - note.hitTime;
    const absDiff = Math.abs(diff);
    if (absDiff < closestDiff) {
      closestDiff = absDiff;
      closestNote = note;
    }
  }

  if (!closestNote) {
    registerHit('miss');
    return;
  }

  const diff = now - closestNote.hitTime;

  if (Math.abs(diff) > CONFIG.goodWindow) {
    registerHit(diff < 0 ? 'early' : 'miss');
    return;
  }

  closestNote.hit = true;

  if (Math.abs(diff) <= CONFIG.perfectWindow) {
    closestNote.rating = 'perfect';
    registerHit('perfect', closestNote);
  } else if (diff < 0) {
    closestNote.rating = 'early';
    registerHit('early');
  } else {
    closestNote.rating = 'late';
    registerHit('late');
  }
}

// ─── Particles ───────────────────────────────────────────────────
function spawnParticles(x, y) {
  for (let i = 0; i < 14; i++) {
    const angle = (Math.PI * 2 * i) / 14;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * (2 + Math.random() * 5),
      vy: Math.sin(angle) * (2 + Math.random() * 5),
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
  const progress = Math.min(1, Math.max(0, 1 - timeLeft / CONFIG.approachTime));
  const targetSize = CONFIG.shapeSize;
  const approachScale = CONFIG.approachStartScale - (CONFIG.approachStartScale - 1) * progress;
  const approachSize = targetSize * approachScale;

  if (note.hit) {
    const alpha = Math.max(0, 1 - (now - note.hitTime) / 350);
    if (alpha <= 0) return;

    const color = note.rating === 'perfect' ? '#00f0ff' : '#ffd700';
    ctx.globalAlpha = alpha;
    const pulse = 1 + (1 - alpha) * 0.4;
    drawShapeOutline(note.x, note.y, note.shape, targetSize * pulse, color, 3,
      `rgba(0, 240, 255, ${alpha * 0.15})`);
    ctx.globalAlpha = 1;
    return;
  }

  if (note.missed) {
    const alpha = Math.max(0, 1 - (now - note.hitTime) / 600);
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha * 0.45;
    ctx.setLineDash([6, 6]);
    drawShapeOutline(note.x, note.y, note.shape, targetSize, '#ff4466', 2);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    return;
  }

  // Target shape — static inner outline
  drawShapeOutline(note.x, note.y, note.shape, targetSize, 'rgba(0, 240, 255, 0.85)', 2.5,
    'rgba(0, 240, 255, 0.06)');

  // Shrinking approach lines — outer outline converging inward
  const lineAlpha = 0.5 + progress * 0.5;
  drawShapeOutline(note.x, note.y, note.shape, approachSize,
    `rgba(255, 0, 170, ${lineAlpha})`, 3);

  // Alignment flash when close
  if (progress > 0.85) {
    const flash = (progress - 0.85) / 0.15;
    drawShapeOutline(note.x, note.y, note.shape, targetSize,
      `rgba(255, 255, 255, ${flash * 0.4})`, 1.5);
  }

  // Center crosshair dot
  ctx.beginPath();
  ctx.arc(note.x, note.y, 3, 0, Math.PI * 2);
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
      registerHit('late');
    }
  }

  for (const note of state.notes) {
    drawNote(note, now);
  }

  drawParticles();

  state.notes = state.notes.filter(n => {
    if (n.hit && now - n.hitTime > 400) return false;
    if (n.missed && now - n.hitTime > 700) return false;
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
    els.comboDisplay.offsetHeight;
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
  const total = CONFIG.gameDuration * 1000;
  const pct = Math.min(100, (elapsed / total) * 100);
  const secondsLeft = Math.max(0, Math.ceil((total - elapsed) / 1000));
  els.progressFill.style.width = pct + '%';
  if (els.progressLabel) {
    els.progressLabel.textContent = secondsLeft + 's';
  }
}

// ─── Game Loop ───────────────────────────────────────────────────
function gameLoop(timestamp) {
  if (!state.running) return;

  const elapsed = timestamp - state.startTime;
  const beatInterval = getBeatInterval();

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
  state.earlys = 0;
  state.lates = 0;
  state.misses = 0;
  state.totalNotes = 0;
  state.notes = [];
  state.particles = [];
  state.startTime = performance.now();
  state.lastSpawnTime = state.startTime - getBeatInterval();

  updateHUD();
  updateComboDisplay();
  updateProgress(0);
  showScreen('game');

  requestAnimationFrame(gameLoop);
}

function endGame() {
  state.running = false;

  const totalHits = state.perfects + state.goods + state.earlys + state.lates + state.misses;
  const accuracy = totalHits > 0
    ? Math.round(((state.perfects + state.goods) / totalHits) * 100)
    : 0;

  els.finalScore.textContent = state.score.toLocaleString();
  els.finalCombo.textContent = state.bestCombo;
  els.finalAccuracy.textContent = accuracy + '%';
  els.perfectCount.textContent = state.perfects;
  els.goodCount.textContent = state.goods;
  els.missCount.textContent = state.misses + state.earlys + state.lates;

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

resizeCanvas();
