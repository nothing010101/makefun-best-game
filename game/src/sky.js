// The sky: rings to fly through, storm clouds and birds to dodge, stars to
// collect, wind that pushes the plane, and the ten legs to the Far Island.
// The sky knows nothing about screens or drawing; it steps the simulation and
// reports what happened as event bits the loop turns into sound and screens.
import { FIELD, LEG, LEGS_TOTAL, LIFT, PLANE, RINGS_PER_LEG, SCORE } from './config.js';
import { createPlane, movePlane } from './plane.js';
import { rollFoldChoices } from './folds.js';
import { createParticles } from './particles.js';

export const EVENT_RING = 1;
export const EVENT_STAR = 2;
export const EVENT_HIT = 4;
export const EVENT_LEG_CLEAR = 8;
export const EVENT_OVER = 16;
export const EVENT_WIN = 32;
export const EVENT_STALL = 64;
export const EVENT_GUST = 128;
export const EVENT_SHIELD = 256;

export function createSky(random) {
  const state = {
    random,
    time: 0,
    leg: 0,
    score: 0,
    stars: 0,
    lift: LIFT.max,
    liftMax: LIFT.max,
    ringsPassed: 0,
    ring: null,
    clouds: [],
    birds: [],
    starDrops: [],
    plane: createPlane(),
    particles: createParticles(),
    choices: [],
    cloudTimer: 0,
    birdTimer: 0,
    starTimer: 0,
    wind: { x: 0, y: 0, gustTimer: 4, active: 0, dir: 1 },
    shake: 0,
    flash: 0,
    won: false,
    over: false,
    legActive: false,
    distance: 0,
  };
  return { state, reset, step, startLeg, chooseFold };

  function reset() {
    state.time = 0;
    state.leg = 0;
    state.score = 0;
    state.stars = 0;
    state.lift = LIFT.max;
    state.liftMax = LIFT.max;
    state.ringsPassed = 0;
    state.ring = null;
    state.clouds.length = 0;
    state.birds.length = 0;
    state.starDrops.length = 0;
    state.plane = createPlane();
    state.particles.clear();
    state.choices = [];
    state.cloudTimer = 0;
    state.birdTimer = 0;
    state.starTimer = 0;
    state.wind = { x: 0, y: 0, gustTimer: 4, active: 0, dir: 1 };
    state.shake = 0;
    state.flash = 0;
    state.won = false;
    state.over = false;
    state.legActive = false;
    state.distance = 0;
  }

  function spawnRing() {
    const leg = Math.max(1, state.leg);
    state.ring = {
      x: FIELD.width - 120 - state.random() * 120,
      y: 140 + state.random() * 420,
      radius: LEG.ringRadius(leg),
      wobble: state.random() * Math.PI * 2,
    };
  }

  function startLeg() {
    state.leg += 1;
    state.ringsPassed = 0;
    state.plane.shieldUsed = false;
    state.cloudTimer = 1.2;
    state.birdTimer = 2.0;
    state.starTimer = 0.5;
    state.legActive = true;
    spawnRing();
  }

  function chooseFold(index) {
    const fold = state.choices[index];
    if (!fold) return null;
    fold.apply(state.plane, state);
    state.choices = [];
    return fold;
  }

  function loseFold(reason) {
    const plane = state.plane;
    if (plane.shield && !plane.shieldUsed) {
      plane.shieldUsed = true;
      plane.invulnerable = 2;
      state.particles.burst(plane.x, plane.y, '#bae6fd', 20, 260);
      return EVENT_SHIELD;
    }
    plane.folds -= 1;
    plane.stun = 1.0;
    plane.invulnerable = 2.2;
    plane.vx = -220;
    plane.vy = -80;
    state.shake = 1;
    state.flash = 1;
    state.particles.burst(plane.x, plane.y, '#e63946', 24, 300);
    if (plane.folds <= 0) {
      plane.folds = 0;
      state.over = true;
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function updateWind(dt) {
    const wind = state.wind;
    const leg = Math.max(1, state.leg);
    if (wind.active > 0) {
      wind.active -= dt;
      const strength = LEG.windStrength(leg) * (wind.active > 0.4 ? 1 : wind.active / 0.4);
      wind.x = wind.dir * strength;
      wind.y = Math.sin(state.time * 1.3) * strength * 0.25;
      if (state.random() < dt * 22) {
        state.particles.streak(
          state.random() * FIELD.width, 80 + state.random() * 520,
          wind.dir * (260 + strength), 0, 'rgba(255,255,255,0.7)',
        );
      }
      if (wind.active <= 0) { wind.x = 0; wind.y = 0; wind.gustTimer = 5 + state.random() * 4; }
    } else {
      wind.gustTimer -= dt;
      wind.x = 0;
      wind.y = 0;
      if (wind.gustTimer <= 0) {
        wind.dir = state.random() < 0.5 ? -1 : 1;
        wind.active = 2 + state.random() * 1.5;
        return EVENT_GUST;
      }
    }
    return 0;
  }

  // Advance the simulation one fixed step. `attract` runs the ambient
  // title-screen drift with no plane control.
  function step(dt, input, attract) {
    let events = 0;
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 2.2);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 2.5);
    state.particles.step(dt);
    const plane = state.plane;

    if (attract) {
      if (state.clouds.length < 4 && state.random() < dt * 0.5) {
        state.clouds.push(makeCloud(false));
      }
      driftHazards(dt);
      return events;
    }

    events |= updateWind(dt);
    movePlane(plane, input, state.wind, dt);

    // Lift drains steadily, faster while boosting; a ring or star tops it up.
    const boosting = plane.boosting;
    state.lift -= (LIFT.drain + (boosting ? LIFT.boostExtraDrain : 0)) * dt;
    if (state.lift <= 0) {
      state.lift = LIFT.stallRestore;
      events |= EVENT_STALL | loseFold('stall');
      if (state.over) return events;
    }

    if (state.legActive) {
      state.distance += (60 + Math.hypot(plane.vx, plane.vy) * 0.12) * dt;
      spawnHazards(dt);
      // Ring: fly through the glowing hoop.
      const ring = state.ring;
      if (ring) {
        ring.wobble += dt;
        ring.x -= 26 * dt;
        const dx = plane.x - ring.x;
        const dy = plane.y - (ring.y + Math.sin(ring.wobble * 1.6) * 14);
        if (dx * dx + dy * dy < (ring.radius + 6) * (ring.radius + 6)) {
          state.ringsPassed += 1;
          state.score += SCORE.ring;
          state.lift = Math.min(state.liftMax, state.lift + LIFT.ringRestore);
          state.particles.burst(ring.x, ring.y, '#ffb703', 26, 300);
          state.particles.floatText(ring.x, ring.y - 30, `+${SCORE.ring}`, '#ff8c42');
          events |= EVENT_RING;
          if (state.ringsPassed >= RINGS_PER_LEG) {
            state.legActive = false;
            state.ring = null;
            state.score += SCORE.legClear;
            events |= EVENT_LEG_CLEAR;
            if (state.leg >= LEGS_TOTAL) {
              state.won = true;
              events |= EVENT_WIN;
            } else {
              state.choices = rollFoldChoices(state.random, 3);
            }
          } else {
            spawnRing();
          }
        } else if (ring.x < -80) {
          spawnRing();
        }
      }
    }

    driftHazards(dt);
    events |= collectStars(dt);

    // Storm clouds and birds: a hit costs a fold (unless shielded / invulnerable).
    if (plane.invulnerable <= 0 && plane.stun <= 0) {
      for (let i = state.clouds.length - 1; i >= 0; i -= 1) {
        const cloud = state.clouds[i];
        if (cloud.storm && hitPlane(cloud.x, cloud.y, cloud.radius)) {
          events |= loseFold('cloud');
          state.clouds.splice(i, 1);
          break;
        }
      }
      if (!state.over) {
        for (let i = state.birds.length - 1; i >= 0; i -= 1) {
          const bird = state.birds[i];
          if (hitPlane(bird.x, bird.y, 20)) {
            events |= loseFold('bird');
            state.birds.splice(i, 1);
            break;
          }
        }
      }
    }
    return events;
  }

  function hitPlane(x, y, radius) {
    const dx = state.plane.x - x;
    const dy = state.plane.y - y;
    const r = radius * 0.7 + PLANE.radius * 0.7;
    return dx * dx + dy * dy < r * r;
  }

  function makeCloud(storm) {
    const leg = Math.max(1, state.leg);
    return {
      x: FIELD.width + 90,
      y: 110 + state.random() * 480,
      radius: storm ? 34 + state.random() * 22 : 40 + state.random() * 40,
      speed: storm ? LEG.cloudSpeed(leg) : 26 + state.random() * 22,
      storm,
      wobble: state.random() * Math.PI * 2,
    };
  }

  function spawnHazards(dt) {
    const leg = Math.max(1, state.leg);
    state.cloudTimer -= dt;
    if (state.cloudTimer <= 0) {
      state.cloudTimer = LEG.cloudInterval(leg) * (0.8 + state.random() * 0.4);
      state.clouds.push(makeCloud(state.random() < 0.45 + leg * 0.03));
    }
    state.birdTimer -= dt;
    if (state.birdTimer <= 0 && leg >= 2) {
      state.birdTimer = LEG.birdInterval(leg) * (0.8 + state.random() * 0.4);
      state.birds.push({
        x: FIELD.width + 40,
        y: 120 + state.random() * 460,
        speed: LEG.birdSpeed(leg),
        phase: state.random() * Math.PI * 2,
      });
    }
    state.starTimer -= dt;
    if (state.starTimer <= 0) {
      state.starTimer = LEG.starInterval * (0.8 + state.random() * 0.5);
      state.starDrops.push({
        x: FIELD.width + 30,
        y: 120 + state.random() * 480,
        vx: 40 + state.random() * 30,
        phase: state.random() * Math.PI * 2,
      });
    }
  }

  function driftHazards(dt) {
    const windX = state.wind.x * 0.4;
    for (let i = state.clouds.length - 1; i >= 0; i -= 1) {
      const cloud = state.clouds[i];
      cloud.x -= (cloud.speed + windX) * dt;
      cloud.wobble += dt;
      if (cloud.x < -140) state.clouds.splice(i, 1);
    }
    for (let i = state.birds.length - 1; i >= 0; i -= 1) {
      const bird = state.birds[i];
      bird.x -= (bird.speed + windX) * dt;
      bird.phase += dt * 6;
      bird.y += Math.sin(bird.phase) * 26 * dt;
      if (bird.x < -60) state.birds.splice(i, 1);
    }
    for (let i = state.starDrops.length - 1; i >= 0; i -= 1) {
      const star = state.starDrops[i];
      star.x -= (star.vx + windX) * dt;
      star.phase += dt * 3;
      if (star.x < -40) state.starDrops.splice(i, 1);
    }
  }

  function collectStars(dt) {
    let events = 0;
    const plane = state.plane;
    for (let i = state.starDrops.length - 1; i >= 0; i -= 1) {
      const star = state.starDrops[i];
      const dx = plane.x - star.x;
      const dy = plane.y - star.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (plane.starMagnet > 0 && dist < plane.starMagnet) {
        star.x += (dx / dist) * 300 * dt;
        star.y += (dy / dist) * 300 * dt;
      }
      if (dist < PLANE.radius + 20) {
        state.starDrops.splice(i, 1);
        state.stars += 1;
        const value = plane.twinTrail ? SCORE.star * 2 : SCORE.star;
        state.score += value;
        state.lift = Math.min(state.liftMax, state.lift + LIFT.starRestore);
        state.particles.burst(star.x, star.y, '#ffd60a', 10, 200);
        state.particles.floatText(star.x, star.y - 14, `+${value}`, '#ffd60a');
        events |= EVENT_STAR;
      }
    }
    return events;
  }
}
