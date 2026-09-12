# Kinect Web Game

Browser playground for a motion-driven web game. Slice 2 is the project spine:
`input` → `game` → `render`, driven by `requestAnimationFrame`.

## Local preview

Serve the repo root (ES modules need a local server, not a `file://` open):

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080). The marker orbits on
its own; move the pointer to steer it.

## Modules

| Path | Role |
| --- | --- |
| `input/` | Stub pose sample. Mouse today; webcam / Kinect later. |
| `game/` | Owns state and `tick(dt)`. |
| `render/` | Draws the current state to `#motion-field`. |
| `main.js` | Wires the animation frame loop. |

## GitHub Pages

Pushes to `main` deploy via [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

1. In the repo on GitHub: **Settings → Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. After the workflow runs, the site is at:
   `https://tslackey.github.io/kinect-web-game/`
