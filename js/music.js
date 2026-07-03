/**
 * Beat Strike — Procedural song engine
 * Five genre tracks with distinct instruments, synced to Web Audio clock.
 */

const NOTE = {
  C2: 65.41, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
};

// ─── Instrument helpers ──────────────────────────────────────────
function createGain(ctx, time, peak, duration) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, time);
  g.gain.exponentialRampToValueAtTime(peak, time + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, time + duration);
  return g;
}

function playOsc(ctx, dest, time, freq, type, duration, volume, freqEnd) {
  const osc = ctx.createOscillator();
  const gain = createGain(ctx, time, volume, duration);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, time + duration);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + duration + 0.05);
}

function playNoise(ctx, dest, time, duration, volume, freq = 800) {
  const len = Math.ceil(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const gain = createGain(ctx, time, volume, duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(time);
  src.stop(time + duration + 0.05);
}

function playKick(ctx, dest, time, vol = 0.7) {
  playOsc(ctx, dest, time, 150, 'sine', 0.35, vol, 40);
}

function playSnare(ctx, dest, time, vol = 0.35) {
  playNoise(ctx, dest, time, 0.18, vol, 1200);
  playOsc(ctx, dest, time, 200, 'triangle', 0.08, vol * 0.4, 100);
}

function playHiHat(ctx, dest, time, vol = 0.12, open = false) {
  playNoise(ctx, dest, time, open ? 0.25 : 0.06, vol, 7000);
}

function playBass(ctx, dest, time, freq, vol = 0.35, dur = 0.3) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  const gain = createGain(ctx, time, vol, dur);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + dur + 0.05);
}

function playChord(ctx, dest, time, freqs, type, vol, dur) {
  freqs.forEach(f => playOsc(ctx, dest, time, f, type, dur, vol / freqs.length));
}

// ─── Genre schedulers ────────────────────────────────────────────
function scheduleElectronic(ctx, dest, start, beat, beatDur) {
  const t = start + beat * beatDur;
  const bar = Math.floor(beat / 4) % 8;
  const pos = beat % 4;

  if (pos === 0) playKick(ctx, dest, t, 0.75);
  if (pos === 2) playKick(ctx, dest, t, 0.55);
  if (pos === 1 || pos === 3) playSnare(ctx, dest, t, 0.3);
  playHiHat(ctx, dest, t + beatDur * 0.5, 0.08);
  if (beat % 2 === 0) playHiHat(ctx, dest, t, 0.05);

  const bassLine = [NOTE.C3, NOTE.C3, NOTE.G3, NOTE.G3, NOTE.A3, NOTE.A3, NOTE.F3, NOTE.F3];
  if (pos === 0) playBass(ctx, dest, t, bassLine[bar], 0.3, beatDur * 1.8);

  const arpNotes = [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.G4, NOTE.E4, NOTE.C4, NOTE.G4];
  if (beat % 2 === 0) {
    playOsc(ctx, dest, t, arpNotes[beat % arpNotes.length], 'square', beatDur * 0.4, 0.06);
  }

  if (bar === 0 && pos === 0 && beat > 0) {
    playOsc(ctx, dest, t, NOTE.C5, 'sine', beatDur * 2, 0.1, NOTE.G4);
  }
}

function scheduleJazz(ctx, dest, start, beat, beatDur) {
  const t = start + beat * beatDur;
  const bar = Math.floor(beat / 4) % 8;
  const pos = beat % 4;

  if (pos === 0) playKick(ctx, dest, t, 0.35);
  if (pos === 2) playSnare(ctx, dest, t, 0.2);
  if (beat % 2 === 1) playHiHat(ctx, dest, t, 0.04, true);

  const walkBass = [NOTE.C3, NOTE.E3, NOTE.G3, NOTE.A3, NOTE.F3, NOTE.A3, NOTE.D3, NOTE.G3,
                    NOTE.C3, NOTE.D3, NOTE.E3, NOTE.F3, NOTE.G3, NOTE.A3, NOTE.B3, NOTE.C4];
  playBass(ctx, dest, t, walkBass[beat % walkBass.length], 0.22, beatDur * 0.85);

  const chords = [
    [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.B4],
    [NOTE.D4, NOTE.F4, NOTE.A4, NOTE.C5],
    [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.F4],
    [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.B4],
  ];
  if (pos === 0) playChord(ctx, dest, t, chords[bar % 4], 'triangle', 0.07, beatDur * 3.5);

  const saxLine = [NOTE.E4, NOTE.G4, NOTE.A4, NOTE.B4, NOTE.A4, NOTE.G4, NOTE.E4, NOTE.D4];
  if (pos === 2) {
    playOsc(ctx, dest, t, saxLine[bar], 'sawtooth', beatDur * 1.5, 0.05, saxLine[bar] * 1.01);
  }
}

function scheduleRock(ctx, dest, start, beat, beatDur) {
  const t = start + beat * beatDur;
  const bar = Math.floor(beat / 4) % 4;
  const pos = beat % 4;

  if (pos === 0 || pos === 2) playKick(ctx, dest, t, 0.8);
  if (pos === 1 || pos === 3) playSnare(ctx, dest, t, 0.45);
  playHiHat(ctx, dest, t, 0.1);
  playHiHat(ctx, dest, t + beatDur * 0.5, 0.07);

  const powerChords = [
    [NOTE.E3, NOTE.B3, NOTE.E4],
    [NOTE.E3, NOTE.B3, NOTE.E4],
    [NOTE.G3, NOTE.D4, NOTE.G4],
    [NOTE.A3, NOTE.E4, NOTE.A4],
  ];
  if (pos === 0) playChord(ctx, dest, t, powerChords[bar], 'sawtooth', 0.12, beatDur * 3.8);

  const bassRoots = [NOTE.E2, NOTE.E2, NOTE.G2, NOTE.A2];
  if (pos === 0) playBass(ctx, dest, t, bassRoots[bar], 0.35, beatDur * 1.9);

  if (pos === 3) playOsc(ctx, dest, t, NOTE.E5, 'square', 0.15, 0.08, NOTE.E4);
}

function scheduleOrchestral(ctx, dest, start, beat, beatDur) {
  const t = start + beat * beatDur;
  const bar = Math.floor(beat / 4) % 8;
  const pos = beat % 4;

  if (bar % 4 === 0 && pos === 0) playKick(ctx, dest, t, 0.5);
  if (pos === 2) playNoise(ctx, dest, t, 0.4, 0.15, 200);

  const stringMelody = [NOTE.G4, NOTE.A4, NOTE.B4, NOTE.C5, NOTE.B4, NOTE.A4, NOTE.G4, NOTE.F4,
                        NOTE.E4, NOTE.F4, NOTE.G4, NOTE.A4, NOTE.G4, NOTE.F4, NOTE.E4, NOTE.D4];
  playOsc(ctx, dest, t, stringMelody[beat % stringMelody.length], 'sawtooth', beatDur * 0.7, 0.04);

  const horns = [NOTE.C4, NOTE.E4, NOTE.G4];
  if (pos === 0) playChord(ctx, dest, t, horns, 'triangle', 0.06, beatDur * 3.5);

  if (bar === 4 && pos === 0) {
    playOsc(ctx, dest, t, NOTE.C3, 'sine', beatDur * 2, 0.2, NOTE.G2);
  }
}

function scheduleHipHop(ctx, dest, start, beat, beatDur) {
  const t = start + beat * beatDur;
  const bar = Math.floor(beat / 4) % 4;
  const pos = beat % 4;

  if (pos === 0) playKick(ctx, dest, t, 0.9);
  if (pos === 2) playSnare(ctx, dest, t, 0.35);
  if (beat % 2 === 0) playHiHat(ctx, dest, t, 0.06);
  if (beat % 4 === 3) playHiHat(ctx, dest, t + beatDur * 0.5, 0.05);

  const bass808 = [NOTE.C2, NOTE.C2, NOTE.G2, NOTE.F2];
  if (pos === 0) playBass(ctx, dest, t, bass808[bar], 0.45, beatDur * 1.6);

  const stabs = [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.A4];
  if (pos === 1 || pos === 3) {
    playOsc(ctx, dest, t, stabs[bar], 'square', beatDur * 0.25, 0.07);
  }

  if (bar === 2 && pos === 0) {
    playNoise(ctx, dest, t, 0.08, 0.12, 4000);
  }
}

function scheduleEndless(ctx, dest, start, beat, beatDur) {
  const t = start + beat * beatDur;
  const pos = beat % 4;
  const bar = Math.floor(beat / 4) % 4;

  if (pos === 0) playKick(ctx, dest, t, 0.7);
  if (pos === 2) playSnare(ctx, dest, t, 0.32);
  if (beat % 2 === 0) playHiHat(ctx, dest, t, 0.06);

  const bass = [NOTE.C3, NOTE.E3, NOTE.G3, NOTE.A3];
  if (pos === 0) playBass(ctx, dest, t, bass[bar], 0.28, beatDur * 1.5);

  if (beat % 4 === 1) {
    playOsc(ctx, dest, t, NOTE.C5, 'square', beatDur * 0.2, 0.05, NOTE.G4);
  }
}

const ENDLESS_SONG = {
  id: 'endless',
  title: 'Endless Rush',
  genre: 'Endless',
  difficulty: 0,
  difficultyLabel: '∞',
  isEndless: true,
  bpm: 130,
  duration: 99999,
  approachBeats: 2.5,
  noteInterval: 4,
  color: '#ff00ff',
  accent: '#00ffff',
  instruments: ['Driving Beat', 'Rising Tempo', 'Random Windows', 'No Mercy'],
  description: 'Survive as long as you can — speed ramps up forever.',
  schedule: scheduleEndless,
};

const CHASE_SONG = {
  id: 'chase',
  title: 'Cursor Chase',
  genre: 'Chase Mode',
  difficulty: 0,
  difficultyLabel: 'Mouse',
  isChase: true,
  isEndless: true,
  bpm: 120,
  duration: 99999,
  approachBeats: 2.5,
  noteInterval: 4,
  color: '#00ff88',
  accent: '#ff6b9d',
  instruments: ['Mouse Tracking', 'Fade Timer', 'Speed Ramp', 'Precision Clicks'],
  description: 'Move your cursor onto each shape and click before it fades away.',
  schedule: scheduleEndless,
};

// ─── Song definitions ────────────────────────────────────────────
const SONGS = [
  {
    id: 'electronic',
    title: 'Neon Drift',
    genre: 'Electronic',
    difficulty: 1,
    difficultyLabel: 'Easy',
    bpm: 128,
    duration: 45,
    approachBeats: 2.5,
    noteInterval: 4,
    color: '#00f0ff',
    accent: '#ff00aa',
    instruments: ['Synth Bass', 'Arpeggiator', 'Drum Machine', 'Pad Synth'],
    description: 'Pulsing synthwave grooves — a gentle intro to the beat.',
    schedule: scheduleElectronic,
  },
  {
    id: 'hiphop',
    title: 'Block Party',
    genre: 'Hip Hop',
    difficulty: 2,
    difficultyLabel: 'Medium',
    bpm: 90,
    duration: 45,
    approachBeats: 2.25,
    noteInterval: 4,
    color: '#00ff88',
    accent: '#ff6b35',
    instruments: ['808 Kick', 'Snare Clap', 'Hi-Hats', 'Synth Stabs'],
    description: 'Deep 808 bass and crisp hi-hats — shapes move a little faster.',
    schedule: scheduleHipHop,
  },
  {
    id: 'jazz',
    title: 'Midnight Blue',
    genre: 'Jazz',
    difficulty: 3,
    difficultyLabel: 'Hard',
    bpm: 110,
    duration: 45,
    approachBeats: 2,
    noteInterval: 4,
    color: '#6eb5ff',
    accent: '#c9a0ff',
    instruments: ['Grand Piano', 'Upright Bass', 'Brush Drums', 'Tenor Sax'],
    description: 'Smooth jazz swing with tighter timing windows.',
    schedule: scheduleJazz,
  },
  {
    id: 'orchestral',
    title: 'Royal March',
    genre: 'Orchestral',
    difficulty: 4,
    difficultyLabel: 'Expert',
    bpm: 96,
    duration: 45,
    approachBeats: 1.75,
    noteInterval: 4,
    color: '#ffd700',
    accent: '#c0a050',
    instruments: ['Strings', 'French Horns', 'Timpani', 'Woodwinds'],
    description: 'Majestic brass and strings — fast-shrinking shapes.',
    schedule: scheduleOrchestral,
  },
  {
    id: 'rock',
    title: 'Iron Highway',
    genre: 'Rock',
    difficulty: 5,
    difficultyLabel: 'Master',
    bpm: 140,
    duration: 45,
    approachBeats: 1.5,
    noteInterval: 4,
    color: '#ff6644',
    accent: '#ffcc00',
    instruments: ['Electric Guitar', 'Bass Guitar', 'Rock Drums', 'Power Chords'],
    description: 'Blazing rock tempo — the ultimate speed challenge.',
    schedule: scheduleRock,
  },
].sort((a, b) => a.difficulty - b.difficulty);

// ─── Song Player ─────────────────────────────────────────────────
class SongPlayer {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.song = null;
    this.startTime = 0;
    this.playing = false;
  }

  init(ctx) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.42;
    this.master.connect(ctx.destination);
  }

  getSong(id) {
    if (id === 'endless') return ENDLESS_SONG;
    if (id === 'chase') return CHASE_SONG;
    return SONGS.find(s => s.id === id) || SONGS[0];
  }

  getBeatMs(song) {
    return 60000 / song.bpm;
  }

  getTotalBeats(song) {
    return Math.floor((song.duration * song.bpm) / 60);
  }

  buildBeatMap(song) {
    const total = this.getTotalBeats(song);
    const beats = [];
    for (let b = song.noteInterval; b < total; b += song.noteInterval) {
      beats.push(b);
    }
    return beats;
  }

  play(song) {
    if (!this.ctx) return;
    this.stop();
    this.song = song;
    this.startTime = this.ctx.currentTime + 0.08;
    this.playing = true;

    const beatDur = 60 / song.bpm;
    const total = (song.isEndless || song.isChase) ? 1200 : this.getTotalBeats(song);

    for (let beat = 0; beat < total; beat++) {
      song.schedule(this.ctx, this.master, this.startTime, beat, beatDur);
    }
  }

  stop() {
    this.playing = false;
    this.song = null;
  }

  getElapsedMs() {
    if (!this.playing || !this.ctx) return 0;
    return Math.max(0, (this.ctx.currentTime - this.startTime) * 1000);
  }

  getStartPerfTime(perfNow) {
    if (!this.playing || !this.ctx) return perfNow;
    const elapsed = this.getElapsedMs();
    return perfNow - elapsed;
  }

  beatToMs(song, beatIndex) {
    return beatIndex * this.getBeatMs(song);
  }

  isFinished() {
    if (!this.song) return true;
    if (this.song.isEndless || this.song.isChase) return false;
    return this.getElapsedMs() >= this.song.duration * 1000;
  }
}

const songPlayer = new SongPlayer();
