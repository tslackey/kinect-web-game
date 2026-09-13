# Kinect Web Game

A motion arcade you can send someone. Open the link, allow the camera, play.

**Play:** [https://tslackey.github.io/kinect-web-game/](https://tslackey.github.io/kinect-web-game/)

1. Open that URL.
2. Click **Allow camera**. Hands stay on-device. Nothing is uploaded.
3. Use the **top-right playlist** to turn games on or off, reorder them,
   and pick **1P** or **2P**. Hold a hand over the corner **Play** mark
   until it fills, or click **Play**. A longer **curtain** drops, the
   next stage swaps while you are covered, then the curtain rises on a
   **big title placard** held long enough to read. After that, one game
   for about **18 seconds**.

A first visit shuffles a short run from the expanded pack — not every
game every time, and not 3 rounds of the same orb. The top-right menu
saves your playlist and 1P/2P in `localStorage`, so the next session
uses it. 2P is two bodies in one webcam frame, not a second camera.
The pack includes the sticky-carry games (**Water plant**, **Feed pet**,
**Douse fire**), **Stomp bug**, **Hit orb**, and the simple sweep:
**Duck beam**, **Jump bar**, **Strike pose**, **Lean away**, **Clap now**,
**Kick ball**, **Stretch wide**, **High five**, **Catch fruit**,
**Wave hello**, **Squash it**. Harder siblings: **Balance the tray**
(`Steady!` — keep wrists level while carrying to the goal; tip or
timeout fails), **Mirror me** (`Copy!` — P2 matches P1 wrists, or a
solo ghost like Strike pose), and **Hot potato** (`Pass!` — offer/accept
pass; win is at least one successful pass before the timer). Between
games, Facet theater drapes close, the next stage set swaps, then the
curtain rises on a big title placard. Simple-pack verbs use Facet
low-poly marks and a matching stage set.

Each play window is 15–20 seconds (default 18s) so kids have time to
find the body part and finish. Win or fail is timeout-or-success, not
a wrong gesture — except **Balance the tray**, which also fails if the
wrists tip past tolerance. Two people in one camera frame share the
same target and the same win.

Sticky-carry items (plant pot, pet bowl, fire bucket, tray, potato)
stay with the hand that picked them up. To pass, the owner puts **both
hands** on the item (offered — a sky ring for now), then another body —
or the same body’s other hand after it leaves and re-grabs — puts **one
hand** on it to accept. Without that two-hand offer, a second hand
cannot steal. Hot potato uses that rule as the verb: one accepted pass
wins; overlap-steal does not.

If a camera body is in frame, that skeleton is the only player — moving
the mouse does not add a second body. Keyboard is also suppressed while
a camera body is live. Camera joints are smoothed and hold last-known-good
for a short beat so a one-frame dropout does not yank the skeleton.
Pointer and keyboard stay crisp.

If the camera is blocked or has no usable pose, click **Play without
camera**. The pointer and keyboard still play. On start and game-over,
hold a wrist (or the pointer when the camera is off) over the
**top-right Play mark** until the fill completes. Leaving the mark
resets the fill. Click **Play** stays as the fallback. The hold does
not fire mid-game.

Sound is optional. Use **Sound on** / **Sound off**.

## Local preview

Same game, served by Vite on port 8080. Vite is the local server only.

```bash
npm install
npm run dev
```

Then visit [http://localhost:8080](http://localhost:8080). Allow the camera,
then play.

`npm test` runs the `node --test` suite (mouse and keyboard stand-ins; no
camera hardware).

`npm run preview` serves the same port for a production-style check.

## Modules

| Path | Role |
| --- | --- |
| `input/` | Pose sample from one webcam; else mouse or keyboard. Webcam joints are exponentially smoothed with last-known-good (`SMOOTH_RATE`, `LKG_HOLD_MS`, `MIN_CONFIDENCE` in `input/smooth.js`). A live camera pose suppresses stand-ins. `sample()` emits pose maps. |
| `game/` | Microgame contract and session loop: curtain → 18s play → win/fail → next. `transition.toNext({ title, backgroundId })` is the shared wipe (timings in `game/transition.js`). Start / game-over share a corner hand-hold Play mark (`START_DWELL` in `game/start-dwell.js`). Playlist + 1P/2P persist in `game/playlist.js`. Sticky-carry offer/accept lives in `game/carry.js`. |
| `render/` | Stick figures, Facet carry/stomp/simple-pack marks, theater curtains, title placard, verb-matched stage sets, and the start-hold ring. |
| `feel/` | Optional synthesized hit / miss audio. |
| `main.js` | Wires the loop, camera prompt, corner playlist menu, Play, and sound toggle. |

## GitHub Pages

Pushes to `main` deploy the **static repo root** via
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).
There is no Vite build step. Pages publishes `index.html` and the ES modules
as-is.

1. In the repo on GitHub: **Settings → Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. After the workflow runs, the site is at:
   `https://tslackey.github.io/kinect-web-game/`

The pose library and pose model load from a CDN at runtime.
