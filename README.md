# Kinect Web Game

A motion arcade you can send someone. Open the link, allow the camera, play.

**Play:** [https://tslackey.github.io/kinect-web-game/](https://tslackey.github.io/kinect-web-game/)

1. Open that URL.
2. Click **Allow camera**. Hands stay on-device. Nothing is uploaded.
3. Click **Play**. A short prompt flashes, then one game for about
   **18 seconds**. First up: **Water plant** — hover a wrist or the
   pointer over the pot, carry it over the plant, pour. Next:
   **Feed pet** — same sticky carry, bowl to a hungry pet. Then:
   **Douse fire** — stick the bucket, carry it over the flame, spray.
   Then: **Stomp bug** — hover an ankle (or the pointer as a foot)
   over the bug, or drive a foot through it. Later games can still be
   **Hit orb**. Win or miss, the next game starts.

A session is a short sequence of those games — not 3 rounds of the same
orb. Each play window is 15–20 seconds (default 18s) so kids have time
to find the body part and finish. Win or fail is timeout-or-success, not
a wrong gesture. Two people in one camera frame share the same pot,
bowl, bucket, or bug and the same win.

If a camera body is in frame, that skeleton is the only player — moving
the mouse does not add a second body. Keyboard is also suppressed while
a camera body is live. If the camera is blocked or has no usable pose,
click **Play without camera**. The pointer and keyboard still play.

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
| `input/` | Pose sample from one webcam; else mouse or keyboard. A live camera pose suppresses stand-ins. `sample()` emits pose maps. |
| `game/` | Microgame contract and session loop: prompt → 18s play → win/fail → next. Water the plant, Feed the pet, Put out the fire, Stomp the bug, then orb-hit. |
| `render/` | Stick figures, Facet low-poly plant/can, pet/bowl, flame/bucket, bug, or the orb, markers, and hit flashes. |
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
