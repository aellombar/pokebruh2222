/**
 * Beat Strike — Rhythm Click Game
 * Beat-synced to procedural genre songs.
 */

const CONFIG = {
  speedIncreasePerLevel: 0.1,
  perfectWindow: 70,
  goodWindow: 140,
  basePoints: 100,
  shapeSize: 58,
  approachStartScale: 3.2,
  missLimit: 10,
  audioLeadMs: 80,
};

const SHAPE_TYPES = ['circle', 'square', 'triangle', 'hexagon', 'diamond'];

const state = {
  running: false,
  selectedSongId: 'electronic',
  song: null,
  songStartPerf: 0,
  beatQueue: [],
  beatQueueIndex: 0,
  score: 0,
  combo: 0,
  bestCombo: 0,
  perfects: 0,
  goods: 0,
  earlys: 0,
  lates: 0,
  misses: 0,
  totalNotes: 0,
  currentNote: null,
  speedLevel: 0,
  perfectHitStreak: 0,
  particles: [],
  audioCtx: null,
};

const screens = {
  start: document.getElementById('start-screen'),
  select: document.getElementById('select-screen'),
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
  songTitle: document.getElementById('song-title'),
  canvas: document.getElementById('game-canvas'),
  finalScore: document.getElementById('final-score'),
  finalCombo: document.getElementById('final-combo'),
  finalAccuracy: document.getElementById('final-accuracy'),
  finalSong: document.getElementById('final-song'),
  perfectCount: document.getElementById('perfect-count'),
  goodCount: document.getElementById('good-count'),
  missCount: document.getElementById('miss-count'),
  songGrid: document.getElementById('song-grid'),
};

const ctx = els.canvas.getContext('2d');

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function initAudio() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
  songPlayer.init(state.audioCtx);
}

function playHitSound(rating) {
  if (!state.audioCtx) return;
  const tones = { perfect: 880, good: 660, early: 600, late: 600, miss: 220 };
  const types = { perfect: 'sine', good: 'triangle', early: 'triangle', late: 'triangle', miss: 'sawtooth' };
  const t = state.audioCtx.currentTime;
  const osc = state.audioCtx.createOscillator();
  const gain = state.audioCtx.createGain();
  osc.type = types[rating] || 'sawtooth';
  osc.frequency.value = tones[rating] || 220;
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(gain);
  gain.connect(state.audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

function resizeCanvas() {
  const area = document.getElementById('game-area');
  els.canvas.width = area.clientWidth;
  els.canvas.height = area.clientHeight;
}

function getBeatMs() {
  return songPlayer.getBeatMs(state.song);
}

function getApproachBeats() {
  return Math.max(1, state.song.approachBeats - Math.floor(state.speedLevel / 2));
}

function getApproachTime() {
  return getApproachBeats() * getBeatMs();
}

function beatToPerfTime(beatIndex) {
  return state.songStartPerf + songPlayer.beatToMs(state.song, beatIndex);
}

function maybeIncreaseSpeed() {
  state.perfectHitStreak++;
  if (state.perfectHitStreak % 2 === 0) {
    state.speedLevel++;
    return true;
  }
  return false;
}

// ─── Shape Drawing ───────────────────────────────────────────────
function traceShape(type, size) {
  const s = size;
  switch (type) {
    case 'circle': ctx.arc(0, 0, s, 0, Math.PI * 2); break;
    case 'square': ctx.rect(-s, -s, s * 2, s * 2); break;
    case 'triangle':
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.866, s * 0.5); ctx.lineTo(-s * 0.866, s * 0.5); ctx.closePath(); break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const px = Math.cos(angle) * s, py = Math.sin(angle) * s;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); break;
    case 'diamond':
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.65, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.65, 0); ctx.closePath(); break;
  }
}

function drawShapeOutline(x, y, type, size, color, lineWidth, fill = null) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  traceShape(type, size);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

// ─── Beat-synced Note Spawning ───────────────────────────────────
function hasActiveNote() {
  return state.currentNote !== null;
}

function spawnNoteForBeat(beatEntry, hitTime, approachTime) {
  const w = els.canvas.width;
  const h = els.canvas.height;

  state.currentNote = {
    id: state.totalNotes++,
    beatIndex: beatEntry.beatIndex,
    x: w / 2,
    y: h / 2,
    shape: SHAPE_TYPES[state.totalNotes % SHAPE_TYPES.length],
    approachTime,
    hitTime,
    hit: false,
    missed: false,
    rating: null,
  };
  beatEntry.spawned = true;
}

function skipMissedBeats(now) {
  if (hasActiveNote()) return;

  while (state.beatQueueIndex < state.beatQueue.length) {
    const beat = state.beatQueue[state.beatQueueIndex];
    if (beat.resolved) {
      state.beatQueueIndex++;
      continue;
    }

    const hitTime = beatToPerfTime(beat.beatIndex);
    const approachTime = getApproachTime();

    if (now > hitTime + CONFIG.goodWindow) {
      beat.resolved = true;
      state.beatQueueIndex++;
      continue;
    }

    if (!beat.spawned && now >= hitTime - approachTime) {
      spawnNoteForBeat(beat, hitTime, approachTime);
    }
    break;
  }
}

function finishCurrentNote() {
  const beat = state.beatQueue[state.beatQueueIndex];
  if (beat) beat.resolved = true;
  state.currentNote = null;
  state.beatQueueIndex++;
}

function calculatePoints(rating) {
  const multiplier = state.combo > 0 ? state.combo : 1;
  const base = rating === 'perfect' ? CONFIG.basePoints : CONFIG.basePoints * 0.5;
  return Math.round(base * multiplier);
}

function registerHit(rating, note) {
  if (rating === 'miss') {
    state.misses++;
    state.combo = 0;
    state.perfectHitStreak = 0;
    updateComboDisplay();
    showFeedback('MISS', 'miss');
    playHitSound('miss');
    if (state.misses >= CONFIG.missLimit) endGame();
    return;
  }

  if (rating === 'early' || rating === 'late') {
    state.combo = 0;
    state.perfectHitStreak = 0;
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

  let speedUp = false;
  if (rating === 'perfect') {
    state.perfects++;
    speedUp = maybeIncreaseSpeed();
  } else {
    state.goods++;
  }

  updateHUD();
  updateComboDisplay();
  showFeedback(rating.toUpperCase() + ' +' + points + (speedUp ? ' — SPEED UP!' : ''), rating);
  playHitSound(rating);
  if (note) spawnParticles(note.x, note.y);
}

function handleInput() {
  if (!state.running) return;

  const note = state.currentNote;
  if (!note || note.hit || note.missed) {
    registerHit('miss');
    return;
  }

  const now = performance.now();
  const diff = now - note.hitTime;

  if (Math.abs(diff) > CONFIG.goodWindow) {
    registerHit(diff < 0 ? 'early' : 'miss');
    return;
  }

  note.hit = true;

  if (Math.abs(diff) <= CONFIG.perfectWindow) {
    note.rating = 'perfect';
    registerHit('perfect', note);
  } else if (diff < 0) {
    note.rating = 'early';
    note.missed = true;
    registerHit('early');
  } else {
    note.rating = 'late';
    note.missed = true;
    registerHit('late');
  }
}

function spawnParticles(x, y) {
  const color = state.song ? state.song.color : '#00f0ff';
  for (let i = 0; i < 14; i++) {
    const angle = (Math.PI * 2 * i) / 14;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * (2 + Math.random() * 5),
      vy: Math.sin(angle) * (2 + Math.random() * 5),
      life: 1,
      color: state.combo > 5 ? `hsl(${30 + state.combo * 5}, 100%, 60%)` : color,
    });
  }
}

function drawNote(note, now) {
  const timeLeft = note.hitTime - now;
  const progress = Math.min(1, Math.max(0, 1 - timeLeft / note.approachTime));
  const targetSize = CONFIG.shapeSize;
  const approachScale = CONFIG.approachStartScale - (CONFIG.approachStartScale - 1) * progress;
  const approachSize = targetSize * approachScale;
  const accent = state.song ? state.song.accent : '#ff00aa';
  const color = state.song ? state.song.color : '#00f0ff';

  if (note.hit) {
    const alpha = Math.max(0, 1 - (now - note.hitTime) / 350);
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    drawShapeOutline(note.x, note.y, note.shape, targetSize * (1 + (1 - alpha) * 0.4),
      note.rating === 'perfect' ? color : '#ffd700', 3, `${color}22`);
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

  drawShapeOutline(note.x, note.y, note.shape, targetSize, color, 2.5, `${color}10`);
  drawShapeOutline(note.x, note.y, note.shape, approachSize, accent, 3);

  if (progress > 0.85) {
    const flash = (progress - 0.85) / 0.15;
    drawShapeOutline(note.x, note.y, note.shape, targetSize, `rgba(255,255,255,${flash * 0.4})`, 1.5);
  }

  ctx.beginPath();
  ctx.arc(note.x, note.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawParticles() {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx; p.y += p.vy; p.life -= 0.03;
    if (p.life <= 0) { state.particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function render(now) {
  const w = els.canvas.width, h = els.canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  skipMissedBeats(now);

  const note = state.currentNote;
  if (note && !note.hit && !note.missed && now > note.hitTime + CONFIG.goodWindow) {
    note.missed = true;
    registerHit('late');
  }

  if (note) {
    drawNote(note, now);
    if (note.hit && now - note.hitTime > 400) finishCurrentNote();
    else if (note.missed && now - note.hitTime > 700) finishCurrentNote();
  }

  drawParticles();
}

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

function updateProgress() {
  const elapsed = songPlayer.getElapsedMs();
  const total = state.song.duration * 1000;
  const pct = Math.min(100, (elapsed / total) * 100);
  const secondsLeft = Math.max(0, Math.ceil((total - elapsed) / 1000));
  els.progressFill.style.width = pct + '%';
  if (els.progressLabel) els.progressLabel.textContent = secondsLeft + 's';
}

function gameLoop() {
  if (!state.running) return;

  const now = performance.now();
  render(now);
  updateProgress();

  if (songPlayer.isFinished() || state.beatQueueIndex >= state.beatQueue.length) {
    if (!hasActiveNote()) { endGame(); return; }
  }

  if (state.misses >= CONFIG.missLimit) return;

  requestAnimationFrame(gameLoop);
}

function resetGameState() {
  state.score = 0;
  state.combo = 0;
  state.bestCombo = 0;
  state.perfects = 0;
  state.goods = 0;
  state.earlys = 0;
  state.lates = 0;
  state.misses = 0;
  state.totalNotes = 0;
  state.currentNote = null;
  state.speedLevel = 0;
  state.perfectHitStreak = 0;
  state.particles = [];
  state.beatQueueIndex = 0;
}

function startGame(songId) {
  initAudio();
  resetGameState();

  state.selectedSongId = songId || state.selectedSongId;
  state.song = songPlayer.getSong(state.selectedSongId);
  state.beatQueue = songPlayer.buildBeatMap(state.song).map(beatIndex => ({
    beatIndex, spawned: false, resolved: false,
  }));

  state.running = true;
  state.songStartPerf = performance.now() + CONFIG.audioLeadMs;

  songPlayer.play(state.song);

  if (els.songTitle) {
    els.songTitle.textContent = state.song.title;
    els.songTitle.style.color = state.song.color;
  }

  updateHUD();
  updateComboDisplay();
  updateProgress();
  showScreen('game');
  resizeCanvas();

  const firstBeat = state.beatQueue[0];
  if (firstBeat) {
    const hitTime = beatToPerfTime(firstBeat.beatIndex);
    const approachTime = getApproachTime();
    spawnNoteForBeat(firstBeat, hitTime, approachTime);
    state.beatQueueIndex = 0;
  }

  render(performance.now());
  requestAnimationFrame(gameLoop);
}

function endGame() {
  state.running = false;
  songPlayer.stop();

  const totalHits = state.perfects + state.goods + state.earlys + state.lates + state.misses;
  const accuracy = totalHits > 0
    ? Math.round(((state.perfects + state.goods) / totalHits) * 100) : 0;

  els.finalScore.textContent = state.score.toLocaleString();
  els.finalCombo.textContent = state.bestCombo;
  els.finalAccuracy.textContent = accuracy + '%';
  els.perfectCount.textContent = state.perfects;
  els.goodCount.textContent = state.goods;
  els.missCount.textContent = state.misses + state.earlys + state.lates;
  if (els.finalSong) els.finalSong.textContent = state.song ? state.song.title : '';

  showScreen('results');
}

// ─── Level Select ────────────────────────────────────────────────
function buildLevelSelect() {
  if (!els.songGrid) return;
  els.songGrid.innerHTML = '';

  SONGS.forEach(song => {
    const card = document.createElement('button');
    card.className = 'song-card';
    card.style.setProperty('--song-color', song.color);
    card.style.setProperty('--song-accent', song.accent);
    card.innerHTML = `
      <span class="song-genre">${song.genre}</span>
      <span class="song-name">${song.title}</span>
      <span class="song-bpm">${song.bpm} BPM</span>
      <span class="song-instruments">${song.instruments.join(' · ')}</span>
      <span class="song-desc">${song.description}</span>
    `;
    card.addEventListener('click', () => startGame(song.id));
    els.songGrid.appendChild(card);
  });
}

// ─── Event Listeners ─────────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', () => showScreen('select'));
document.getElementById('retry-btn').addEventListener('click', () => startGame(state.selectedSongId));
document.getElementById('back-btn').addEventListener('click', () => showScreen('start'));
document.getElementById('select-back-btn').addEventListener('click', () => showScreen('select'));

els.canvas.addEventListener('click', handleInput);

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (screens.start.classList.contains('active')) showScreen('select');
    else if (screens.results.classList.contains('active')) startGame(state.selectedSongId);
    else if (screens.game.classList.contains('active')) handleInput();
  }
});

window.addEventListener('resize', () => {
  if (screens.game.classList.contains('active')) resizeCanvas();
});

buildLevelSelect();
resizeCanvas();
