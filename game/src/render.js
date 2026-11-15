// Drawing only: the sky, the sun, the sea, the plane, the rings, the hazards
// and every screen. It never changes the sky; it paints what the sky holds.
import { FIELD, FONT, LEGS_TOTAL, PALETTE, PLANE, RINGS_PER_LEG } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_FOLD = 'fold';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  // Parallax cloud puffs, three depths, placed once and drifting forever.
  const layers = [];
  for (let depth = 0; depth < 3; depth += 1) {
    const layer = [];
    for (let i = 0; i < 7; i += 1) {
      layer.push({
        x: Math.random() * FIELD.width,
        y: 60 + Math.random() * 480,
        s: (0.6 + depth * 0.5) * (0.7 + Math.random() * 0.6),
        speed: 12 + depth * 14,
      });
    }
    layers.push(layer);
  }
  let seaPhase = 0;

  function fit() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(FIELD.width * scale * dpr);
    canvas.height = Math.round(FIELD.height * scale * dpr);
    canvas.style.width = `${Math.round(FIELD.width * scale)}px`;
    canvas.style.height = `${Math.round(FIELD.height * scale)}px`;
  }
  fit();
  window.addEventListener('resize', fit);

  function circle(x, y, r, colour) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = colour;
    ctx.fill();
  }

  function text(str, x, y, size, colour, align, weight) {
    ctx.font = `${weight || 600} ${size}px ${FONT}`;
    ctx.fillStyle = colour;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function drawPuff(x, y, s, colour, alpha) {
    ctx.globalAlpha = alpha;
    circle(x, y, 26 * s, colour);
    circle(x - 24 * s, y + 8 * s, 18 * s, colour);
    circle(x + 24 * s, y + 8 * s, 20 * s, colour);
    circle(x + 4 * s, y - 14 * s, 20 * s, colour);
    ctx.globalAlpha = 1;
  }

  function drawBackground(state, dt) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(0.55, PALETTE.skyMid);
    g.addColorStop(0.82, PALETTE.skyLow);
    g.addColorStop(1, PALETTE.seaLight);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Sun with rays.
    const sunX = 1120;
    const sunY = 110;
    const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 150);
    glow.addColorStop(0, 'rgba(255,243,196,0.9)');
    glow.addColorStop(0.4, 'rgba(255,209,102,0.35)');
    glow.addColorStop(1, 'rgba(255,209,102,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 160, sunY - 160, 320, 320);
    circle(sunX, sunY, 52, PALETTE.sunCore);
    circle(sunX, sunY, 44, PALETTE.sun);
    // Parallax clouds drift left; speed follows the plane a little.
    const drift = 30 + Math.hypot(state.plane.vx, state.plane.vy) * 0.12;
    for (let d = 0; d < layers.length; d += 1) {
      for (const cloud of layers[d]) {
        cloud.x -= (cloud.speed + drift * (0.3 + d * 0.35)) * dt;
        if (cloud.x < -120) { cloud.x = FIELD.width + 110; cloud.y = 60 + Math.random() * 480; }
        drawPuff(cloud.x, cloud.y, cloud.s, PALETTE.cloud, 0.5 + d * 0.22);
      }
    }
    // Sea far below, with rolling wave lines.
    seaPhase += dt;
    ctx.fillStyle = PALETTE.sea;
    ctx.fillRect(0, 648, FIELD.width, 72);
    ctx.strokeStyle = PALETTE.seaLight;
    ctx.lineWidth = 3;
    for (let row = 0; row < 3; row += 1) {
      const y = 664 + row * 18;
      ctx.beginPath();
      for (let x = 0; x <= FIELD.width; x += 16) {
        const wy = y + Math.sin(x * 0.02 + seaPhase * 1.6 + row * 2) * 3;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
    // The Far Island on the horizon, growing nearer with each leg.
    const progress = ((Math.max(1, state.leg) - 1) * RINGS_PER_LEG + state.ringsPassed) / (LEGS_TOTAL * RINGS_PER_LEG);
    const islandX = 150 + progress * 900;
    const islandS = 0.5 + progress * 0.7;
    ctx.fillStyle = '#2a9d8f';
    ctx.beginPath();
    ctx.ellipse(islandX, 650, 90 * islandS, 16 * islandS, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#588157';
    ctx.beginPath();
    ctx.moveTo(islandX - 18 * islandS, 650);
    ctx.lineTo(islandX - 4 * islandS, 650 - 42 * islandS);
    ctx.lineTo(islandX + 10 * islandS, 650);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e63946';
    ctx.fillRect(islandX + 4 * islandS, 650 - 52 * islandS, 3, 12);
  }

  function drawRing(state) {
    const ring = state.ring;
    if (!ring) return;
    const y = ring.y + Math.sin(ring.wobble * 1.6) * 14;
    const pulse = 1 + Math.sin(state.time * 4) * 0.05;
    const r = ring.radius * pulse;
    const glow = ctx.createRadialGradient(ring.x, y, r * 0.4, ring.x, y, r + 26);
    glow.addColorStop(0, 'rgba(255,183,3,0.35)');
    glow.addColorStop(1, 'rgba(255,183,3,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(ring.x - r - 30, y - r - 30, (r + 30) * 2, (r + 30) * 2);
    ctx.strokeStyle = PALETTE.ring;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(ring.x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.ringGlow;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ring.x, y, r - 7, 0, Math.PI * 2);
    ctx.stroke();
    text('➤', ring.x, y + r + 26, 22, PALETTE.ring, 'center', 800);
  }

  function drawStars(state) {
    for (const star of state.starDrops) {
      const tw = 0.75 + 0.25 * Math.sin(state.time * 6 + star.phase);
      ctx.globalAlpha = tw;
      ctx.fillStyle = PALETTE.star;
      ctx.save();
      ctx.translate(star.x, star.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();
      ctx.globalAlpha = tw * 0.5;
      ctx.fillStyle = '#fff3c4';
      ctx.save();
      ctx.translate(star.x, star.y);
      ctx.fillRect(-11, -2, 22, 4);
      ctx.fillRect(-2, -11, 4, 22);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawClouds(state) {
    for (const cloud of state.clouds) {
      const bob = Math.sin(cloud.wobble * 2) * 4;
      if (cloud.storm) {
        drawPuff(cloud.x, cloud.y + bob, cloud.radius / 34, PALETTE.stormDark, 0.95);
        drawPuff(cloud.x, cloud.y + bob - 8, cloud.radius / 44, PALETTE.storm, 0.95);
        // Lightning zigzag under the storm cloud.
        ctx.strokeStyle = '#ffe66d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cloud.x - 4, cloud.y + cloud.radius * 0.7);
        ctx.lineTo(cloud.x + 6, cloud.y + cloud.radius * 0.7 + 12);
        ctx.lineTo(cloud.x - 2, cloud.y + cloud.radius * 0.7 + 22);
        ctx.stroke();
      } else {
        drawPuff(cloud.x, cloud.y + bob, cloud.radius / 34, PALETTE.cloud, 0.9);
      }
    }
  }

  function drawBirds(state) {
    ctx.strokeStyle = PALETTE.bird;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const bird of state.birds) {
      const flap = Math.sin(bird.phase) * 7;
      ctx.beginPath();
      ctx.moveTo(bird.x - 14, bird.y - flap);
      ctx.quadraticCurveTo(bird.x - 4, bird.y + 4, bird.x, bird.y);
      ctx.quadraticCurveTo(bird.x + 4, bird.y + 4, bird.x + 14, bird.y - flap);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  function drawPlane(state) {
    const plane = state.plane;
    // Paper trail ribbon.
    if (plane.trail.length > 1) {
      for (let i = 1; i < plane.trail.length; i += 1) {
        const a = 1 - i / plane.trail.length;
        ctx.strokeStyle = `rgba(255,248,231,${a * 0.55})`;
        ctx.lineWidth = 10 * a + 1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(plane.trail[i - 1].x, plane.trail[i - 1].y);
        ctx.lineTo(plane.trail[i].x, plane.trail[i].y);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    const blink = plane.invulnerable > 0 && Math.floor(state.time * 12) % 2 === 0;
    ctx.save();
    ctx.translate(plane.x, plane.y);
    ctx.rotate(plane.angle);
    ctx.globalAlpha = blink ? 0.35 : 1;
    if (plane.boosting) {
      ctx.fillStyle = 'rgba(255,140,66,0.7)';
      ctx.beginPath();
      ctx.moveTo(-16, -4);
      ctx.lineTo(-30 - Math.random() * 10, 0);
      ctx.lineTo(-16, 4);
      ctx.closePath();
      ctx.fill();
    }
    // Cream paper dart with fold lines.
    ctx.fillStyle = PALETTE.plane;
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.lineTo(-16, -14);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-16, 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.planeFold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.lineTo(-8, 0);
    ctx.moveTo(10, -6);
    ctx.lineTo(-12, -12);
    ctx.moveTo(10, 6);
    ctx.lineTo(-12, 12);
    ctx.stroke();
    if (plane.shield && !plane.shieldUsed) {
      ctx.strokeStyle = 'rgba(186,230,253,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawParticles(state) {
    for (const p of state.particles.list) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      circle(p.x, p.y, p.size, p.colour);
    }
    ctx.globalAlpha = 1;
    for (const t of state.particles.labels) {
      if (!t.active) continue;
      ctx.globalAlpha = Math.max(0, t.life / t.max);
      ctx.font = `800 16px ${FONT}`;
      ctx.fillStyle = t.colour;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.value, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state) {
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(0, 0, FIELD.width, 54);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(0, 54, FIELD.width, 3);
    text(`LEG ${Math.max(1, state.leg)}/${LEGS_TOTAL}`, 80, 28, 20, PALETTE.text, 'center', 800);
    text(`SCORE ${state.score}`, 250, 28, 20, PALETTE.text, 'center', 800);
    // Lift bar.
    text('LIFT', 400, 28, 14, PALETTE.muted, 'center', 700);
    ctx.fillStyle = '#dbe7f3';
    ctx.fillRect(430, 17, 150, 20);
    const frac = state.lift / state.liftMax;
    ctx.fillStyle = frac > 0.3 ? PALETTE.lift : PALETTE.danger;
    ctx.fillRect(430, 17, 150 * frac, 20);
    text(`${Math.ceil(state.lift)}`, 505, 28, 14, '#ffffff', 'center', 800);
    // Folds: three little paper planes.
    text('FOLDS', 630, 28, 14, PALETTE.muted, 'center', 700);
    for (let i = 0; i < 3; i += 1) {
      const x = 680 + i * 30;
      ctx.globalAlpha = i < state.plane.folds ? 1 : 0.25;
      ctx.fillStyle = i < state.plane.folds ? '#e8b04b' : '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(x + 10, 28);
      ctx.lineTo(x - 8, 20);
      ctx.lineTo(x - 4, 28);
      ctx.lineTo(x - 8, 36);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    text(`★ ${state.stars}`, 800, 28, 18, '#b45309', 'center', 700);
    // Distance progress to the Far Island.
    const progress = ((Math.max(1, state.leg) - 1) * RINGS_PER_LEG + state.ringsPassed) / (LEGS_TOTAL * RINGS_PER_LEG);
    text('FAR ISLAND', 1000, 16, 11, PALETTE.muted, 'center', 700);
    ctx.fillStyle = '#dbe7f3';
    ctx.fillRect(900, 24, 200, 12);
    ctx.fillStyle = PALETTE.lift;
    ctx.fillRect(900, 24, 200 * progress, 12);
    text('🏝', 1112, 28, 18, PALETTE.text, 'center', 800);
    // Boost meter + wind indicator.
    text('BOOST', 1160, 16, 11, PALETTE.muted, 'center', 700);
    ctx.fillStyle = '#dbe7f3';
    ctx.fillRect(1130, 24, 60, 12);
    ctx.fillStyle = state.plane.boosting ? PALETTE.boost : '#fbbf24';
    ctx.fillRect(1130, 24, 60 * (state.plane.boost / 100), 12);
    const wind = state.wind;
    if (wind.active > 0) {
      text(wind.dir > 0 ? 'WIND ➤➤' : '◀◀ WIND', 1230, 44, 14, PALETTE.danger, 'center', 800);
    }
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.fill();
    ctx.stroke();
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(126,200,247,0.25)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Paper dart emblem, drawn like the in-game plane: the ✈ glyph renders
    // as a jet silhouette in headless Chrome, which is the wrong aircraft.
    ctx.save();
    ctx.translate(640, 132);
    ctx.rotate(-0.12);
    ctx.scale(2.4, 2.4);
    ctx.fillStyle = PALETTE.plane;
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.lineTo(-16, -14);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-16, 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.planeFold;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.lineTo(-8, 0);
    ctx.moveTo(10, -6);
    ctx.lineTo(-12, -12);
    ctx.moveTo(10, 6);
    ctx.lineTo(-12, 12);
    ctx.stroke();
    ctx.restore();
    text('PAPER PILOT', 640, 225, 76, PALETTE.text, 'center', 800);
    text('Fold, fly, and reach the Far Island.', 640, 285, 27, '#1e3a5f', 'center', 600);
    // One how-to card: the description and the controls share a panel, so
    // drifting clouds can never cross the text.
    panel(230, 308, 820, 199);
    text('Fly through the orange rings to keep your lift up. Dodge storm clouds', 640, 336, 19, PALETTE.muted, 'center', 600);
    text('and birds — each hit tears a fold. Ten legs stand between you and the island.', 640, 362, 19, PALETTE.muted, 'center', 600);
    text('Mouse — steer (plane follows)      WASD / arrows — steer too', 640, 422, 17, PALETTE.text, 'center', 600);
    text('Hold click / Space — boost      P — pause      M — mute', 640, 452, 17, PALETTE.text, 'center', 600);
    text('Lift 0 = stall, lose a fold. 3 folds gone = crash into the sea.', 640, 484, 17, PALETTE.text, 'center', 600);
    if (best > 0) text(`BEST SCORE ${best}`, 640, 540, 20, '#b45309', 'center', 800);
    text('▶  CLICK OR PRESS ENTER TO FLY', 640, 600, 24, '#b45309', 'center', 800);
  }

  function drawFold(state) {
    ctx.fillStyle = 'rgba(126,200,247,0.35)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(`LEG ${state.leg} COMPLETE`, 640, 115, 40, PALETTE.text, 'center', 800);
    text(`Score ${state.score}  •  Stars ${state.stars}  •  Folds ${state.plane.folds}/3  •  Lift ${Math.ceil(state.lift)}/${state.liftMax}`, 640, 160, 20, PALETTE.muted, 'center', 600);
    text('FOLD A NEW TRICK — click a card, or press 1, 2 or 3', 640, 205, 22, '#b45309', 'center', 700);
    const cards = state.choices;
    const w = 280;
    const gap = 30;
    const total = cards.length * w + (cards.length - 1) * gap;
    let x = 640 - total / 2;
    for (let i = 0; i < cards.length; i += 1) {
      const card = cards[i];
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x, 245, w, 260, 16);
      ctx.fill();
      ctx.stroke();
      text(card.icon, x + w / 2, 305, 52, '#e8b04b', 'center', 800);
      text(card.name, x + w / 2, 372, 24, PALETTE.text, 'center', 800);
      const words = card.text.split(' ');
      let line = '';
      let ly = 420;
      for (const word of words) {
        if ((line + ' ' + word).trim().length > 22) {
          text(line.trim(), x + w / 2, ly, 17, PALETTE.muted, 'center', 600);
          line = word;
          ly += 24;
        } else {
          line += ' ' + word;
        }
      }
      text(line.trim(), x + w / 2, ly, 17, PALETTE.muted, 'center', 600);
      text(`[${i + 1}]`, x + w / 2, 478, 18, '#b45309', 'center', 800);
      x += w + gap;
    }
    text('The next leg starts the moment you choose.', 640, 570, 18, PALETTE.muted, 'center', 600);
  }

  function drawOver(state, best) {
    ctx.fillStyle = state.won ? 'rgba(255,243,196,0.45)' : 'rgba(30,58,95,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (state.won) {
      text('🏝', 640, 165, 72, PALETTE.text, 'center', 800);
      text('THE FAR ISLAND!', 640, 250, 64, PALETTE.text, 'center', 800);
      text('Ten legs, one paper plane — you landed it. The island is yours.', 640, 305, 22, '#1e3a5f', 'center', 600);
    } else {
      text('🌊', 640, 165, 72, PALETTE.text, 'center', 800);
      text('CRASHED INTO THE SEA', 640, 250, 60, PALETTE.text, 'center', 800);
      text('The plane went down… but paper folds again. Try another flight.', 640, 305, 22, '#1e3a5f', 'center', 600);
    }
    panel(440, 350, 400, 150);
    text(`SCORE  ${state.score}`, 640, 385, 26, PALETTE.text, 'center', 800);
    text(`Legs flown  ${state.won ? 10 : Math.max(0, state.leg - 1)} / 10      Stars  ${state.stars}`, 640, 425, 18, PALETTE.muted, 'center', 600);
    text(`BEST SCORE  ${Math.max(best, state.score)}`, 640, 465, 20, '#b45309', 'center', 800);
    text('▶  PRESS R OR CLICK TO FLY AGAIN', 640, 560, 24, '#b45309', 'center', 800);
  }

  return {
    draw(state, screen, best, dt) {
      const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, FIELD.width, FIELD.height);
      ctx.save();
      if (state.shake > 0) {
        ctx.translate((Math.random() - 0.5) * state.shake * 14, (Math.random() - 0.5) * state.shake * 14);
      }
      drawBackground(state, dt);
      drawRing(state);
      drawStars(state);
      drawClouds(state);
      drawBirds(state);
      drawPlane(state);
      drawParticles(state);
      ctx.restore();
      if (state.flash > 0) {
        ctx.fillStyle = `rgba(230,57,70,${state.flash * 0.2})`;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      }
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_FOLD) drawHud(state);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_FOLD) drawFold(state);
      else if (screen === SCREEN_OVER) drawOver(state, best);
      else if (screen === SCREEN_PAUSED) {
        ctx.fillStyle = 'rgba(30,58,95,0.55)';
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
        text('PAUSED', 640, 300, 54, '#ffffff', 'center', 800);
        text('P / Esc to resume  •  M to mute  •  R to restart', 640, 360, 20, '#ffffff', 'center', 600);
      }
    },
  };
}
