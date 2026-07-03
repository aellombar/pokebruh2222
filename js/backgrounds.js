/**
 * Beat Strike — Animated theme backgrounds per level
 */

const THEME_MAP = {
  electronic: 'cyberpunk',
  hiphop: 'urban',
  jazz: 'lounge',
  orchestral: 'medieval',
  rock: 'concert',
  endless: 'void',
  chase: 'chase',
};

class BackgroundRenderer {
  constructor() {
    this.theme = 'cyberpunk';
    this.t = 0;
    this.particles = [];
    this.initParticles();
  }

  setTheme(songId) {
    this.theme = THEME_MAP[songId] || 'cyberpunk';
    this.particles = [];
    this.initParticles();
  }

  initParticles() {
    this.particles = Array.from({ length: 80 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.2 + Math.random() * 0.8,
      size: 1 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  draw(ctx, w, h, now) {
    this.t = now * 0.001;
    switch (this.theme) {
      case 'cyberpunk': this.drawCyberpunk(ctx, w, h); break;
      case 'urban': this.drawUrban(ctx, w, h); break;
      case 'lounge': this.drawLounge(ctx, w, h); break;
      case 'medieval': this.drawMedieval(ctx, w, h); break;
      case 'concert': this.drawConcert(ctx, w, h); break;
      case 'void': this.drawVoid(ctx, w, h); break;
      case 'chase': this.drawChase(ctx, w, h); break;
      default: this.drawCyberpunk(ctx, w, h);
    }
  }

  drawCyberpunk(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0a0018');
    g.addColorStop(0.5, '#12002a');
    g.addColorStop(1, '#1a0035');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // City silhouettes
    const buildings = [0.08, 0.15, 0.22, 0.35, 0.48, 0.58, 0.72, 0.85];
    buildings.forEach((bx, i) => {
      const bh = h * (0.2 + (i % 5) * 0.12);
      ctx.fillStyle = `rgba(10, 0, 30, ${0.7 + (i % 3) * 0.1})`;
      ctx.fillRect(bx * w - 20, h - bh, w * 0.12 + 30, bh);
      for (let win = 0; win < 6; win++) {
        if (Math.sin(this.t * 2 + i + win) > 0.3) {
          ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 0, 170, 0.35)';
          ctx.fillRect(bx * w + win * 12, h - bh + 20 + win * 18, 6, 8);
        }
      }
    });

    // Perspective grid
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 1;
    const horizon = h * 0.55;
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * 30, horizon);
      ctx.lineTo(w / 2 + i * 120, h);
      ctx.stroke();
    }
    for (let row = 0; row < 12; row++) {
      const y = horizon + (row / 12) * (h - horizon);
      const spread = 1 + row * 0.15;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 400 * spread, y);
      ctx.lineTo(w / 2 + 400 * spread, y);
      ctx.stroke();
    }

    // Neon signs
    ctx.font = 'bold 14px Orbitron, sans-serif';
    ctx.fillStyle = `rgba(255, 0, 170, ${0.3 + Math.sin(this.t * 3) * 0.15})`;
    ctx.fillText('NEON', w * 0.12, h * 0.35);
    ctx.fillStyle = `rgba(0, 240, 255, ${0.3 + Math.cos(this.t * 2.5) * 0.15})`;
    ctx.fillText('DRIFT', w * 0.75, h * 0.28);

    // Rain
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    for (let i = 0; i < 60; i++) {
      const rx = ((i * 137 + this.t * 200) % w);
      const ry = ((i * 89 + this.t * 400) % h);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 3, ry + 12);
      ctx.stroke();
    }

    // Scanline
    const scanY = (this.t * 80) % h;
    ctx.fillStyle = 'rgba(0, 240, 255, 0.03)';
    ctx.fillRect(0, scanY, w, 3);
  }

  drawUrban(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0d0a08');
    g.addColorStop(1, '#1a1208');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Brick wall texture
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 12; col++) {
        ctx.fillStyle = `rgba(60, 40, 25, ${0.15 + Math.random() * 0.05})`;
        const bw = w / 12, bh = h / 10;
        ctx.fillRect(col * bw + (row % 2) * bw * 0.5, h * 0.5 + row * bh, bw - 2, bh - 2);
      }
    }

    // Street lamp glow
    const lampX = w * 0.15;
    const grd = ctx.createRadialGradient(lampX, h * 0.3, 0, lampX, h * 0.5, w * 0.4);
    grd.addColorStop(0, 'rgba(255, 150, 50, 0.15)');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // Graffiti-style blocks
    ctx.fillStyle = `rgba(0, 255, 136, ${0.08 + Math.sin(this.t) * 0.03})`;
    ctx.fillRect(w * 0.6, h * 0.55, w * 0.25, h * 0.08);
    ctx.fillStyle = `rgba(255, 107, 53, ${0.08 + Math.cos(this.t * 1.3) * 0.03})`;
    ctx.fillRect(w * 0.1, h * 0.65, w * 0.3, h * 0.06);

    // Boombox bass pulse at bottom
    const pulse = 0.1 + Math.abs(Math.sin(this.t * 4)) * 0.1;
    ctx.fillStyle = `rgba(255, 107, 53, ${pulse})`;
    ctx.fillRect(0, h - 40 - pulse * 30, w, 40 + pulse * 30);
  }

  drawLounge(ctx, w, h) {
    const g = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h / 2, w);
    g.addColorStop(0, '#1a1028');
    g.addColorStop(1, '#0a0812');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Art deco arches
    ctx.strokeStyle = 'rgba(201, 160, 255, 0.12)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const ax = w * (0.1 + i * 0.2);
      ctx.beginPath();
      ctx.moveTo(ax - 40, h);
      ctx.quadraticCurveTo(ax, h * 0.4 - i * 20, ax + 40, h);
      ctx.stroke();
    }

    // Smoke wisps
    this.particles.slice(0, 20).forEach((p, i) => {
      const px = (p.x + Math.sin(this.t * 0.5 + p.phase) * 0.05) * w;
      const py = (p.y * 0.6 + this.t * p.speed * 0.02) % (h * 0.7);
      const grd = ctx.createRadialGradient(px, py, 0, px, py, 40 + p.size * 10);
      grd.addColorStop(0, `rgba(180, 160, 220, ${0.06})`);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(px, py, 40 + p.size * 10, 0, Math.PI * 2);
      ctx.fill();
    });

    // Warm spotlight
    const sg = ctx.createRadialGradient(w / 2, h * 0.2, 0, w / 2, h * 0.5, w * 0.6);
    sg.addColorStop(0, 'rgba(255, 200, 100, 0.08)');
    sg.addColorStop(1, 'transparent');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);

    // Vinyl record spin hint
    ctx.strokeStyle = 'rgba(110, 181, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 0.75, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 0.75, 30, this.t, this.t + Math.PI * 1.5);
    ctx.stroke();
  }

  drawMedieval(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0a0c18');
    g.addColorStop(0.6, '#14101a');
    g.addColorStop(1, '#1a1410');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Castle silhouette
    ctx.fillStyle = 'rgba(20, 15, 25, 0.9)';
    const castleBase = h * 0.45;
    ctx.fillRect(0, castleBase, w, h - castleBase);
    for (let i = 0; i < 9; i++) {
      const tx = w * (0.05 + i * 0.11);
      const th = 40 + (i % 3) * 25;
      ctx.fillRect(tx, castleBase - th, 35, th);
      ctx.fillRect(tx + 10, castleBase - th - 20, 15, 20);
    }

    // Stone wall pattern
    ctx.strokeStyle = 'rgba(100, 80, 60, 0.15)';
    ctx.lineWidth = 1;
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 10; col++) {
        const sx = col * (w / 10) + (row % 2) * (w / 20);
        const sy = h * 0.55 + row * 30;
        ctx.strokeRect(sx, sy, w / 10 - 2, 28);
      }
    }

    // Torches
    [0.12, 0.88].forEach((tx) => {
      const fx = w * tx;
      const flicker = 0.7 + Math.sin(this.t * 8 + tx * 10) * 0.3;
      const tg = ctx.createRadialGradient(fx, h * 0.5, 0, fx, h * 0.5, 120 * flicker);
      tg.addColorStop(0, `rgba(255, 140, 40, ${0.2 * flicker})`);
      tg.addColorStop(0.5, `rgba(255, 80, 20, ${0.08 * flicker})`);
      tg.addColorStop(1, 'transparent');
      ctx.fillStyle = tg;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = `rgba(255, 160, 60, ${flicker})`;
      ctx.beginPath();
      ctx.ellipse(fx, h * 0.48, 6, 14 + flicker * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Banners
    [0.3, 0.7].forEach((bx, i) => {
      const wave = Math.sin(this.t * 2 + i) * 8;
      ctx.fillStyle = i === 0 ? 'rgba(180, 140, 40, 0.25)' : 'rgba(140, 40, 40, 0.25)';
      ctx.beginPath();
      ctx.moveTo(bx * w, h * 0.35);
      ctx.lineTo(bx * w + 30 + wave, h * 0.42);
      ctx.lineTo(bx * w + wave, h * 0.55);
      ctx.closePath();
      ctx.fill();
    });

    // Moon
    ctx.fillStyle = 'rgba(220, 220, 240, 0.12)';
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.12, 35, 0, Math.PI * 2);
    ctx.fill();
  }

  drawConcert(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#120808');
    g.addColorStop(1, '#1a0808');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Stage lights
    const colors = ['#ff6644', '#ffcc00', '#ff4466'];
    colors.forEach((c, i) => {
      const angle = this.t * 0.8 + i * 2.1;
      const lx = w / 2 + Math.sin(angle) * w * 0.35;
      const lg = ctx.createRadialGradient(lx, 0, 0, lx, h * 0.7, h);
      lg.addColorStop(0, c + '33');
      lg.addColorStop(1, 'transparent');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, w, h);
    });

    // Crowd silhouettes
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    for (let i = 0; i < 30; i++) {
      const cx = (i / 30) * w;
      const ch = 15 + Math.sin(i * 1.7) * 10;
      ctx.beginPath();
      ctx.ellipse(cx, h - 10, 8, ch, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Speaker stacks
    ctx.fillStyle = 'rgba(30, 20, 20, 0.8)';
    ctx.fillRect(w * 0.05, h * 0.5, 40, h * 0.35);
    ctx.fillRect(w * 0.9, h * 0.5, 40, h * 0.35);
    const amp = Math.abs(Math.sin(this.t * 6));
    ctx.fillStyle = `rgba(255, 100, 50, ${0.1 + amp * 0.2})`;
    ctx.fillRect(0, h - 20 - amp * 40, w, 20 + amp * 40);
  }

  drawVoid(ctx, w, h) {
    const hue = (this.t * 20) % 360;
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.8);
    g.addColorStop(0, `hsla(${hue}, 60%, 8%, 1)`);
    g.addColorStop(1, '#050508');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Warp speed stars
    this.particles.forEach((p, i) => {
      p.y += p.speed * 0.008;
      if (p.y > 1) { p.y = 0; p.x = Math.random(); }
      const px = p.x * w;
      const py = p.y * h;
      const len = 5 + p.speed * 15;
      ctx.strokeStyle = `hsla(${(hue + i * 5) % 360}, 80%, 70%, ${0.3 + p.speed * 0.3})`;
      ctx.lineWidth = p.size * 0.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + len);
      ctx.stroke();
    });

    // Pulsing rings
    for (let r = 0; r < 3; r++) {
      const radius = 80 + ((this.t * 60 + r * 100) % 300);
      ctx.strokeStyle = `hsla(${(hue + r * 40) % 360}, 100%, 60%, ${0.15 - radius / 2000})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawChase(ctx, w, h) {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    g.addColorStop(0, '#0a1810');
    g.addColorStop(1, '#050810');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Target reticle grid
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Pulsing rings from center
    for (let r = 0; r < 4; r++) {
      const radius = 60 + ((this.t * 50 + r * 80) % 350);
      ctx.strokeStyle = `rgba(255, 107, 157, ${0.12 - radius / 3000})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Floating target markers
    for (let i = 0; i < 8; i++) {
      const px = (Math.sin(this.t * 0.7 + i * 1.3) * 0.35 + 0.5) * w;
      const py = (Math.cos(this.t * 0.5 + i * 0.9) * 0.35 + 0.5) * h;
      ctx.strokeStyle = `rgba(0, 255, 136, ${0.08 + Math.sin(this.t + i) * 0.04})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.moveTo(px - 18, py);
      ctx.lineTo(px + 18, py);
      ctx.moveTo(px, py - 18);
      ctx.lineTo(px, py + 18);
      ctx.stroke();
    }
  }
}

const backgroundRenderer = new BackgroundRenderer();
