# Kinect Web Game

Shareable GitHub Pages motion arcade. Webcam first; Kinect later as an adapter
behind the same `input` → `game` → `render` spine.

Slice 3 is webcam body input: allow the camera, move, and see your joints
update on the canvas.

## Local preview

Serve the repo root (ES modules and `getUserMedia` need a local server):

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080). Click **Allow camera**.
If the camera is blocked, the page stays up and the pointer still steers.

## Modules

| Path | Role |
| --- | --- |
| `input/` | Pose sample. Webcam via MediaPipe Pose when allowed; mouse fallback. |
| `game/` | Owns state and `tick(dt)`. Follows `nose` (or `pointer`). |
| `render/` | Draws the stick figure and marker to `#motion-field`. |
| `main.js` | Wires the animation frame loop and camera button. |

## GitHub Pages

Pushes to `main` deploy via [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

1. In the repo on GitHub: **Settings → Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. After the workflow runs, the site is at:
   `https://tslackey.github.io/kinect-web-game/`

The pose library and model load from a CDN at runtime (no bundler).
