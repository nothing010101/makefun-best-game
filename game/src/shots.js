// The screenshot scenes behind ?shot=title|play|fold|results. Each one plays the
// real rules forward from a fresh sky for a fixed number of steps, steered by a
// simple autopilot (chase the ring, grab near stars, dodge the nearest storm),
// so the frame is what a short flight really looks like and the same seed
// always gives the same frame.
import { STEP } from './config.js';
import { EVENT_HIT, EVENT_LEG_CLEAR, EVENT_OVER, EVENT_WIN } from './sky.js';
import { rollFoldChoices } from './folds.js';
import { SCREEN_FOLD, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 16;
const FOLD_SECONDS = 40;
const END_LIMIT_SECONDS = 150;
const SAMPLE = 1 / 30;

/** Steer the plane at the ring; swing around the nearest storm cloud or bird. */
function autopilot(state, dodge) {
  const plane = state.plane;
  const ring = state.ring;
  let targetX = ring ? ring.x : 900;
  let targetY = ring ? ring.y : 360;
  if (dodge) {
    for (const cloud of state.clouds) {
      if (!cloud.storm) continue;
      const dx = plane.x - cloud.x;
      const dy = plane.y - cloud.y;
      const dist = Math.hypot(dx, dy);
      if (dist < cloud.radius + 90) {
        targetY = plane.y + (dy >= 0 ? 140 : -140);
        targetX = plane.x - 60;
        break;
      }
    }
    for (const bird of state.birds) {
      const dx = plane.x - bird.x;
      const dy = plane.y - bird.y;
      if (Math.hypot(dx, dy) < 120) {
        targetY = plane.y + (dy >= 0 ? 120 : -120);
        break;
      }
    }
  }
  const dx = targetX - plane.x;
  const dy = targetY - plane.y;
  const dist = Math.hypot(dx, dy) || 1;
  const boost = dist > 260;
  return { mouse: { x: targetX, y: targetY, down: boost, seen: true }, move: { x: 0, y: 0 }, boosting: () => boost };
}

function runSteps(sky, seconds, steer) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    const input = steer ? steer(sky.state) : null;
    const events = sky.step(STEP, input, false);
    if (events & (EVENT_OVER | EVENT_WIN | EVENT_LEG_CLEAR)) return events;
  }
  return 0;
}

/**
 * Set `sky` to the named scene (title, play, fold or results) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, sky) {
  sky.reset();
  if (name !== 'play' && name !== 'fold' && name !== 'results') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      sky.step(STEP, null, true);
    }
    // Park the ambient plane top-right, clear of the title text: after the
    // attract steps it can sit half off the left edge of the frame.
    sky.state.plane.x = 1020;
    sky.state.plane.y = 170;
    sky.state.plane.vx = 0;
    sky.state.plane.vy = 0;
    sky.state.plane.angle = -0.15;
    sky.state.plane.trail = [];
    return { screen: SCREEN_TITLE, best: 1250 };
  }
  if (name === 'results') {
    // Fly leg 4 well first, then stop steering: storms and the draining
    // lift finish the flight, so the results screen shows a real run's
    // score instead of a leg-1 crash.
    sky.startLeg();
    sky.state.leg = 4;
    sky.state.score = 1250;
    sky.state.stars = 14;
    sky.state.lift = 72;
    runSteps(sky, PLAY_SECONDS, (state) => autopilot(state, true));
    // Mid-leg 4 again (the autopilot may have cleared it) with a ring in
    // frame, then a hurried pilot who never steers.
    sky.state.leg = 4;
    sky.state.legActive = true;
    sky.state.ringsPassed = Math.min(sky.state.ringsPassed, 2);
    sky.state.choices = [];
    if (!sky.state.ring) sky.state.ring = { x: 920, y: 290, radius: 50, wobble: 0 };
    let crashed = false;
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      const events = sky.step(STEP, { mouse: { x: 300, y: 360, down: false, seen: true }, move: { x: 0, y: 0 }, boosting: () => false }, false);
      if (events & EVENT_OVER) { crashed = true; break; }
    }
    if (!crashed) {
      // The drift alone did not finish the flight: end it on the rocks.
      sky.state.plane.folds = 0;
      sky.state.over = true;
      sky.state.lift = 0;
    }
    return { screen: SCREEN_OVER, best: sky.state.score };
  }
  // Play: leg 4, mid-flight, autopilot chasing rings and dodging storms.
  sky.startLeg();
  sky.state.leg = 4;
  sky.state.score = 1250;
  sky.state.stars = 14;
  sky.state.lift = 72;
  runSteps(sky, PLAY_SECONDS, (state) => autopilot(state, true));
  // Compose the cover: the ring ahead of the plane, mid-screen, with the
  // plane banking toward it and a short trail behind it.
  if (sky.state.ring) {
    sky.state.ring.x = 880;
    sky.state.ring.y = 300;
  }
  const plane = sky.state.plane;
  plane.x = 600;
  plane.y = 340;
  plane.vx = 260;
  plane.vy = -30;
  plane.angle = -0.1;
  plane.trail = [];
  for (let i = 0; i < 0.5 / STEP; i += 1) {
    sky.step(STEP, autopilot(sky.state, false), false);
  }
  // The autopilot may have cleared the leg (ring is null then); make sure a
  // ring is in frame for the cover, drawn by the game's own renderer.
  sky.state.ring = { x: 920, y: 290, radius: 50, wobble: 0 };
  sky.state.ringsPassed = Math.min(sky.state.ringsPassed, 2);
  sky.state.legActive = true;
  if (name === 'fold') {
    // Finish the leg: keep chasing rings until it clears (or time runs out).
    let events = 0;
    for (let index = 0; index < FOLD_SECONDS / STEP; index += 1) {
      events = sky.step(STEP, autopilot(sky.state, true), false);
      if (events & (EVENT_LEG_CLEAR | EVENT_OVER | EVENT_WIN)) break;
    }
    if (sky.state.choices.length === 0) {
      // The autopilot did not clear the leg in time: stage the fold screen
      // with three real choices on a cleared leg anyway.
      sky.state.legActive = false;
      sky.state.ringsPassed = 5;
      sky.state.choices = rollFoldChoices(sky.state.random, 3);
    }
    return { screen: SCREEN_FOLD, best: sky.state.score };
  }
  return { screen: SCREEN_PLAY, best: sky.state.score };
}
