import { createInput } from "./input/index.js";
import { createGame } from "./game/index.js";
import { createRenderer } from "./render/index.js";

const canvas = document.getElementById("motion-field");
const statusEl = document.getElementById("status");
const cameraCopy = document.getElementById("camera-copy");
const startBtn = document.getElementById("start-camera");
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

function frame(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  const sample = input.sample();
  const state = game.tick(dt, sample);
  renderer.draw(state);

  if (now - lastHudAt > 250) {
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
  const jointCount = Object.keys(state.pose?.joints ?? {}).length;
  const seconds = state.elapsed.toFixed(1);

  if (statusEl) {
    statusEl.textContent = `${state.inputSource} · ${jointCount} joints · tick ${state.ticks} · ${seconds}s`;
  }

  if (cameraCopy) {
    cameraCopy.textContent = cam.message;
  }

  if (startBtn instanceof HTMLButtonElement) {
    const busy = cam.camera === "pending" || cam.camera === "loading";
    startBtn.disabled = busy || cam.camera === "ready";
    if (cam.camera === "ready") startBtn.textContent = "Camera on";
    else if (busy) startBtn.textContent = "Starting…";
    else if (cam.camera === "prompt") startBtn.textContent = "Allow camera";
    else startBtn.textContent = "Try camera again";
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
