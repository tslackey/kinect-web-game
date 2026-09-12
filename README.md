# Kinect Web Game

Shareable GitHub Pages motion arcade. Play with a webcam. Mouse and
keyboard are stand-ins for tests and for when the camera is off.

One verb: hit floating orbs with your hands. A hit adds a point. Miss the
timer and the round ends. A session is start → 3 rounds → game over → play
again. Later rounds shave a little orb time and drift a bit faster.

## Play

Open [https://tslackey.github.io/kinect-web-game/](https://tslackey.github.io/kinect-web-game/).
Click **Allow camera**, then **Play**, and reach for the orb. If the camera
is blocked, the pointer still plays.

## Local preview

```bash
npm install
npm run dev
```

Then visit [http://localhost:8080](http://localhost:8080). Vite serves the
repo root on port 8080. Click **Allow camera**, then **Play**.

`npm test` runs the existing `node --test` suite (mouse and keyboard
stand-ins; no sensor host).

`npm run preview` serves the same port for a production-style check.

## Modules

| Path | Role |
| --- | --- |
| `input/` | Pose sample. Webcam when the camera is live; else mouse or keyboard. |
| `game/` | Owns session state and `tick(dt)`. Start, rounds, score, game over. |
| `render/` | Draws the stick figure, orb, and marker to `#motion-field`. |
| `main.js` | Wires the animation frame loop, camera, and Play. |

## GitHub Pages

Pushes to `main` deploy via [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

1. In the repo on GitHub: **Settings → Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. After the workflow runs, the site is at:
   `https://tslackey.github.io/kinect-web-game/`

The pose library and pose model load from a CDN at runtime. Vite is
dev-only; Pages still publishes the repo root as static files.
