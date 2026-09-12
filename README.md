# Kinect Web Game

Shareable GitHub Pages motion arcade. Webcam first; Kinect is a second
adapter behind the same `input` → `game` → `render` spine.

One verb: hit floating orbs with your hands. A hit adds a point. Miss the
timer and the round ends. A session is start → 3 rounds → game over → play
again. Later rounds shave a little orb time and drift a bit faster. Kinect
is a second input adapter behind the same spine.

## Local preview

Serve the repo root (ES modules and `getUserMedia` need a local server):

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080). Click **Play**, then
reach for the orb. **Allow camera** if you want body tracking; if it is
blocked, the pointer still plays.

A Kinect is optional. With no host running, webcam and pointer keep working.

## Kinect host (Kinectron)

The game talks to [Kinectron](https://github.com/kinectron/kinectron), the
usual way to stream a real Kinect skeleton into the browser. The host runs on
the Windows machine that has the sensor. The page only consumes joints.

### 1. Hardware + SDK

- **Azure Kinect** — install the [Azure Kinect SDK](https://learn.microsoft.com/en-us/previous-versions/azure/kinect-dk/sensor-sdk-download) and body-tracking extras. Use **Kinectron 1.0**.
- **Kinect v2** (Xbox One / Kinect for Windows) — install the Kinect for Windows SDK 2.0. Use the last v0 host, **Kinectron 0.3.9 / 0.4.0**.

Plug the sensor into a USB 3 port. Close other apps that might be holding it.

### 2. Run the host app

1. Download a release from [kinectron/kinectron releases](https://github.com/kinectron/kinectron/releases).
2. Launch Kinectron and click **Open Kinect**.
3. Start the **Body** feed (or leave API calls allowed so this page can start it).
4. Note the IP and port the app shows (default `127.0.0.1:9001`).

### 3. Point the game at the host

Serve this repo over **HTTP on the same machine** (`python3 -m http.server 8080`)
and open [http://localhost:8080](http://localhost:8080). The page probes
Kinectron at `127.0.0.1:9001` and, when bodies arrive, `game/` reads the same
`left_wrist` / `right_wrist` joints the webcam adapter emits.

| Situation | URL |
| --- | --- |
| Host on this machine | `http://localhost:8080` (auto-detect) |
| Host on the LAN | `http://localhost:8080/?kinect=192.168.1.10` |
| Custom port | `http://localhost:8080/?kinect=192.168.1.10:9001` |
| Webcam only | `http://localhost:8080/?input=webcam` |
| Kinectron ngrok (HTTPS) | `https://tslackey.github.io/kinect-web-game/?kinect=YOUR-SUBDOMAIN.ngrok-free.app` |

GitHub Pages is HTTPS. A local Kinectron peer server is HTTP, so the Pages URL
cannot reach `127.0.0.1`. Use the local HTTP preview, or Kinectron's ngrok
public address as `?kinect=`.

**Connect Kinect** retries the same probe. You do not need to change `game/` or
`render/`.

## Modules

| Path | Role |
| --- | --- |
| `input/` | Pose sample. Kinectron when a host is live; else webcam; else mouse. |
| `input/kinect.js` | Kinectron client. Maps Azure / v2 bodies onto the webcam joint names. |
| `game/` | Owns session state and `tick(dt)`. Start, rounds, score, game over. |
| `render/` | Draws the stick figure, orb, and marker to `#motion-field`. |
| `main.js` | Wires the animation frame loop, camera, Kinect, and Play. |

## GitHub Pages

Pushes to `main` deploy via [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

1. In the repo on GitHub: **Settings → Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. After the workflow runs, the site is at:
   `https://tslackey.github.io/kinect-web-game/`

The pose library, pose model, and Kinectron client load from a CDN at runtime
(no bundler).
