/**
 * Beat Strike — XP, levels, and cosmetics (localStorage persisted)
 */

const MAX_LEVEL = 50;

const COSMETICS = (() => {
  const shapeColors = [
    ['Neon Cyan', '#00f0ff'], ['Hot Pink', '#ff00aa'], ['Lime Volt', '#aaff00'],
    ['Sunset Orange', '#ff7b00'], ['Electric Purple', '#b366ff'], ['Gold Rush', '#ffd700'],
    ['Crimson Edge', '#ff3355'], ['Mint Fresh', '#4dffb8'], ['Sky Bolt', '#4db8ff'],
    ['Magma', '#ff5522'], ['Toxic Green', '#66ff33'], ['Royal Blue', '#3355ff'],
    ['Bubblegum', '#ff77cc'], ['Amber Glow', '#ffb300'], ['Turquoise', '#22ddcc'],
    ['Violet Storm', '#8844ff'], ['Coral Reef', '#ff6655'], ['Ice White', '#e8f8ff'],
    ['Laser Red', '#ff2222'], ['Aurora', '#55ffaa'],
  ];
  const trailColors = [
    ['Emerald Trail', '#00ff88'], ['Pink Streak', '#ff6b9d'], ['Cyan Wake', '#00f0ff'],
    ['Gold Comet', '#ffd700'], ['Violet Wisp', '#b366ff'], ['Fire Trail', '#ff7b00'],
    ['Frost Trail', '#aaddff'], ['Blood Streak', '#ff3355'], ['Lime Wake', '#aaff00'],
    ['Ocean Trail', '#3388ff'], ['Rose Comet', '#ff77cc'], ['Copper Wisp', '#ff9944'],
    ['Ghost Trail', '#ffffff'], ['Toxic Wake', '#66ff33'], ['Royal Streak', '#7755ff'],
  ];
  const backgrounds = [
    ['Cyberpunk City', 'cyberpunk'], ['Urban Streets', 'urban'], ['Jazz Lounge', 'lounge'],
    ['Medieval Castle', 'medieval'], ['Rock Concert', 'concert'], ['The Void', 'void'],
    ['Chase Grid', 'chase'],
  ];
  const auras = [
    ['Emerald Aura', '#00ff88'], ['Golden Aura', '#ffd700'], ['Pink Aura', '#ff6b9d'],
    ['Cyan Aura', '#00f0ff'], ['Violet Aura', '#b366ff'], ['Inferno Aura', '#ff5522'],
    ['Frost Aura', '#aaddff'], ['Phantom Aura', '#ffffff'],
  ];

  const items = [];
  shapeColors.forEach(([name, value], i) =>
    items.push({ id: `color-${i}`, level: i + 1, type: 'color', name, value }));
  trailColors.forEach(([name, value], i) =>
    items.push({ id: `trail-${i}`, level: 21 + i, type: 'trail', name, value }));
  backgrounds.forEach(([name, value], i) =>
    items.push({ id: `bg-${i}`, level: 36 + i, type: 'background', name, value }));
  auras.forEach(([name, value], i) =>
    items.push({ id: `aura-${i}`, level: 43 + i, type: 'aura', name, value }));
  return items;
})();

const progression = {
  data: { xp: 0, equipped: {} },

  load() {
    try {
      const raw = localStorage.getItem('beatstrike_progress');
      if (raw) this.data = { xp: 0, equipped: {}, ...JSON.parse(raw) };
    } catch (e) { /* corrupted storage — start fresh */ }
  },

  save() {
    try {
      localStorage.setItem('beatstrike_progress', JSON.stringify(this.data));
    } catch (e) { /* storage unavailable */ }
  },

  xpForLevel(level) {
    return 100 + (level - 1) * 30;
  },

  getLevelInfo() {
    let xp = this.data.xp;
    let level = 1;
    while (level < MAX_LEVEL && xp >= this.xpForLevel(level)) {
      xp -= this.xpForLevel(level);
      level++;
    }
    const needed = level >= MAX_LEVEL ? 0 : this.xpForLevel(level);
    return {
      level,
      current: level >= MAX_LEVEL ? 0 : xp,
      needed,
      pct: level >= MAX_LEVEL ? 100 : Math.min(100, (xp / needed) * 100),
      maxed: level >= MAX_LEVEL,
    };
  },

  addXP(amount) {
    const before = this.getLevelInfo().level;
    this.data.xp += Math.max(0, Math.round(amount));
    this.save();
    const after = this.getLevelInfo().level;
    return { gained: Math.round(amount), leveledUp: after > before, newLevel: after };
  },

  isUnlocked(item) {
    return this.getLevelInfo().level >= item.level;
  },

  equip(item) {
    if (!this.isUnlocked(item)) return;
    if (this.data.equipped[item.type] === item.id) {
      delete this.data.equipped[item.type];
    } else {
      this.data.equipped[item.type] = item.id;
    }
    this.save();
  },

  getEquipped(type) {
    const id = this.data.equipped[type];
    if (!id) return null;
    return COSMETICS.find(c => c.id === id) || null;
  },
};

progression.load();
