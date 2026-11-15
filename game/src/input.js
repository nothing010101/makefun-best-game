// Keyboard and mouse input. The plane follows the mouse with inertia, or flies
// with WASD / arrows; holding the left button (or Space) boosts. P or Escape
// pauses, M mutes, Enter or click confirms, R restarts from an end screen.
// Keys 1-3 pick a fold card.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 640, y: 360, down: false, seen: false };
  let actions = 0;
  let choice = 0;

  function keyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Enter' || event.code === 'NumpadEnter') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
    if (event.code === 'KeyR') actions |= ACTION_RESTART;
    if (event.code === 'Space') event.preventDefault();
  }
  function keyUp(event) {
    keys.delete(event.code);
  }
  function trackMouse(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 1280;
    mouse.y = ((event.clientY - rect.top) / rect.height) * 720;
    mouse.seen = true;
  }
  function mouseDown(event) {
    trackMouse(event);
    if (event.button === 0) { mouse.down = true; actions |= ACTION_CONFIRM; }
    event.preventDefault();
  }
  function mouseUp(event) {
    if (event.button === 0) mouse.down = false;
  }
  function blur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', blur);
  canvas.addEventListener('mousemove', trackMouse);
  canvas.addEventListener('mousedown', mouseDown);
  window.addEventListener('mouseup', mouseUp);

  return {
    mouse,
    boosting() {
      return mouse.down || keys.has('Space');
    },
    direction() {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        const move = MOVE_KEYS[code];
        if (move) { x += move[0]; y += move[1]; }
      }
      if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
    hasKeys() {
      return keys.size > 0;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeChoice() {
      const taken = choice;
      choice = 0;
      return taken;
    },
    setChoice(value) { choice = value; },
  };
}
