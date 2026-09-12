import { createInput } from "./input/index.js";
import { createGame } from "./game/index.js";
import { createRenderer } from "./render/index.js";

const canvas = document.getElementById("motion-field");
const statusEl = document.getElementById("status");
const cameraCopy = document.getElementById("camera-copy");
const startBtn = document.getElementById("start-camera");
const kinectBtn = document.getElementById("connect-kinect");
const tryAgainBtn = document.getElementById("try-again");
const headline = document.getElementById("headline");
const scoreline = document.getElementById("scoreline");
const video = document.getElementById("camera-feed");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Expected #motion-field canvas.");
}

const input = createInput({
  video: video instanceof HTMLVideoElement ? video : null,
});
const game = createGame();
const renderer = createRenderer(canvas);

let lastTime = performance.now();
let lastHudAt = 0;

if (startBtn instanceof HTMLButtonElement) {
  startBtn.addEventListener("click", () => {
    input.startCamera();
    updateHud(game.getState());
  });
}

if (kinectBtn instanceof HTMLButtonElement) {
  kinectBtn.addEventListener("click", async () => {
    await input.startKinect();
    updateHud(game.getState());
  });
}

if (tryAgainBtn instanceof HTMLButtonElement) {
  tryAgainBtn.addEventListener("click", () => {
    game.reset();
    renderer.draw(game.getState());
    updateHud(game.getState());
  });
}

function frame(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  const sample = input.sample();
  const state = game.tick(dt, sample);
  renderer.draw(state);

  if (now - lastHudAt > 120) {
    lastHudAt = now;
    updateHud(state);
  }

  requestAnimationFrame(frame);
}

/**
 * @param {import("./game/index.js").GameState} state
 */
function updateHud(state) {
  const cam = input.getStatus();
  const failed = state.phase === "failed";

  if (headline) {
    headline.textContent = failed ? "Miss" : "Hit the orbs";
    headline.classList.toggle("is-fail", failed);
  }

  if (scoreline) {
    scoreline.textContent = `Score ${state.score}`;
    scoreline.classList.toggle("is-fail", failed);
  }

  if (statusEl) {
    statusEl.classList.toggle("is-fail", failed);
    if (failed) {
      statusEl.textContent = "The orb timed out. Attempt over.";
    } else if (state.phase === "playing" && state.timeLeft != null) {
      statusEl.textContent = `${state.timeLeft.toFixed(1)}s left`;
    } else {
      statusEl.textContent = "Reach for the orb";
    }
  }

  if (cameraCopy) {
    cameraCopy.textContent = cam.message;
  }

  if (startBtn instanceof HTMLButtonElement) {
    const busy = cam.camera === "pending" || cam.camera === "loading";
    const kinectLive = cam.kinect === "live";
    startBtn.disabled = busy || cam.camera === "ready";
    startBtn.classList.toggle("primary", !failed && !kinectLive);
    startBtn.classList.toggle("ghost", failed || kinectLive);
    if (cam.camera === "ready") startBtn.textContent = "Camera on";
    else if (busy) startBtn.textContent = "Starting…";
    else if (cam.camera === "prompt") startBtn.textContent = "Allow camera";
    else startBtn.textContent = "Try camera again";
  }

  if (kinectBtn instanceof HTMLButtonElement) {
    const kinectBusy = cam.kinect === "connecting";
    const kinectLive = cam.kinect === "live" || cam.kinect === "ready";
    const kinectAnnounced = cam.message === cam.kinectMessage;
    kinectBtn.disabled = kinectLive || (kinectBusy && kinectAnnounced);
    kinectBtn.classList.toggle("primary", kinectLive && !failed);
    kinectBtn.classList.toggle("ghost", !kinectLive || failed);
    if (cam.kinect === "live") kinectBtn.textContent = "Kinect on";
    else if (cam.kinect === "ready") kinectBtn.textContent = "Kinect ready";
    else if (kinectBusy && kinectAnnounced) kinectBtn.textContent = "Looking for Kinect…";
    else if ((cam.kinect === "missing" || cam.kinect === "error") && kinectAnnounced) {
      kinectBtn.textContent = "Try Kinect again";
    } else kinectBtn.textContent = "Connect Kinect";
  }

  if (tryAgainBtn instanceof HTMLButtonElement) {
    tryAgainBtn.hidden = !failed;
    tryAgainBtn.classList.toggle("primary", failed);
    tryAgainBtn.classList.toggle("ghost", !failed);
  }

  if (video instanceof HTMLVideoElement) {
    video.classList.toggle("is-live", cam.camera === "ready" || cam.camera === "loading");
  }
}

function onResize() {
  renderer.resize();
  renderer.draw(game.getState());
}

window.addEventListener("resize", onResize);
renderer.resize();
updateHud(game.getState());
requestAnimationFrame(frame);
