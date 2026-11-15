// The paper plane: follows the mouse with smooth inertia, or flies with WASD /
// arrows. Holding click or Space boosts — faster, but it drains the boost meter
// and burns lift quicker. Folds are its lives; a hit or a stall costs one.
import { FIELD, PLANE } from './config.js';

export function createPlane() {
  return {
    x: 300,
    y: 360,
    vx: 0,
    vy: 0,
    angle: 0,
    boost: 100,
    boosting: false,
    folds: 3,
    stun: 0,
    invulnerable: 0,
    trail: [],
    // Upgrade-derived stats, changed by fold cards.
    speedBonus: 0,
    liftMaxBonus: 0,
    starMagnet: 0,
    twinTrail: false,
    steadyHands: false,
    shield: false,
    shieldUsed: false,
  };
}

export function movePlane(plane, input, wind, dt) {
  const wantBoost = typeof input.boosting === 'function' ? input.boosting() : !!input.boosting;
  const boosting = wantBoost && plane.boost > 0 && plane.stun <= 0;
  plane.boosting = boosting;
  if (boosting) {
    plane.boost = Math.max(0, plane.boost - PLANE.boostDrain * dt);
  } else {
    plane.boost = Math.min(100, plane.boost + PLANE.boostRegen * dt);
  }

  const maxSpeed = PLANE.maxSpeed * (1 + plane.speedBonus) * (boosting ? PLANE.boostMultiplier : 1);
  const hasKeys = typeof input.hasKeys === 'function' ? input.hasKeys() : false;
  let tx = 0;
  let ty = 0;
  if (plane.stun > 0) {
    plane.stun -= dt;
  } else if (hasKeys) {
    const dir = input.direction();
    tx = dir.x * maxSpeed;
    ty = dir.y * maxSpeed;
  } else {
    // Chase the cursor: the farther it is, the faster the plane leans in.
    const dx = input.mouse.x - plane.x;
    const dy = input.mouse.y - plane.y;
    const dist = Math.hypot(dx, dy);
    const reach = Math.min(dist * 4.5, maxSpeed);
    tx = dist > 4 ? (dx / dist) * reach : 0;
    ty = dist > 4 ? (dy / dist) * reach : 0;
  }
  const windX = plane.steadyHands ? wind.x * 0.45 : wind.x;
  const windY = plane.steadyHands ? wind.y * 0.45 : wind.y;
  tx += windX;
  ty += windY;

  const k = Math.min(1, PLANE.accel * dt / Math.max(1, maxSpeed));
  plane.vx += (tx - plane.vx) * Math.min(1, k * 3.2);
  plane.vy += (ty - plane.vy) * Math.min(1, k * 3.2);
  plane.x += plane.vx * dt;
  plane.y += plane.vy * dt;
  plane.x = Math.min(FIELD.width - 24, Math.max(24, plane.x));
  plane.y = Math.min(FIELD.height - 90, Math.max(70, plane.y));
  if (plane.x <= 24 || plane.x >= FIELD.width - 24) plane.vx = 0;
  if (plane.y <= 70 || plane.y >= FIELD.height - 90) plane.vy = 0;

  const targetAngle = Math.atan2(plane.vy, plane.vx);
  if (Math.hypot(plane.vx, plane.vy) > 40) {
    let diff = targetAngle - plane.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    plane.angle += diff * Math.min(1, dt * 10);
  }
  if (plane.invulnerable > 0) plane.invulnerable -= dt;

  // Paper trail: a fading ribbon of past positions.
  plane.trail.unshift({ x: plane.x, y: plane.y });
  if (plane.trail.length > 22) plane.trail.pop();
}
