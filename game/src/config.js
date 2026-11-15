// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends
// on the screen size. Palette: bright sky, cream paper plane, sunset-orange
// rings, white clouds, teal sea — readable at a glance even when shrunk.

export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const LEGS_TOTAL = 10;
export const RINGS_PER_LEG = 5;

export const PLANE = {
  radius: 18,
  maxSpeed: 380,
  accel: 2400,
  boostMultiplier: 1.6,
  boostDrain: 34,
  boostRegen: 13,
};

export const LIFT = {
  max: 100,
  drain: 2.0,
  boostExtraDrain: 2.6,
  ringRestore: 22,
  starRestore: 2,
  stallRestore: 55,
};

export const LEG = {
  // Rings get narrower and the sky busier as legs go on.
  ringRadius: (leg) => Math.max(38, 58 - leg * 2),
  cloudInterval: (leg) => Math.max(0.7, 1.9 - leg * 0.11),
  cloudSpeed: (leg) => 70 + leg * 9,
  birdInterval: (leg) => Math.max(1.4, 3.4 - leg * 0.2),
  birdSpeed: (leg) => 150 + leg * 12,
  starInterval: 1.1,
  windStrength: (leg) => 50 + leg * 14,
};

export const SCORE = { ring: 50, star: 10, legClear: 100 };

export const PALETTE = {
  skyTop: '#7ec8f7',
  skyMid: '#aee3fb',
  skyLow: '#ffe3b3',
  sun: '#ffd166',
  sunCore: '#fff3c4',
  ring: '#ff8c42',
  ringGlow: '#ffb703',
  cloud: '#ffffff',
  storm: '#5b6b8c',
  stormDark: '#3d4a68',
  bird: '#2b2d42',
  star: '#ffd60a',
  sea: '#0e7490',
  seaDeep: '#155e75',
  seaLight: '#67e8f9',
  plane: '#fff8e7',
  planeFold: '#e8b04b',
  trail: 'rgba(255,248,231,0.5)',
  text: '#1e3a5f',
  textLight: '#ffffff',
  muted: '#4a6b8a',
  panel: '#ffffff',
  panelEdge: '#ffb703',
  danger: '#e63946',
  lift: '#2a9d8f',
  boost: '#ff8c42',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const BEST_KEY = 'paper-pilot.best';
