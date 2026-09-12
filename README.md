# Kinect Web Game

Shareable GitHub Pages motion arcade. Webcam first; Kinect later as an adapter
behind the same `input` → `game` → `render` spine.

Slice 4 is one verb: hit floating orbs with your hands. A hit adds a point.
Miss the timer and the attempt ends.

## Local preview

Serve the repo root (ES modules and `getUserMedia` need a local server):

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080). Click **Allow camera**,
then reach for the orb. If the camera is blocked, the pointer still plays.

## Modules

| Path | Role |
| --- | --- |
| `input/` | Pose sample. Webcam via MediaPipe Pose when allowed; mouse fallback. |
| `game/` | Owns state and `tick(dt)`. Hands / pointer hit orbs; score or fail. |
| `render/` | Draws the stick figure, orb, and marker to `#motion-field`. |
| `main.js` | Wires the animation frame loop, camera button, and try-again. |

## GitHub Pages

Pushes to `main` deploy via [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

1. In the repo on GitHub: **Settings → Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. After the workflow runs, the site is at:
   `https://tslackey.github.io/kinect-web-game/`

The pose library and model load from a CDN at runtime (no bundler).
