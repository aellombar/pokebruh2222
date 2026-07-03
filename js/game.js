/**
 * Beat Strike — Rhythm Click Game
 * Beat-synced to procedural genre songs.
 */

const CONFIG = {
  speedIncreasePerLevel: 0.1,
  perfectWindow: 70,
  goodWindow: 140,
  minPerfectWindow: 45,
  maxPerfectWindow: 95,
  minGoodWindow: 100,
  maxGoodWindow: 200,
  basePoints: 100,
  shapeSize: 58,
  approachStartScale: 3.2,
  missLimit: 10,
  audioLeadMs: 80,
  patternEvery: 3,
  patternMinLength: 4,
  patternMaxLength: 7,
  hitFadeMs: 250,
  missFadeMs: 300,
  endlessBaseApproach: 1300,
  endlessMinApproach: 280,
  chaseBaseFade: 2200,
  chaseMinFade: 900,
  chaseHoverRadius: 40,
  chaseShapeSize: 66,
  chaseMinPerfectWindow: 65,
  chaseMaxPerfectWindow: 120,
  chaseMinGoodWindow: 140,
  chaseMaxGoodWindow: 260,
  chaseTriplePerfect: 3,
  chaseRoundGap: 120,
  countdownFull: [600, 600, 420],
  endlessMissWindowMs: 30000,
  endlessMissLimit: 2,
};

const CHASE_MODES = {
  'chase-easy': {
    id: 'chase-easy',
    title: 'Cursor Chase — Easy',
    label: 'Easy',
    baseFade: 2100,
    minFade: 1050,
    speedRamp: 0.03,
    spawnInterval: 180,
    missLimit: 12,
    bonusCount: 2,
  },
  'chase-medium': {
    id: 'chase-medium',
    title: 'Cursor Chase — Medium',
    label: 'Medium',
    baseFade: 1700,
    minFade: 850,
    speedRamp: 0.04,
    spawnInterval: 140,
    missLimit: 10,
    bonusCount: 2,
  },
  'chase-hard': {
    id: 'chase-hard',
    title: 'Cursor Chase — Hard',
    label: 'Hard',
    baseFade: 1400,
    minFade: 700,
    speedRamp: 0.05,
    spawnInterval: 110,
    missLimit: 8,
    bonusCount: 3,
  },
  'chase-endless': {
    id: 'chase-endless',
    title: 'Cursor Chase — Endless',
    label: 'Endless',
    baseFade: 1800,
    minFade: 750,
    speedRamp: 0.046,
    spawnInterval: 150,
    missLimit: 10,
    bonusCount: 3,
    isEndless: true,
  },
};

const COUNTDOWN_LABELS = ['READY!', 'SET!', 'GO!'];

const SHAPE_TYPES = ['circle', 'square', 'triangle', 'hexagon', 'diamond', 'star', 'rhombus', 'pentagon', 'octagon', 'cross', 'heart', 'bolt'];

const PERFECT_WORDS = [
  'Perfect', 'Flawless', 'Impeccable', 'Spot On', 'Dead On', 'Nailed It',
  'Amazing', 'Incredible', 'Stunning', 'Sensational', 'Magnificent', 'Phenomenal',
  'Brilliant', 'Outstanding', 'Superb', 'Fantastic', 'Wonderful', 'Excellent',
  'Exquisite', 'Splendid', 'Marvelous', 'Legendary', 'Unreal', 'Crushing It',
];

const MISS_WORDS = [
  'Bummer', 'Too Bad', 'Tough Luck', 'Oh No', 'Darn', 'Unlucky', 'Rough',
  'Oof', 'Missed It', 'So Close', 'Not Quite', 'Aw Shucks', 'What a Shame',
  'Drat', 'That Hurts', 'Yikes', 'Almost', 'Close One', 'Nearly', 'Shoot',
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollTimingWindows() {
  const perfectWindow = CONFIG.minPerfectWindow
    + Math.floor(Math.random() * (CONFIG.maxPerfectWindow - CONFIG.minPerfectWindow));
  const multiplier = 1.65 + Math.random() * 0.55;
  const goodWindow = Math.min(
    CONFIG.maxGoodWindow,
    Math.max(CONFIG.minGoodWindow, Math.round(perfectWindow * multiplier))
  );
  return { perfectWindow, goodWindow };
}

function rollChaseTimingWindows() {
  const perfectWindow = CONFIG.chaseMinPerfectWindow
    + Math.floor(Math.random() * (CONFIG.chaseMaxPerfectWindow - CONFIG.chaseMinPerfectWindow));
  const multiplier = 1.8 + Math.random() * 0.6;
  const goodWindow = Math.min(
    CONFIG.chaseMaxGoodWindow,
    Math.max(CONFIG.chaseMinGoodWindow, Math.round(perfectWindow * multiplier))
  );
  return { perfectWindow, goodWindow };
}

function gameNow() {
  const raw = performance.now();
  if (state.paused) return state.pauseAt - state.pausedTimeOffset;
  return raw - state.pausedTimeOffset;
}

function getEndlessApproachTime(elapsedSec) {
  const factor = 1 + elapsedSec * 0.022;
  return Math.max(CONFIG.endlessMinApproach, CONFIG.endlessBaseApproach / factor);
}

function getChaseFadeDuration(elapsedSec) {
  const diff = state.chaseDifficulty;
  if (!diff) return CONFIG.chaseBaseFade;
  const factor = 1 + elapsedSec * diff.speedRamp + state.speedLevel * 0.05;
  return Math.max(diff.minFade, diff.baseFade / factor);
}

function getChaseSpawnGap(elapsedSec) {
  const diff = state.chaseDifficulty;
  if (!diff) return CONFIG.chaseRoundGap;
  return Math.max(40, diff.spawnInterval - elapsedSec * 5);
}

function isCountdownActive() {
  return state.roundCountdown !== null;
}

function isGameplayBlocked() {
  return isCountdownActive() || !state.gameplayStarted;
}

function beginGameplayAfterCountdown() {
  try {
    songPlayer.play(state.song);
  } catch (err) {
    console.error('Music failed to start:', err);
  }

  state.gameStartTime = gameNow();
  state.songStartPerf = gameNow() + CONFIG.audioLeadMs;
  state.gameplayStarted = true;
  state.endlessWindowStart = gameNow();
  state.endlessWindowMisses = 0;

  if (state.chaseMode) {
    state.chaseNotes = [];
    state.chaseBonusPending = 0;
    const now = gameNow();
    spawnChaseNotes(now, 1);
    state.nextSpawnAt = now + getChaseSpawnGap(0);
  } else if (state.endlessMode) {
    state.endlessWaiting = true;
    state.nextSpawnAt = gameNow();
    spawnEndlessNote(gameNow());
  } else {
    const firstBeat = state.beatQueue[0];
    if (firstBeat) {
      const hitTime = beatToPerfTime(firstBeat.beatIndex);
      const approachTime = getApproachTime();
      spawnNoteForBeat(firstBeat, hitTime, approachTime);
      state.beatQueueIndex = 0;
    }
  }
}

function beginRoundCountdown(onComplete) {
  state.roundCountdown = {
    phase: 0,
    startedAt: gameNow(),
    onComplete: onComplete || null,
  };
  playCountdownBeep(0);
}

function tickCountdown(now) {
  if (!state.roundCountdown) return;

  const durations = CONFIG.countdownFull;
  const elapsed = now - state.roundCountdown.startedAt;
  let accumulated = 0;

  for (let i = 0; i < durations.length; i++) {
    accumulated += durations[i];
    if (elapsed < accumulated) {
      if (state.roundCountdown.phase !== i) {
        state.roundCountdown.phase = i;
        playCountdownBeep(i);
      }
      return;
    }
  }

  const callback = state.roundCountdown.onComplete;
  state.roundCountdown = null;
  if (callback) callback();
}

function getCanvasCoords(clientX, clientY) {
  const rect = els.canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (els.canvas.width / rect.width),
    y: (clientY - rect.top) * (els.canvas.height / rect.height),
  };
}

function isMouseOnNote(note, mx, my) {
  const size = state.chaseMode ? CONFIG.chaseShapeSize : CONFIG.shapeSize;
  const hover = state.chaseMode ? CONFIG.chaseHoverRadius : 0;
  return Math.hypot(mx - note.x, my - note.y) <= size + hover;
}

function getPlayColors() {
  const equipped = progression.getEquipped('color');
  return {
    color: equipped ? equipped.value : (state.song ? state.song.color : '#00f0ff'),
    accent: state.song ? state.song.accent : '#ff00aa',
    aura: progression.getEquipped('aura')?.value || null,
  };
}

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
  patternQueue: [],
  patternPreview: [],
  patternRound: null,
  fireworks: [],
  constellationGlow: 0,
  endlessMode: false,
  endlessWaiting: false,
  endlessWindowStart: 0,
  endlessWindowMisses: 0,
  shockwaves: [],
  nextSpawnAt: 0,
  gameStartTime: 0,
  chaseMode: false,
  chaseDifficulty: null,
  chaseNotes: [],
  chasePerfectStreak: 0,
  chaseBonusPending: 0,
  roundCountdown: null,
  cursorTrail: [],
  triplePerfectFlash: 0,
  paused: false,
  pauseAt: 0,
  pausedTimeOffset: 0,
  gameplayStarted: false,
  mouseX: 0,
  mouseY: 0,
  mouseOnCanvas: false,
  particles: [],
  audioCtx: null,
};

const screens = {
  start: document.getElementById('start-screen'),
  select: document.getElementById('select-screen'),
  chaseSelect: document.getElementById('chase-select-screen'),
  cosmetics: document.getElementById('cosmetics-screen'),
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
  pauseOverlay: document.getElementById('pause-overlay'),
  pauseContinueBtn: document.getElementById('pause-continue-btn'),
  pauseLeaveBtn: document.getElementById('pause-leave-btn'),
};

const ctx = els.canvas.getContext('2d');

function showScreen(name) {
  Object.values(screens).forEach(s => s && s.classList.remove('active'));
  if (screens[name]) screens[name].classList.add('active');
  if (name !== 'game' && els.pauseOverlay) {
    els.pauseOverlay.classList.add('hidden');
    state.paused = false;
    state.gameplayStarted = false;
    state.roundCountdown = null;
  }
}

function togglePause() {
  if (!state.running || !screens.game.classList.contains('active')) return;

  if (state.paused) {
    state.pausedTimeOffset += performance.now() - state.pauseAt;
    state.paused = false;
    songPlayer.setMuted(false);
    if (els.pauseOverlay) els.pauseOverlay.classList.add('hidden');
    return;
  }

  state.paused = true;
  state.pauseAt = performance.now();
  songPlayer.setMuted(true);
  if (els.pauseOverlay) els.pauseOverlay.classList.remove('hidden');
}

function leaveGame() {
  state.running = false;
  state.paused = false;
  state.pausedTimeOffset = 0;
  songPlayer.stop();
  songPlayer.setMuted(false);
  if (els.pauseOverlay) els.pauseOverlay.classList.add('hidden');
  showScreen(state.chaseMode ? 'chaseSelect' : 'select');
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

function playCountdownBeep(phase) {
  if (!state.audioCtx) return;
  const freqs = [440, 554, 880];
  const t = state.audioCtx.currentTime;
  const osc = state.audioCtx.createOscillator();
  const gain = state.audioCtx.createGain();
  osc.type = phase === 2 ? 'square' : 'sine';
  osc.frequency.value = freqs[phase] || 440;
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain);
  gain.connect(state.audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.12);
}

function resizeCanvas() {
  const area = document.getElementById('game-area');
  els.canvas.width = area.clientWidth;
  els.canvas.height = area.clientHeight;
}

function getBeatMs() {
  if (!state.song) return 500;
  return songPlayer.getBeatMs(state.song);
}

function getApproachBeats() {
  if (!state.song) return 2.5;
  const base = state.song.approachBeats;
  const reduction = Math.floor(state.speedLevel / 2) * 0.25;
  return Math.max(1, base - reduction);
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
    case 'rhombus':
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.75, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.75, 0); ctx.closePath(); break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const radius = i % 2 === 0 ? s : s * 0.42;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); break;
    case 'pentagon':
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const px = Math.cos(angle) * s, py = Math.sin(angle) * s;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); break;
    case 'octagon':
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i - Math.PI / 8;
        const px = Math.cos(angle) * s, py = Math.sin(angle) * s;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); break;
    case 'cross': {
      const a = s * 0.35;
      ctx.moveTo(-a, -s); ctx.lineTo(a, -s); ctx.lineTo(a, -a);
      ctx.lineTo(s, -a); ctx.lineTo(s, a); ctx.lineTo(a, a);
      ctx.lineTo(a, s); ctx.lineTo(-a, s); ctx.lineTo(-a, a);
      ctx.lineTo(-s, a); ctx.lineTo(-s, -a); ctx.lineTo(-a, -a);
      ctx.closePath(); break;
    }
    case 'heart':
      ctx.moveTo(0, s * 0.65);
      ctx.bezierCurveTo(-s * 1.2, -s * 0.15, -s * 0.55, -s * 1.05, 0, -s * 0.4);
      ctx.bezierCurveTo(s * 0.55, -s * 1.05, s * 1.2, -s * 0.15, 0, s * 0.65);
      ctx.closePath(); break;
    case 'bolt':
      ctx.moveTo(-s * 0.2, -s); ctx.lineTo(s * 0.45, -s * 0.15); ctx.lineTo(s * 0.08, -s * 0.1);
      ctx.lineTo(s * 0.2, s); ctx.lineTo(-s * 0.45, s * 0.12); ctx.lineTo(-s * 0.05, s * 0.06);
      ctx.closePath(); break;
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

// ─── Spawn Positions & Patterns ──────────────────────────────────
function randomPosition() {
  const w = Math.max(els.canvas.width, 320);
  const h = Math.max(els.canvas.height, 240);
  const margin = Math.min(CONFIG.shapeSize * CONFIG.approachStartScale + 50, w * 0.2, h * 0.2);
  const innerW = Math.max(40, w - margin * 2);
  const innerH = Math.max(40, h - margin * 2);
  return {
    x: margin + Math.random() * innerW,
    y: margin + Math.random() * innerH,
  };
}

function generatePatternPositions() {
  const w = els.canvas.width;
  const h = els.canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.3;
  const len = CONFIG.patternMinLength
    + Math.floor(Math.random() * (CONFIG.patternMaxLength - CONFIG.patternMinLength + 1));

  const patterns = [
    (n) => Array.from({ length: n }, (_, i) => ({
      x: w * 0.15 + ((w * 0.7) / Math.max(1, n - 1)) * i,
      y: cy + Math.sin(i * 1.1) * r * 0.5,
    })),
    (n) => Array.from({ length: n }, (_, i) => ({
      x: cx + Math.sin(i * 0.9) * r * 0.6,
      y: h * 0.18 + ((h * 0.64) / Math.max(1, n - 1)) * i,
    })),
    (n) => Array.from({ length: n }, (_, i) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 / n) * i;
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r * 0.75 };
    }),
    (n) => Array.from({ length: n }, (_, i) => ({
      x: w * 0.18 + i * ((w * 0.64) / Math.max(1, n - 1)),
      y: h * 0.25 + i * ((h * 0.5) / Math.max(1, n - 1)),
    })),
    (n) => Array.from({ length: n }, (_, i) => {
      const angle = Math.PI * 0.8 + (Math.PI * 0.6 / Math.max(1, n - 1)) * i;
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r * 0.6 };
    }),
    (n) => Array.from({ length: n }, (_, i) => ({
      x: i % 2 === 0 ? w * 0.22 : w * 0.78,
      y: h * 0.2 + i * ((h * 0.6) / Math.max(1, n - 1)),
    })),
    (n) => Array.from({ length: n }, (_, i) => {
      const t = i / Math.max(1, n - 1);
      return { x: cx + (t - 0.5) * w * 0.7, y: cy + Math.sin(t * Math.PI * 2) * r * 0.45 };
    }),
    (n) => Array.from({ length: n }, (_, i) => ({
      x: cx + (i - (n - 1) / 2) * (w * 0.14),
      y: cy - r * 0.5 + Math.abs(i - (n - 1) / 2) * (h * 0.12),
    })),
  ];

  return patterns[Math.floor(Math.random() * patterns.length)](len);
}

function maybeStartPattern() {
  if (state.chaseMode || state.endlessMode) return;
  if (state.patternQueue.length > 0) return;
  if (state.totalNotes > 0 && state.totalNotes % CONFIG.patternEvery === 0) {
    const positions = generatePatternPositions();
    state.patternQueue = [...positions];
    state.patternPreview = positions.map(p => ({ ...p }));
    state.patternRound = {
      points: positions.map(p => ({ ...p })),
      length: positions.length,
      perfects: 0,
      solidUpTo: 0,
      failed: false,
      complete: false,
    };
  }
}

function getSpawnPosition() {
  maybeStartPattern();
  if (state.patternQueue.length > 0) {
    const pos = state.patternQueue.shift();
    const patternIndex = state.patternRound
      ? state.patternRound.points.length - state.patternQueue.length - 1
      : 0;
    return { ...pos, isPattern: true, patternIndex };
  }
  return randomPosition();
}

function drawPatternPreview() {
  if (!state.patternRound) return;
  const color = state.song ? state.song.color : '#00f0ff';
  const accent = state.song ? state.song.accent : '#ff00aa';
  const points = state.patternRound.points;
  const solidUpTo = state.patternRound.solidUpTo;

  if (solidUpTo >= 2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < solidUpTo; i++) {
      if (i === 0) ctx.moveTo(points[i].x, points[i].y);
      else ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  if (solidUpTo < points.length) {
    ctx.strokeStyle = `${color}44`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    const startIdx = Math.max(0, solidUpTo - 1);
    for (let i = startIdx; i < points.length; i++) {
      if (i === startIdx) ctx.moveTo(points[i].x, points[i].y);
      else ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  points.forEach((p, i) => {
    const hit = i < solidUpTo;
    ctx.beginPath();
    ctx.arc(p.x, p.y, hit ? 8 : 5, 0, Math.PI * 2);
    ctx.fillStyle = hit ? color : `${color}44`;
    ctx.fill();
    if (hit) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.strokeStyle = `${accent}66`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });

  if (state.patternRound.complete && state.constellationGlow > 0) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${state.constellationGlow * 0.5})`;
    ctx.lineWidth = 4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20 * state.constellationGlow;
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    if (points.length > 2) ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function onPatternHit(rating, note) {
  if (!note.isPattern || !state.patternRound || state.patternRound.complete) return;

  if (rating === 'perfect') {
    state.patternRound.perfects++;
    state.patternRound.solidUpTo = Math.max(
      state.patternRound.solidUpTo,
      note.patternIndex + 1
    );
    if (state.patternRound.perfects >= state.patternRound.length) {
      completeConstellation();
    }
  } else {
    state.patternRound.failed = true;
  }
}

function completeConstellation() {
  if (!state.patternRound || state.patternRound.complete) return;
  state.patternRound.complete = true;
  state.patternRound.solidUpTo = state.patternRound.length;
  state.constellationGlow = 1;
  spawnFireworks(state.patternRound.points);
  showFeedback('CONSTELLATION COMPLETE!', 'perfect');
  playConstellationSound();
}

function spawnFireworks(points) {
  const w = els.canvas.width;
  const h = els.canvas.height;
  const bursts = [...points, { x: w / 2, y: h / 2 }];
  const colors = state.song
    ? [state.song.color, state.song.accent, '#ffffff', '#ffd700']
    : ['#00f0ff', '#ff00aa', '#ffffff', '#ffd700'];

  bursts.forEach((origin, bi) => {
    setTimeout(() => {
      for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 8;
        state.fireworks.push({
          x: origin.x,
          y: origin.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.012 + Math.random() * 0.01,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 2 + Math.random() * 3,
          gravity: 0.08,
        });
      }
    }, bi * 120);
  });
}

function playConstellationSound() {
  if (!state.audioCtx) return;
  const t = state.audioCtx.currentTime;
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.12, t + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.4);
    osc.connect(gain);
    gain.connect(state.audioCtx.destination);
    osc.start(t + i * 0.08);
    osc.stop(t + i * 0.08 + 0.5);
  });
}

function drawFireworks() {
  for (let i = state.fireworks.length - 1; i >= 0; i--) {
    const f = state.fireworks[i];
    f.x += f.vx;
    f.y += f.vy;
    f.vy += f.gravity;
    f.vx *= 0.98;
    f.life -= f.decay;

    if (f.life <= 0) {
      state.fireworks.splice(i, 1);
      continue;
    }

    ctx.globalAlpha = f.life;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size * f.life, 0, Math.PI * 2);
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}
function hasActiveNote() {
  if (state.chaseMode) {
    return hasActiveChaseNote();
  }
  return state.currentNote !== null;
}

function hasActiveChaseNote() {
  return state.chaseNotes.some(n => !n.removed);
}

function chaseRandomPosition(existing) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const pos = randomPosition();
    const crowded = existing.some(n =>
      !n.removed && Math.hypot(n.x - pos.x, n.y - pos.y) < CONFIG.shapeSize * 3.2
    );
    if (!crowded) return pos;
  }
  return randomPosition();
}

function createChaseNote(hitTime, approachTime, pos, isBonus = false) {
  const windows = rollChaseTimingWindows();
  return {
    id: state.totalNotes++,
    x: pos.x,
    y: pos.y,
    shape: SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)],
    approachTime: isBonus ? approachTime * 1.15 : approachTime,
    hitTime,
    perfectWindow: windows.perfectWindow,
    goodWindow: windows.goodWindow,
    hit: false,
    missed: false,
    clicked: false,
    clickTime: 0,
    rating: null,
    removed: false,
    isBonus,
  };
}

function spawnChaseNotes(now, count = 1, isBonus = false) {
  const elapsed = (now - state.gameStartTime) / 1000;
  const fadeDuration = getChaseFadeDuration(elapsed);
  const approachTime = fadeDuration * 0.75;
  const active = state.chaseNotes.filter(n => !n.removed);

  for (let i = 0; i < count; i++) {
    const pos = chaseRandomPosition(active);
    const note = createChaseNote(now + approachTime, approachTime, pos, isBonus);
    state.chaseNotes.push(note);
    active.push(note);
  }
}

function scheduleChaseRound() {
  const now = gameNow();
  const elapsed = (now - state.gameStartTime) / 1000;
  const isBonus = state.chaseBonusPending > 0;
  if (isBonus) state.chaseBonusPending--;
  spawnChaseNotes(now, 1, isBonus);
  state.nextSpawnAt = now + getChaseSpawnGap(elapsed);
}

function updateChaseSpawns(now) {
  if (!state.chaseMode || !state.chaseDifficulty || isGameplayBlocked()) return;
  if (hasActiveChaseNote()) return;
  if (now < state.nextSpawnAt) return;
  scheduleChaseRound();
}

function triggerTriplePerfectBonus(note) {
  state.triplePerfectFlash = 1;
  showFeedback('TRIPLE PERFECT! BONUS!', 'perfect');
  playConstellationSound();

  const w = els.canvas.width;
  const h = els.canvas.height;
  const burstPoints = [
    { x: note.x, y: note.y },
    { x: w * 0.25, y: h * 0.3 },
    { x: w * 0.75, y: h * 0.35 },
    { x: w * 0.5, y: h * 0.65 },
  ];
  spawnFireworks(burstPoints);

  state.chaseBonusPending += state.chaseDifficulty?.bonusCount || 2;

  const color = state.song?.color || '#00ff88';
  for (let i = 0; i < 24; i++) {
    const angle = (Math.PI * 2 * i) / 24;
    state.particles.push({
      x: note.x, y: note.y,
      vx: Math.cos(angle) * (4 + Math.random() * 6),
      vy: Math.sin(angle) * (4 + Math.random() * 6),
      life: 1,
      color,
    });
  }
}

function cleanupChaseNotes(now) {
  for (const note of state.chaseNotes) {
    if (note.removed) continue;

    if (!note.clicked && now > note.hitTime + note.goodWindow) {
      resolveNote(note, 'late');
      registerChaseHit('late', note);
    }

    if (note.clicked) {
      const fadeDur = note.hit ? CONFIG.hitFadeMs : CONFIG.missFadeMs;
      if (now - note.clickTime > fadeDur) note.removed = true;
    } else if (note.missed && now - note.hitTime > CONFIG.missFadeMs) {
      note.removed = true;
    }
  }
  state.chaseNotes = state.chaseNotes.filter(n => !n.removed);
}

function registerChaseHit(rating, note) {
  if (rating === 'perfect') {
    state.chasePerfectStreak++;
    if (state.chasePerfectStreak >= CONFIG.chaseTriplePerfect) {
      triggerTriplePerfectBonus(note);
      state.chasePerfectStreak = 0;
    }
  } else {
    state.chasePerfectStreak = 0;
  }
  registerHit(rating, note);
}

function getNearestChaseNote(mx, my) {
  const candidates = state.chaseNotes.filter(n => !n.clicked && !n.removed);
  if (!candidates.length) return null;
  return candidates.reduce((best, n) => {
    const d = Math.hypot(n.x - mx, n.y - my);
    return !best || d < best.dist ? { note: n, dist: d } : best;
  }, null)?.note || null;
}

function spawnNote(hitTime, approachTime, beatEntry = null) {
  const pos = getSpawnPosition();
  const windows = rollTimingWindows();

  state.currentNote = {
    id: state.totalNotes++,
    beatIndex: beatEntry ? beatEntry.beatIndex : -1,
    x: pos.x,
    y: pos.y,
    isPattern: pos.isPattern || false,
    patternIndex: pos.patternIndex ?? -1,
    shape: SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)],
    approachTime,
    hitTime,
    perfectWindow: windows.perfectWindow,
    goodWindow: windows.goodWindow,
    hit: false,
    missed: false,
    clicked: false,
    clickTime: 0,
    rating: null,
  };
  if (beatEntry) beatEntry.spawned = true;
}

function spawnNoteForBeat(beatEntry, hitTime, approachTime) {
  spawnNote(hitTime, approachTime, beatEntry);
}

function spawnEndlessNote(now) {
  const elapsed = (now - state.gameStartTime) / 1000;
  const approachTime = getEndlessApproachTime(elapsed);
  spawnNote(now + approachTime, approachTime);
}

function trySpawnEndless(now) {
  if (!state.endlessMode || state.chaseMode || hasActiveNote() || !state.endlessWaiting) return;
  if (isGameplayBlocked()) return;
  if (now < state.nextSpawnAt) return;

  state.endlessWaiting = false;
  spawnEndlessNote(now);
}

function skipMissedBeats(now) {
  if (hasActiveNote() || isGameplayBlocked()) return;

  while (state.beatQueueIndex < state.beatQueue.length) {
    const beat = state.beatQueue[state.beatQueueIndex];
    if (beat.resolved) {
      state.beatQueueIndex++;
      continue;
    }

    const hitTime = beatToPerfTime(beat.beatIndex);
    const approachTime = getApproachTime();

    if (now > hitTime + CONFIG.maxGoodWindow) {
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
  if (!state.endlessMode) {
    const beat = state.beatQueue[state.beatQueueIndex];
    if (beat) beat.resolved = true;
    state.beatQueueIndex++;
  }
  state.currentNote = null;

  if (state.endlessMode) {
    state.endlessWaiting = true;
    const elapsed = (gameNow() - state.gameStartTime) / 1000;
    const gap = state.chaseMode
      ? Math.max(30, 140 - elapsed * 4)
      : Math.max(40, 160 - elapsed * 3.5);
    state.nextSpawnAt = gameNow() + gap;
  }
}

function resolveNote(note, rating) {
  note.clicked = true;
  note.clickTime = gameNow();
  note.rating = rating;
  if (rating === 'perfect') note.hit = true;
  else note.missed = true;
}

function calculatePoints(rating) {
  const multiplier = state.combo > 0 ? state.combo : 1;
  const base = rating === 'perfect' ? CONFIG.basePoints : CONFIG.basePoints * 0.5;
  return Math.round(base * multiplier);
}

function registerEndlessMiss() {
  if (!state.endlessMode) return false;
  const now = gameNow();
  if (now - state.endlessWindowStart > CONFIG.endlessMissWindowMs) {
    state.endlessWindowStart = now;
    state.endlessWindowMisses = 0;
  }
  state.endlessWindowMisses++;
  if (state.endlessWindowMisses > CONFIG.endlessMissLimit) {
    showFeedback('TOO MANY MISSES!', 'miss');
    endGame();
    return true;
  }
  if (state.endlessWindowMisses === CONFIG.endlessMissLimit) {
    showFeedback('1 MISS LEFT!', 'miss');
  }
  return false;
}

function registerHit(rating, note) {
  if (note && !state.chaseMode) onPatternHit(rating, note);

  const missLimit = state.chaseMode && state.chaseDifficulty
    ? state.chaseDifficulty.missLimit
    : CONFIG.missLimit;

  if (rating === 'miss') {
    state.misses++;
    state.combo = 0;
    state.perfectHitStreak = 0;
    if (!state.chaseMode) state.chasePerfectStreak = 0;
    updateComboDisplay();
    if (registerEndlessMiss()) return;
    showFeedback(pickRandom(MISS_WORDS), 'miss');
    playHitSound('miss');
    if (state.misses >= missLimit) endGame();
    return;
  }

  if (rating === 'early' || rating === 'late') {
    state.combo = 0;
    state.perfectHitStreak = 0;
    if (!state.chaseMode) state.chasePerfectStreak = 0;
    if (rating === 'early') state.earlys++;
    else state.lates++;
    updateComboDisplay();
    if (registerEndlessMiss()) return;
    showFeedback(rating === 'early' ? 'TOO EARLY' : pickRandom(MISS_WORDS), rating);
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
  const word = pickRandom(PERFECT_WORDS);
  showFeedback(word + ' +' + points + (speedUp ? ' — SPEED UP!' : ''), rating);
  playHitSound(rating);
  if (note) {
    spawnParticles(note.x, note.y);
    if (rating === 'perfect') {
      const colors = getPlayColors();
      spawnShockwave(note.x, note.y, colors.color, state.perfectHitStreak >= 5);
      if (state.perfectHitStreak >= 5 && state.perfectHitStreak % 5 === 0) {
        spawnFireworks([{ x: note.x, y: note.y }]);
      }
    }
  }
}

function handleChaseInput(clientX, clientY) {
  let mx = state.mouseX;
  let my = state.mouseY;
  if (clientX !== undefined && clientY !== undefined) {
    const pos = getCanvasCoords(clientX, clientY);
    mx = pos.x;
    my = pos.y;
  }

  const note = getNearestChaseNote(mx, my);
  if (!note || !isMouseOnNote(note, mx, my)) {
    showFeedback('MOVE TO SHAPE!', 'miss');
    return;
  }

  const now = gameNow();
  const diff = now - note.hitTime;
  const { goodWindow, perfectWindow } = note;

  if (Math.abs(diff) > goodWindow) {
    resolveNote(note, diff < 0 ? 'early' : 'miss');
    registerChaseHit(diff < 0 ? 'early' : 'miss', note);
    return;
  }

  if (Math.abs(diff) <= perfectWindow) {
    resolveNote(note, 'perfect');
    registerChaseHit('perfect', note);
  } else if (diff < 0) {
    resolveNote(note, 'early');
    registerChaseHit('early', note);
  } else {
    resolveNote(note, 'late');
    registerChaseHit('late', note);
  }
}

function handleInput(clientX, clientY) {
  if (!state.running || state.paused || isGameplayBlocked()) return;

  if (state.chaseMode) {
    handleChaseInput(clientX, clientY);
    return;
  }

  const note = state.currentNote;
  if (!note || note.clicked) return;

  let mx = state.mouseX;
  let my = state.mouseY;
  if (clientX !== undefined && clientY !== undefined) {
    const pos = getCanvasCoords(clientX, clientY);
    mx = pos.x;
    my = pos.y;
  }

  const now = gameNow();
  const diff = now - note.hitTime;
  const goodWindow = note.goodWindow;
  const perfectWindow = note.perfectWindow;

  if (Math.abs(diff) > goodWindow) {
    resolveNote(note, diff < 0 ? 'early' : 'miss');
    registerHit(diff < 0 ? 'early' : 'miss');
    return;
  }

  if (Math.abs(diff) <= perfectWindow) {
    resolveNote(note, 'perfect');
    registerHit('perfect', note);
  } else if (diff < 0) {
    resolveNote(note, 'early');
    registerHit('early');
  } else {
    resolveNote(note, 'late');
    registerHit('late');
  }
}

function spawnParticles(x, y) {
  const color = getPlayColors().color;
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
  const targetSize = state.chaseMode ? CONFIG.chaseShapeSize : CONFIG.shapeSize;
  const approachScale = CONFIG.approachStartScale - (CONFIG.approachStartScale - 1) * progress;
  const approachSize = targetSize * approachScale;
  const { color, accent, aura } = getPlayColors();

  if (aura && !note.hit && !note.missed) {
    ctx.shadowColor = aura;
    ctx.shadowBlur = 14;
  }

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

  if (state.chaseMode) {
    const hovering = state.mouseOnCanvas && isMouseOnNote(note, state.mouseX, state.mouseY);
    const fadeUrgency = Math.max(0, (progress - 0.72) / 0.28);
    ctx.globalAlpha = 1 - fadeUrgency * 0.2;
    if (note.isBonus) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 15;
    }
    if (hovering) {
      ctx.beginPath();
      ctx.arc(note.x, note.y, targetSize + 28, 0, Math.PI * 2);
      ctx.strokeStyle = note.isBonus ? 'rgba(255, 215, 0, 0.8)' : 'rgba(0, 255, 136, 0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  if (note.isPattern) {
    ctx.beginPath();
    ctx.arc(note.x, note.y, targetSize + 12, 0, Math.PI * 2);
    ctx.strokeStyle = `${accent}44`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (progress > 0.85) {
    const flash = (progress - 0.85) / 0.15;
    drawShapeOutline(note.x, note.y, note.shape, targetSize, `rgba(255,255,255,${flash * 0.4})`, 1.5);
  }

  // Timing window indicator ring
  const windowRatio = note.perfectWindow / CONFIG.maxGoodWindow;
  ctx.beginPath();
  ctx.arc(note.x, note.y, targetSize + 18, 0, Math.PI * 2);
  ctx.strokeStyle = `${color}${Math.round(30 + windowRatio * 40).toString(16).padStart(2, '0')}`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(note.x, note.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawChaseCursor() {
  if (!state.chaseMode || !state.mouseOnCanvas) return;
  const nearest = getNearestChaseNote(state.mouseX, state.mouseY);
  if (nearest && !nearest.clicked) {
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(state.mouseX, state.mouseY);
    ctx.lineTo(nearest.x, nearest.y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.beginPath();
  ctx.arc(state.mouseX, state.mouseY, 8, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(state.mouseX, state.mouseY, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 255, 136, 0.8)';
  ctx.fill();

  if (state.triplePerfectFlash > 0) {
    ctx.strokeStyle = `rgba(255, 215, 0, ${state.triplePerfectFlash * 0.6})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(state.mouseX, state.mouseY, 30 + (1 - state.triplePerfectFlash) * 40, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function addCursorTrailPoint(x, y) {
  const last = state.cursorTrail[state.cursorTrail.length - 1];
  if (last && Math.hypot(x - last.x, y - last.y) < 4) return;
  const trailCosmetic = progression.getEquipped('trail');
  const colors = trailCosmetic
    ? [trailCosmetic.value, trailCosmetic.value, '#ffffff']
    : (state.song
      ? [state.song.color, state.song.accent, '#ffffff']
      : ['#00ff88', '#ff6b9d', '#ffffff']);
  state.cursorTrail.push({
    x, y,
    life: 1,
    color: colors[state.cursorTrail.length % colors.length],
  });
  if (state.cursorTrail.length > 32) state.cursorTrail.shift();
}

function updateCursorTrail() {
  for (let i = state.cursorTrail.length - 1; i >= 0; i--) {
    state.cursorTrail[i].life -= 0.045;
    if (state.cursorTrail[i].life <= 0) state.cursorTrail.splice(i, 1);
  }
}

function drawCursorTrail() {
  if (state.cursorTrail.length < 2) return;
  for (let i = 1; i < state.cursorTrail.length; i++) {
    const prev = state.cursorTrail[i - 1];
    const curr = state.cursorTrail[i];
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.strokeStyle = curr.color;
    ctx.globalAlpha = curr.life * 0.75;
    ctx.lineWidth = 2 + curr.life * 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  state.cursorTrail.forEach((p) => {
    ctx.globalAlpha = p.life * 0.85;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 + p.life * 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawPixelCountdown(now) {
  if (!state.roundCountdown) return;
  const w = els.canvas.width;
  const h = els.canvas.height;
  const label = COUNTDOWN_LABELS[state.roundCountdown.phase];
  const color = state.song?.color || '#00ff88';
  const accent = state.song?.accent || '#ff6b9d';
  const durations = CONFIG.countdownFull;
  const elapsed = now - state.roundCountdown.startedAt;
  let acc = 0;
  let phaseElapsed = elapsed;
  for (let i = 0; i < durations.length; i++) {
    if (i === state.roundCountdown.phase) {
      phaseElapsed = elapsed - acc;
      break;
    }
    acc += durations[i];
  }
  const pop = 1 + Math.sin(Math.min(1, phaseElapsed / 140) * Math.PI) * 0.18;
  const size = Math.floor(48 * pop);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.imageSmoothingEnabled = false;
  ctx.font = `${size}px "Press Start 2P", monospace`;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, w, h);

  for (let ox = -4; ox <= 4; ox += 4) {
    for (let oy = -4; oy <= 4; oy += 4) {
      if (ox === 0 && oy === 0) continue;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillText(label, w / 2 + ox, h / 2 + oy);
    }
  }

  ctx.fillStyle = state.roundCountdown.phase === 2 ? accent : color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.fillText(label, w / 2, h / 2);
  ctx.restore();
}

function drawShockwaves() {
  for (let i = state.shockwaves.length - 1; i >= 0; i--) {
    const s = state.shockwaves[i];
    s.radius += s.speed;
    s.life -= 0.035;
    if (s.life <= 0) { state.shockwaves.splice(i, 1); continue; }
    ctx.globalAlpha = s.life * 0.8;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3 * s.life;
    ctx.stroke();
    if (s.double) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius * 0.6, 0, Math.PI * 2);
      ctx.lineWidth = 2 * s.life;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function spawnShockwave(x, y, color, isDouble = false) {
  state.shockwaves.push({
    x, y, color,
    radius: 20,
    speed: isDouble ? 7 : 5,
    life: 1,
    double: isDouble,
  });
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

  backgroundRenderer.draw(ctx, w, h, now);

  if (!isGameplayBlocked()) {
    if (state.endlessMode && !state.chaseMode) {
      trySpawnEndless(now);
    } else if (state.chaseMode) {
      updateChaseSpawns(now);
      cleanupChaseNotes(now);
    } else {
      skipMissedBeats(now);
    }
  } else if (state.chaseMode) {
    cleanupChaseNotes(now);
  }
  drawPatternPreview();

  if (state.constellationGlow > 0) {
    state.constellationGlow -= 0.008;
    if (state.constellationGlow < 0) {
      state.constellationGlow = 0;
      if (state.patternRound && state.patternRound.complete) {
        state.patternRound = null;
      }
    }
  }

  if (state.triplePerfectFlash > 0) {
    state.triplePerfectFlash -= 0.025;
    if (state.triplePerfectFlash < 0) state.triplePerfectFlash = 0;
  }

  if (state.chaseMode) {
    updateCursorTrail();
    for (const note of state.chaseNotes) {
      if (!note.removed) drawNote(note, now);
    }
    drawCursorTrail();
    drawChaseCursor();
  } else {
    const note = state.currentNote;
    if (note && !note.clicked && now > note.hitTime + note.goodWindow) {
      resolveNote(note, 'late');
      registerHit('late');
    }

    if (note) {
      drawNote(note, now);
      const fadeStart = note.clickTime || note.hitTime;
      if (note.clicked && note.hit && now - fadeStart > CONFIG.hitFadeMs) finishCurrentNote();
      else if (note.clicked && note.missed && now - fadeStart > CONFIG.missFadeMs) finishCurrentNote();
      else if (!note.clicked && note.missed && now - note.hitTime > CONFIG.missFadeMs) finishCurrentNote();
    }
  }

  drawParticles();
  drawShockwaves();
  drawFireworks();

  if (state.triplePerfectFlash > 0) {
    const alpha = state.triplePerfectFlash * 0.22;
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, `rgba(255, 215, 0, ${alpha})`);
    grad.addColorStop(0.5, `rgba(255, 107, 157, ${alpha * 0.5})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  drawPixelCountdown(now);
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
  if (!state.song) return;
  if (state.endlessMode || state.chaseMode) {
    const elapsed = gameNow() - state.gameStartTime;
    const sec = Math.floor(elapsed / 1000);
    const windowElapsed = gameNow() - state.endlessWindowStart;
    const missesLeft = windowElapsed > CONFIG.endlessMissWindowMs
      ? CONFIG.endlessMissLimit + 1
      : Math.max(0, CONFIG.endlessMissLimit + 1 - state.endlessWindowMisses);
    const hearts = '❤'.repeat(missesLeft) + '♡'.repeat(CONFIG.endlessMissLimit + 1 - missesLeft);
    els.progressFill.style.width = `${((sec % 45) / 45) * 100}%`;
    if (els.progressLabel) {
      els.progressLabel.textContent = (state.chaseMode
        ? sec + 's · ' + (state.chaseDifficulty?.label || 'chase')
        : sec + 's survived') + ' · ' + hearts;
    }
    return;
  }
  const elapsed = songPlayer.getElapsedMs();
  const total = state.song.duration * 1000;
  const pct = Math.min(100, (elapsed / total) * 100);
  const secondsLeft = Math.max(0, Math.ceil((total - elapsed) / 1000));
  els.progressFill.style.width = pct + '%';
  if (els.progressLabel) els.progressLabel.textContent = secondsLeft + 's';
}

function gameLoop() {
  if (!state.running) return;

  if (state.paused) {
    tickCountdown(gameNow());
    render(gameNow());
    requestAnimationFrame(gameLoop);
    return;
  }

  const now = gameNow();
  tickCountdown(now);
  render(now);
  updateProgress();

  if (state.gameplayStarted && !state.endlessMode && !state.chaseMode
    && (songPlayer.isFinished() || state.beatQueueIndex >= state.beatQueue.length)) {
    if (!hasActiveNote()) { endGame(); return; }
  }

  const missLimit = state.chaseMode && state.chaseDifficulty
    ? state.chaseDifficulty.missLimit
    : CONFIG.missLimit;
  if (state.misses >= missLimit) return;

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
  state.patternQueue = [];
  state.patternPreview = [];
  state.patternRound = null;
  state.fireworks = [];
  state.constellationGlow = 0;
  state.endlessMode = false;
  state.chaseMode = false;
  state.chaseDifficulty = null;
  state.chaseNotes = [];
  state.chasePerfectStreak = 0;
  state.chaseBonusPending = 0;
  state.roundCountdown = null;
  state.cursorTrail = [];
  state.triplePerfectFlash = 0;
  state.paused = false;
  state.pauseAt = 0;
  state.pausedTimeOffset = 0;
  state.gameplayStarted = false;
  state.endlessWaiting = false;
  state.endlessWindowStart = 0;
  state.endlessWindowMisses = 0;
  state.shockwaves = [];
  state.mouseOnCanvas = false;
  state.nextSpawnAt = 0;
  state.gameStartTime = 0;
  state.particles = [];
  state.beatQueueIndex = 0;
}

function startChaseGame(modeId) {
  const mode = CHASE_MODES[modeId];
  if (!mode) return;
  startGame(modeId);
}

function startGame(songId) {
  initAudio();
  resetGameState();

  state.selectedSongId = songId || state.selectedSongId;

  if (CHASE_MODES[songId]) {
    state.chaseDifficulty = CHASE_MODES[songId];
    state.chaseMode = true;
    state.endlessMode = true;
    state.song = {
      ...CHASE_SONG,
      id: songId,
      title: state.chaseDifficulty.title,
      isChase: true,
      isEndless: !!state.chaseDifficulty.isEndless,
    };
  } else {
    state.song = songPlayer.getSong(state.selectedSongId);
    state.endlessMode = !!(state.song.isEndless && !state.song.isChase);
    state.chaseMode = false;
    state.chaseDifficulty = null;
  }

  state.gameStartTime = performance.now();
  state.nextSpawnAt = performance.now();

  const bgCosmetic = progression.getEquipped('background');
  backgroundRenderer.setTheme(bgCosmetic ? { theme: bgCosmetic.value } : (state.chaseMode ? 'chase' : state.selectedSongId));

  if (state.endlessMode || state.chaseMode) {
    state.beatQueue = [];
  } else {
    state.beatQueue = songPlayer.buildBeatMap(state.song).map(beatIndex => ({
      beatIndex, spawned: false, resolved: false,
    }));
  }

  state.running = true;

  if (els.songTitle) {
    els.songTitle.textContent = state.song.title;
    els.songTitle.style.color = state.song.color;
  }

  const progressTitle = document.querySelector('.progress-title');
  if (progressTitle) {
    if (state.chaseMode) progressTitle.textContent = 'CURSOR CHASE';
    else if (state.endlessMode) progressTitle.textContent = 'ENDLESS';
    else progressTitle.textContent = 'SONG PROGRESS';
  }

  els.canvas.style.cursor = state.chaseMode ? 'none' : 'crosshair';

  updateHUD();
  updateComboDisplay();
  updateProgress();
  showScreen('game');
  resizeCanvas();

  beginRoundCountdown(beginGameplayAfterCountdown);

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
  if (els.finalSong) {
    els.finalSong.textContent = state.song
      ? state.song.title + ((state.endlessMode || state.chaseMode)
        ? ` · ${Math.floor((gameNow() - state.gameStartTime) / 1000)}s` : '')
      : '';
  }

  const survivalBonus = (state.endlessMode || state.chaseMode)
    ? Math.floor((gameNow() - state.gameStartTime) / 1000)
    : 0;
  const xpEarned = state.perfects * 4 + state.goods * 2 + state.bestCombo + survivalBonus;
  const result = progression.addXP(xpEarned);
  const info = progression.getLevelInfo();

  const xpGainedEl = document.getElementById('xp-gained');
  const resLevelEl = document.getElementById('res-level');
  const resFillEl = document.getElementById('res-xp-fill');
  const resLabelEl = document.getElementById('res-xp-label');
  const levelUpEl = document.getElementById('level-up-msg');
  if (xpGainedEl) xpGainedEl.textContent = `+${result.gained} XP`;
  if (resLevelEl) resLevelEl.textContent = `LVL ${info.level}`;
  if (resFillEl) resFillEl.style.width = info.pct + '%';
  if (resLabelEl) resLabelEl.textContent = info.maxed ? 'MAX LEVEL' : `${info.current} / ${info.needed} XP`;
  if (levelUpEl) levelUpEl.classList.toggle('hidden', !result.leveledUp);

  showScreen('results');
}

// ─── Level Select ────────────────────────────────────────────────
function buildLevelSelect() {
  if (!els.songGrid) return;
  els.songGrid.innerHTML = '';

  const endlessCard = document.createElement('button');
  endlessCard.className = 'song-card song-card-endless';
  endlessCard.style.setProperty('--song-color', ENDLESS_SONG.color);
  endlessCard.style.setProperty('--song-accent', ENDLESS_SONG.accent);
  endlessCard.innerHTML = `
    <div class="song-card-top">
      <span class="song-genre">${ENDLESS_SONG.genre}</span>
      <span class="song-difficulty">∞</span>
    </div>
    <span class="song-name">${ENDLESS_SONG.title}</span>
    <span class="song-meta">No time limit · speed ramps forever</span>
    <span class="song-instruments">${ENDLESS_SONG.instruments.join(' · ')}</span>
    <span class="song-desc">${ENDLESS_SONG.description}</span>
  `;
  endlessCard.addEventListener('click', () => startGame('endless'));
  els.songGrid.appendChild(endlessCard);

  const chaseCard = document.createElement('button');
  chaseCard.className = 'song-card song-card-chase';
  chaseCard.style.setProperty('--song-color', CHASE_SONG.color);
  chaseCard.style.setProperty('--song-accent', CHASE_SONG.accent);
  chaseCard.innerHTML = `
    <div class="song-card-top">
      <span class="song-genre">${CHASE_SONG.genre}</span>
      <span class="song-difficulty">🖱️</span>
    </div>
    <span class="song-name">${CHASE_SONG.title}</span>
    <span class="song-meta">Move mouse to shapes · click before fade</span>
    <span class="song-instruments">${CHASE_SONG.instruments.join(' · ')}</span>
    <span class="song-desc">${CHASE_SONG.description}</span>
  `;
  chaseCard.addEventListener('click', () => showScreen('chaseSelect'));
  els.songGrid.appendChild(chaseCard);

  SONGS.forEach(song => {
    const card = document.createElement('button');
    card.className = 'song-card';
    card.style.setProperty('--song-color', song.color);
    card.style.setProperty('--song-accent', song.accent);
    const stars = '★'.repeat(song.difficulty) + '☆'.repeat(5 - song.difficulty);
    card.innerHTML = `
      <div class="song-card-top">
        <span class="song-genre">${song.genre}</span>
        <span class="song-difficulty" title="${song.difficultyLabel}">${stars}</span>
      </div>
      <span class="song-name">${song.title}</span>
      <span class="song-meta"><span class="song-diff-label">${song.difficultyLabel}</span> · ${song.bpm} BPM · ${song.approachBeats} beat window</span>
      <span class="song-instruments">${song.instruments.join(' · ')}</span>
      <span class="song-desc">${song.description}</span>
    `;
    card.addEventListener('click', () => startGame(song.id));
    els.songGrid.appendChild(card);
  });
}

function buildChaseSelect() {
  const grid = document.getElementById('chase-grid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.values(CHASE_MODES).forEach(mode => {
    const card = document.createElement('button');
    card.className = 'song-card song-card-chase';
    card.style.setProperty('--song-color', CHASE_SONG.color);
    card.style.setProperty('--song-accent', CHASE_SONG.accent);
    const stars = mode.id === 'chase-endless' ? '∞' : '★'.repeat(
      mode.id === 'chase-easy' ? 1 : mode.id === 'chase-medium' ? 2 : 3
    );
    card.innerHTML = `
      <div class="song-card-top">
        <span class="song-genre">${mode.label}</span>
        <span class="song-difficulty">${stars}</span>
      </div>
      <span class="song-name">${mode.title}</span>
      <span class="song-meta">One shape at a time · speed ramps up</span>
      <span class="song-desc">${mode.id === 'chase-endless'
        ? 'Endless chase — shapes get faster as you survive'
        : 'Move cursor onto each shape and click before it fades'}</span>
    `;
    card.addEventListener('click', () => startChaseGame(mode.id));
    grid.appendChild(card);
  });
}

// ─── Cosmetics UI ────────────────────────────────────────────────
function updateXPDisplay(prefix) {
  const info = progression.getLevelInfo();
  const levelEl = document.getElementById(`${prefix}-level`);
  const fillEl = document.getElementById(`${prefix}-xp-fill`);
  const labelEl = document.getElementById(`${prefix}-xp-label`);
  if (levelEl) levelEl.textContent = `LVL ${info.level}`;
  if (fillEl) fillEl.style.width = info.pct + '%';
  if (labelEl) labelEl.textContent = info.maxed ? 'MAX LEVEL' : `${info.current} / ${info.needed} XP`;
}

function buildCosmetics() {
  const grid = document.getElementById('cosmetics-grid');
  if (!grid) return;
  grid.innerHTML = '';
  updateXPDisplay('cos');

  const typeLabels = { color: 'Shape Color', trail: 'Cursor Trail', background: 'Background', aura: 'Aura Glow' };

  COSMETICS.forEach(item => {
    const unlocked = progression.isUnlocked(item);
    const equipped = progression.data.equipped[item.type] === item.id;
    const card = document.createElement('button');
    card.className = `cosmetic-card${unlocked ? '' : ' locked'}${equipped ? ' equipped' : ''}`;

    const swatch = item.type === 'background'
      ? `<span class="cosmetic-swatch bg-swatch">🎨</span>`
      : `<span class="cosmetic-swatch" style="background:${item.value}"></span>`;

    card.innerHTML = `
      ${swatch}
      <span class="cosmetic-name">${unlocked ? item.name : '???'}</span>
      <span class="cosmetic-type">${typeLabels[item.type]}</span>
      <span class="cosmetic-level">${unlocked ? (equipped ? 'EQUIPPED' : 'Tap to equip') : `Unlocks at LVL ${item.level}`}</span>
    `;
    if (unlocked) {
      card.addEventListener('click', () => {
        progression.equip(item);
        buildCosmetics();
      });
    }
    grid.appendChild(card);
  });
}

// ─── Event Listeners ─────────────────────────────────────────────
document.getElementById('start-btn').addEventListener('click', () => showScreen('select'));
document.getElementById('retry-btn').addEventListener('click', () => startGame(state.selectedSongId));
const chaseBackBtn = document.getElementById('chase-back-btn');
if (chaseBackBtn) chaseBackBtn.addEventListener('click', () => showScreen('select'));
document.getElementById('select-back-btn').addEventListener('click', () => showScreen('select'));
if (els.pauseContinueBtn) els.pauseContinueBtn.addEventListener('click', togglePause);
if (els.pauseLeaveBtn) els.pauseLeaveBtn.addEventListener('click', leaveGame);
const cosmeticsBtn = document.getElementById('cosmetics-btn');
if (cosmeticsBtn) cosmeticsBtn.addEventListener('click', () => { buildCosmetics(); showScreen('cosmetics'); });
const cosmeticsBackBtn = document.getElementById('cosmetics-back-btn');
if (cosmeticsBackBtn) cosmeticsBackBtn.addEventListener('click', () => showScreen('start'));

els.canvas.addEventListener('click', (e) => handleInput(e.clientX, e.clientY));

els.canvas.addEventListener('mousemove', (e) => {
  const pos = getCanvasCoords(e.clientX, e.clientY);
  if (state.chaseMode && state.running) {
    addCursorTrailPoint(pos.x, pos.y);
  }
  state.mouseX = pos.x;
  state.mouseY = pos.y;
  state.mouseOnCanvas = true;
});

els.canvas.addEventListener('mouseleave', () => {
  state.mouseOnCanvas = false;
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    e.preventDefault();
    if (screens.game.classList.contains('active') && state.running) {
      togglePause();
    }
    return;
  }

  if (e.code === 'Space') {
    e.preventDefault();
    if (screens.start.classList.contains('active')) showScreen('select');
    else if (screens.results.classList.contains('active')) startGame(state.selectedSongId);
    else if (screens.game.classList.contains('active') && !state.chaseMode && !state.paused) handleInput();
  }
});

window.addEventListener('resize', () => {
  if (screens.game.classList.contains('active')) resizeCanvas();
});

buildLevelSelect();
buildChaseSelect();
resizeCanvas();
