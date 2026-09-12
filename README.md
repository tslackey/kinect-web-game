# Kinect Web Game

A motion arcade you can send someone. Open the link, allow the camera, play.

**Play:** [https://tslackey.github.io/kinect-web-game/](https://tslackey.github.io/kinect-web-game/)

1. Open that URL.
2. Click **Allow camera**. Hands stay on-device. Nothing is uploaded.
3. Click **Play**. A short prompt flashes, then one game on a timer.
   First up: **Water plant** — hover a wrist or the pointer over the
   pot, carry it over the plant, pour. Later games can still be
   **Hit orb**. Win or miss, the next game starts.

A session is a short sequence of those games — not 3 rounds of the same
orb. Win or fail is timeout-or-success, not a wrong gesture. Two people
in one camera frame share the same pot and the same win.

If the camera is blocked, click **Play without camera**. The pointer and
keyboard still play.

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
| `input/` | Pose sample from one webcam; else mouse or keyboard. `sample()` emits pose maps. |
| `game/` | Microgame contract and session loop: prompt → play → win/fail → next. Water the plant, then orb-hit. |
| `render/` | Draws one or two stick figures, pot/plant or the orb, markers, and hit flashes. |
| `feel/` | Optional synthesized hit / miss audio. |
| `main.js` | Wires the loop, camera prompt, Play, and sound toggle. |

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
