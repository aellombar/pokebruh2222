/**
 * Beat Strike — Bullet Hell mode
 * Arrow keys dodge · SPACE hits beats
 */

const BH_CONFIG = {
  playerRadius: 15,
  playerSpeed: 5.4,
  bulletRadius: 6,
  baseBulletSpeed: 3.2,
  spawnInterval: 360,
  minSpawnInterval: 120,
  beatYRatio: 0.76,
};

function bhReset() {
  const w = els.canvas.width;
  const h = els.canvas.height;
  state.player = { x: w / 2, y: h * 0.88, radius: BH_CONFIG.playerRadius };
  state.bullets = [];
  state.bhNextBulletAt = 0;
}

function bhSpawnBullet(w) {
  const elapsed = (gameNow() - state.gameStartTime) / 1000;
  const speed = BH_CONFIG.baseBulletSpeed + elapsed * 0.08;
  const margin = 24;
  state.bullets.push({
    x: margin + Math.random() * (w - margin * 2),
    y: -10,
    vy: speed,
    radius: BH_CONFIG.bulletRadius,
    color: Math.random() > 0.5 ? '#ff4466' : '#ff8844',
  });
}

function bhUpdatePlayer(w, h) {
  const p = state.player;
  const spd = BH_CONFIG.playerSpeed;
  const keys = state.keysDown;
  if (keys.ArrowLeft) p.x -= spd;
  if (keys.ArrowRight) p.x += spd;
  if (keys.ArrowUp) p.y -= spd;
  if (keys.ArrowDown) p.y += spd;
  const m = p.radius + 8;
  p.x = Math.max(m, Math.min(w - m, p.x));
  p.y = Math.max(h * 0.52, Math.min(h - m, p.y));
}

function bhUpdate(now, w, h) {
  if (!state.bulletHellMode || isGameplayBlocked()) return;

  bhUpdatePlayer(w, h);

  const elapsed = (gameNow() - state.gameStartTime) / 1000;
  const interval = Math.max(
    BH_CONFIG.minSpawnInterval,
    BH_CONFIG.spawnInterval - elapsed * 12
  );

  if (now >= state.bhNextBulletAt) {
    bhSpawnBullet(w);
    state.bhNextBulletAt = now + interval + Math.random() * 80;
  }

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.y += b.vy;
    if (b.y > h + 20) {
      state.bullets.splice(i, 1);
      continue;
    }
    const p = state.player;
    if (Math.hypot(b.x - p.x, b.y - p.y) < p.radius + b.radius) {
      showFeedback('BULLET HIT!', 'miss');
      endGame();
      return;
    }
  }
}

function bhDraw(ctx, w, h) {
  const { color, accent } = getPlayColors();
  const p = state.player;

  for (const b of state.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
  }

  if (!p) return;

  const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 1.8);
  grad.addColorStop(0, color);
  grad.addColorStop(0.6, accent);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius * 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '11px Orbitron, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.textAlign = 'center';
  ctx.fillText('ARROWS · DODGE', w / 2, h - 12);
}

function spawnBulletHellBeat(hitTime, approachTime, beatEntry) {
  const w = els.canvas.width;
  const h = els.canvas.height;
  const windows = rollTimingWindows();

  state.currentNote = {
    id: state.totalNotes++,
    beatIndex: beatEntry ? beatEntry.beatIndex : -1,
    x: w * 0.5,
    y: h * BH_CONFIG.beatYRatio,
    shape: 'circle',
    approachTime,
    hitTime,
    perfectWindow: windows.perfectWindow,
    goodWindow: windows.goodWindow,
    hit: false,
    missed: false,
    clicked: false,
    clickTime: 0,
    rating: null,
    isBeatLane: true,
  };
  if (beatEntry) beatEntry.spawned = true;
}
