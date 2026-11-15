# Paper Pilot — best-game-01 entry (build + verify only, NOT pushed, NOT submitted)

## What happened first

- The Emberfall build was STOPPED mid-session on the parent agent's order
  (01:17 WIB): the official leaderboard showed the ember/flame/lantern theme
  saturating the top 10 and the name "Emberfall" already taken by two paid
  entries. All Emberfall code was deleted (`game/src/*.js` removed); the repo
  scaffolding (LICENSE, serve.ts, vendor/makefun-game.ts, .makefun/owner.json)
  was kept.
- Rebuilt from scratch as **Paper Pilot — "Fold, fly, and reach the Far
  Island"**. No ember, flame, lantern, wisp or gloom anywhere.

## What was built

A paper plane flies across a bright sky toward the Far Island. Steer with the
mouse (plane follows the cursor with inertia) or WASD/arrows; hold click or
Space to boost (drains the boost meter, burns lift faster). Fly through 5
glowing sky-rings per leg to restore lift and score; collect stars; dodge
storm clouds and birds (a hit costs one of 3 folds and stuns briefly). Lift
drains steadily — at 0 the plane stalls and tears a fold. Lose all 3 folds =
crash into the sea (game over). Clear leg 10 = land on the Far Island
(victory). Between legs, choose 1 of 3 fold-upgrade cards. Wind gusts push
the plane sideways (visible streaks + HUD wind indicator), stronger in later
legs; rings narrow and hazards multiply. Vanilla JS canvas 2D, no libraries,
no network, procedural art + WebAudio synth sound (audio starts only after
first interaction). Palette: bright sky blue, cream plane, sunset-orange
rings, white clouds, teal sea.

### Files

- `game/index.html` — page, canvas only.
- `game/src/main.js` — boot, fixed-step loop, screens (title/play/fold/paused/over).
- `game/src/config.js` — every tuning number and colour.
- `game/src/random.js` — seeded RNG (mulberry32).
- `game/src/input.js` — keyboard + mouse (steer, boost, pause, mute, restart, 1-3 fold pick).
- `game/src/audio.js` — WebAudio synth: ring chime, star ping, hit thud, gust, stall, win/lose jingles.
- `game/src/particles.js` — particles + floating score text.
- `game/src/sky.js` — the world: rings, storm clouds, birds, stars, wind, legs, collisions, lift.
- `game/src/plane.js` — the paper plane: inertia steering, boost, folds, trail.
- `game/src/folds.js` — 6 fold cards: Wide Wings, Sharp Fold, Star Magnet, Storm Shield, Twin Trail, Steady Hands.
- `game/src/render.js` — drawing: sky, sun, sea, parallax clouds, Far Island, plane, HUD, screens.
- `game/src/shots.js` — staged screenshot scenes (`?shot=title|play|fold|results&seed=N`).
- `main.ts` — fresh entrypoint: copies game/ + screenshots/ to /output, writes dossier.json via buildDossier.
- `README.md`, `shots.json` (4 shots, seed 7).
- Untouched kit files: `vendor/makefun-game.ts`, `LICENSE` (MIT), `serve.ts`, `.makefun/owner.json`.

## Advisor (xingchiapi / GPT-6.1-sol)

- DOWN. Design-review call for Emberfall returned 403 on all 4 keys
  (`client_not_allowed` — service now restricts to named coding clients);
  `rotate.py --check` confirmed key 1–4: 403. A second attempt with the
  Paper Pilot design returned the same 403. Per the task instructions the
  build continued without it. No key value was written anywhere.

## Verification

Commands run (all from `~/workspace/makefun/best-game-01`, server on port 8080):

1. `node serve.ts --port 8080` (background) + headless Chromium CDP driver
   `/tmp/ef/cdp.mjs` (Node stdlib WebSocket; chrome at
   `~/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`).
2. Screenshot run: `node /tmp/ef/cdp.mjs shots '[["1-play.png","?shot=play&seed=7"],...]' screenshots`
   - First run found a real bug: `movePlane` called `input.hasKeys()`, which
     the autopilot's fake input lacks → uncaught exception, `__shotReady`
     false on play/fold/results. Fixed by guarding `hasKeys` in `plane.js`
     (accepts a boolean or a function for `boosting` too); added a `data:,`
     favicon to silence the favicon 404.
   - Re-run: all 4 shots `shotReady: true`, **ERRORS(0)**.
   - Play cover needed two fixes, both found by reading the PNGs back: the
     ring was missing (the autopilot had cleared the leg, so `state.ring`
     was null) and the plane was diving. Fixed in `shots.js`: compose the
     frame (ring at 920,290, plane banking toward it) and force a ring back
     into the frame when the leg was already cleared. Final cover verified
     visually: orange ring, plane + trail, storm clouds, birds, stars, +50
     burst, full HUD.
3. Live playthrough: `node /tmp/ef/cdp.mjs play /tmp/ef/live` — real CDP
   mouse/keyboard input, zero console errors:
   - title (status empty) → click Start → "Flying. Reach the Far Island
     in 10 legs." → mouse steer + boost held 2 s → P pause ("Paused.")
     → P resume ("Flying.") → plane left idle → "Crashed. Score 160.
     Best 160." (game over reached, ~50 s) → R restart → "Flying…" again.
   - Live screenshots saved to `/tmp/ef/live/` (live-play/pause/over/restart.png);
     live-play.png visually checked: plane banking toward the ring, lift
     89, boost meter draining, storm cloud, stars, sun, sea.
4. Entrypoint: `rm -rf out && mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`
   → OK. `out/` holds `game/` (12 files), `screenshots/` (4 PNGs),
   `dossier.json` (871,620 bytes, under the 1.5 MiB cap). `diff -r
   screenshots out/screenshots` → identical. A second run into `out2` was
   byte-identical to `out/` (deterministic). Dossier lists all 11 `src/*.js`
   files and contains "PAPER PILOT".
5. Gate limits:
   - `game/`: 12 files, 55,834 bytes (limits: 993 files, 48 MiB). 0 symlinks.
   - Screenshots: 1-play.png 146,517 B; 2-title.png 162,086 B;
     3-fold.png 143,372 B; 4-results.png 157,485 B — all 1280×720, all
     under 256 KiB.
   - `grep -rn 'http' game/` → no matches at all (no `http://`,
     `https://`, or protocol-relative URLs anywhere in `game/`).

## Screenshots (all read back visually)

- `screenshots/1-play.png` (cover) — leg 4/10, score 1600, lift 99, 3 folds,
  ring ahead of the plane, storm clouds, birds, stars, Far Island progress.
- `screenshots/2-title.png` — PAPER PILOT title, tagline, how-to panel,
  best score 1250, "CLICK OR PRESS ENTER TO FLY".
- `screenshots/3-fold.png` — "LEG 4 COMPLETE", 3 cards (Twin Trail, Star
  Magnet, Storm Shield) with [1][2][3] keys, score/stars/folds/lift line.
- `screenshots/4-results.png` — "CRASHED INTO THE SEA", score 70, legs
  0/10, stars 7, best 70, "PRESS R OR CLICK TO FLY AGAIN".

## Known issues / not verified

- The **victory path** (leg 10 → "THE FAR ISLAND!" screen) was not
  live-played end-to-end — it would take a full 10-leg flight. The win
  branch shares the leg-clear flow verified by the fold shot and the
  `endFlight()` path verified by the loss; the win text/stats panel in
  `render.js` (`drawOver`, `state.won`) is untested in a live browser.
- The fold shot shows lift at 23/100 (red) — honest staging (the autopilot
  nearly stalled that leg), not a bug.
- `shots.js` imports `EVENT_HIT` and defines `SAMPLE` without using them;
  harmless dead code.
- The local server was stopped after verification. `out/` is left in the
  repo dir (build artifact, not committed — no commit was made; parent
  handles GitHub push + submission).

## Exact commands (summary)

- `node serve.ts --port 8080` (background, then stopped)
- `node /tmp/ef/cdp.mjs shots '[...4 shots...]' screenshots`
- `node /tmp/ef/cdp.mjs play /tmp/ef/live`
- `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` (twice, second into `out2`, then `out2` removed)
- `grep -rn 'http' game/` → no matches; `find game -type f | wc -l` → 12; `du -sb game` → 55834
