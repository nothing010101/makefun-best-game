// Boot and the one loop: input is read every frame, the sky advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play,
// fold choice, paused and game over.
//
// ?seed=N fixes the sky's pattern. ?shot=title|play|fold|results (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createSky, EVENT_GUST, EVENT_HIT, EVENT_LEG_CLEAR, EVENT_OVER, EVENT_RING, EVENT_SHIELD, EVENT_STALL, EVENT_STAR, EVENT_WIN } from './sky.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_FOLD, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const sky = createSky(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, sky);
  let painted = 0;
  function paint() {
    renderer.draw(sky.state, scene.screen, scene.best, STEP);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startFlight() {
    sky.reset();
    sky.startLeg();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.click();
    announce('Flying. Reach the Far Island in 10 legs.');
  }

  function endFlight() {
    screen = SCREEN_OVER;
    if (sky.state.score > best) {
      best = sky.state.score;
      saveBest(best);
    }
    if (sky.state.won) audio.win();
    else audio.lose();
    announce(sky.state.won
      ? `Landed on the Far Island. Score ${sky.state.score}. Best ${best}.`
      : `Crashed. Score ${sky.state.score}. Best ${best}.`);
  }

  function handleEvents(events) {
    if (events & EVENT_RING) audio.ring();
    if (events & EVENT_STAR) audio.star();
    if (events & EVENT_GUST) audio.gust();
    if (events & EVENT_SHIELD) audio.click();
    if (events & EVENT_STALL) { audio.stall(); announce('Stall! Lift ran out — a fold is torn.'); }
    if (events & EVENT_HIT) {
      audio.hit();
      announce(`Hit! ${sky.state.plane.folds} folds left.`);
    }
    if (events & EVENT_LEG_CLEAR) {
      audio.ring();
      announce(`Leg ${sky.state.leg} complete. Choose a fold.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      audio.toggleMute();
      announce(audio.muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if ((actions & (ACTION_CONFIRM | ACTION_RESTART)) || (screen === SCREEN_OVER && (actions & ACTION_CONFIRM))) {
        audio.unlock();
        startFlight();
      }
      return;
    }
    if (screen === SCREEN_FOLD) {
      const choice = input.takeChoice();
      if (choice >= 1 && choice <= sky.state.choices.length) {
        pickFold(choice - 1);
        return;
      }
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
      return;
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Flying.');
      } else if (actions & ACTION_RESTART) {
        startFlight();
      }
    }
  }

  function pickFold(index) {
    const fold = sky.chooseFold(index);
    if (!fold) return;
    audio.unlock();
    audio.click();
    announce(`Folded ${fold.name}. Leg ${sky.state.leg + 1} begins.`);
    sky.startLeg();
    screen = SCREEN_PLAY;
  }

  function handleFoldClick(event) {
    if (screen !== SCREEN_FOLD) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 1280;
    const y = ((event.clientY - rect.top) / rect.height) * 720;
    if (y < 245 || y > 505) return;
    const cards = sky.state.choices;
    const w = 280;
    const gap = 30;
    const total = cards.length * w + (cards.length - 1) * gap;
    let cx = 640 - total / 2;
    for (let i = 0; i < cards.length; i += 1) {
      if (x >= cx && x <= cx + w) { pickFold(i); return; }
      cx += w + gap;
    }
  }
  canvas.addEventListener('click', handleFoldClick);

  function step() {
    if (screen === SCREEN_TITLE) {
      sky.step(STEP, null, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const move = input.direction();
    const events = sky.step(STEP, { mouse: input.mouse, move, boosting: () => input.boosting() }, false);
    handleEvents(events);
    if (events & EVENT_WIN) endFlight();
    else if (events & EVENT_OVER) endFlight();
    else if (events & EVENT_LEG_CLEAR) screen = SCREEN_FOLD;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(sky.state, screen, best, Math.min(0.05, accumulator + STEP));
  }

  frame(last);
}

if (shot) runShot(shot);
else runGame();
