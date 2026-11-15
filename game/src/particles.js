// Particles and floating score text: the juice on every ring, star and hit.
// One fixed pool, no allocation during play.
export function createParticles(capacity = 320) {
  const parts = [];
  for (let i = 0; i < capacity; i += 1) {
    parts.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, colour: '#fff' });
  }
  const texts = [];
  for (let i = 0; i < 24; i += 1) {
    texts.push({ active: false, x: 0, y: 0, life: 0, max: 1, value: '', colour: '#fff' });
  }

  function spawn(x, y, vx, vy, life, size, colour) {
    for (const p of parts) {
      if (p.active) continue;
      p.active = true;
      p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.max = life; p.size = size; p.colour = colour;
      return;
    }
  }

  return {
    burst(x, y, colour, count, speed) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const v = speed * (0.4 + Math.random() * 0.8);
        spawn(x, y, Math.cos(angle) * v, Math.sin(angle) * v, 0.4 + Math.random() * 0.4, 2 + Math.random() * 3, colour);
      }
    },
    streak(x, y, vx, vy, colour) {
      spawn(x, y, vx, vy, 0.5, 2, colour);
    },
    floatText(x, y, value, colour) {
      for (const t of texts) {
        if (t.active) continue;
        t.active = true;
        t.x = x; t.y = y; t.life = 0.9; t.max = 0.9; t.value = value; t.colour = colour || '#ffffff';
        return;
      }
    },
    step(dt) {
      for (const p of parts) {
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) { p.active = false; continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy *= 0.94;
      }
      for (const t of texts) {
        if (!t.active) continue;
        t.life -= dt;
        if (t.life <= 0) { t.active = false; continue; }
        t.y -= 34 * dt;
      }
    },
    get list() { return parts; },
    get labels() { return texts; },
    clear() {
      for (const p of parts) p.active = false;
      for (const t of texts) t.active = false;
    },
  };
}
