# Paper Pilot — Fold, fly, and reach the Far Island

A paper plane flies across a bright sky toward the Far Island. Steer with the
mouse (the plane follows the cursor with smooth inertia) or WASD / arrows;
hold click or Space to boost. Fly through glowing sky-rings to restore lift,
collect stars, and dodge storm clouds and birds. Lift drains steadily — fly
through a ring before it runs out, or the plane stalls and tears a fold.

- **10 legs** to the Far Island. Each leg: fly through 5 rings.
- **3 folds** (lives). A storm cloud or bird hit — or a stall — costs one.
- **Between legs**, fold a new trick: choose 1 of 3 cards (Wide Wings, Sharp
  Fold, Star Magnet, Storm Shield, Twin Trail, Steady Hands).
- **Wind gusts** push the plane sideways, stronger in later legs; rings get
  narrower and the sky busier.
- **Win** by landing on the Far Island after leg 10; **lose** by crashing
  into the sea with no folds left.

## Controls

| Input | Action |
| --- | --- |
| Mouse | Steer (plane follows the cursor) |
| WASD / arrows | Steer |
| Hold click / Space | Boost (drains the boost meter, burns lift faster) |
| P / Esc | Pause |
| M | Mute |
| Enter / click | Start, restart |
| R | Restart from an end screen |
| 1 / 2 / 3 or click | Pick a fold card |

## Files

- `game/index.html` — the page, canvas only.
- `game/src/main.js` — boot, the fixed-step loop, screens.
- `game/src/config.js` — every tuning number and colour.
- `game/src/random.js` — seeded RNG (repeatable screenshot scenes).
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — WebAudio synth sound, no audio files.
- `game/src/particles.js` — particles and floating score text.
- `game/src/sky.js` — the world: rings, clouds, birds, stars, wind, legs.
- `game/src/plane.js` — the paper plane: movement, boost, folds.
- `game/src/folds.js` — the between-leg fold (upgrade) cards.
- `game/src/render.js` — drawing: sky, sea, plane, HUD, screens.
- `game/src/shots.js` — the staged screenshot scenes (`?shot=`).
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes
  `dossier.json` with the vendored make.fun library.
- `serve.ts` — tiny static server for local play (`node serve.ts`).

## Play locally

```sh
node serve.ts
# open http://localhost:8080
```

Screenshots are staged renders of the game's own code:
`?shot=title|play|fold|results&seed=N`.
