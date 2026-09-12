# Kinect Web Game

A motion arcade you can send someone. Open the link, allow the camera, play.
Two webcams are two people — not one camera guessing two poses.

**Play:** [https://tslackey.github.io/kinect-web-game/](https://tslackey.github.io/kinect-web-game/)

1. Open that URL.
2. Click **Allow camera**. Hands stay on-device. Nothing is uploaded.
3. A second webcam, if the browser lists one, is player 2. Or use another
   pointer / the keyboard as the second body.
4. Click **Play**. Hit the orbs with either hand. Both players score on the
   same orbs.

If the camera is blocked, click **Play without camera**. The pointer and
keyboard still play — two pointers are two skeletons. A session is 3 rounds.
Miss an orb and the round ends. One camera still plays solo.

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
| `input/` | Pose sample. Up to two webcam streams; else mouse, extra pointers, or keyboard. `sample()` emits pose maps, not one joint dict. |
| `game/` | Owns session state and `tick(dt)`. Start, rounds, score, game over. Either body can hit. |
| `render/` | Draws one or two stick figures, the orb, markers, and hit flashes. |
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
