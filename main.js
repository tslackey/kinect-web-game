import { createInput } from "./input/index.js";
import { createGame } from "./game/index.js";
import { createRenderer } from "./render/index.js";

const canvas = document.getElementById("motion-field");
const statusEl = document.getElementById("status");
const cameraCopy = document.getElementById("camera-copy");
const startBtn = document.getElementById("start-camera");
const kinectBtn = document.getElementById("connect-kinect");
const playBtn = document.getElementById("play");
const headline = document.getElementById("headline");
const lede = document.getElementById("lede");
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

if (playBtn instanceof HTMLButtonElement) {
  playBtn.addEventListener("click", () => {
    game.start();
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
  const atGate = state.phase === "start" || state.phase === "over";
  const missed = state.phase === "between" || state.phase === "over";

  if (headline) {
    headline.textContent = headlineFor(state);
    headline.classList.toggle("is-fail", missed);
  }

  if (lede) {
    lede.textContent = ledeFor(state);
  }

  if (scoreline) {
    scoreline.textContent = scorelineFor(state);
    scoreline.classList.toggle("is-fail", missed);
    scoreline.hidden = state.phase === "start";
  }

  if (statusEl) {
    statusEl.classList.toggle("is-fail", missed);
    statusEl.textContent = statusFor(state);
  }

  if (cameraCopy) {
    cameraCopy.textContent = cam.message;
  }

  if (startBtn instanceof HTMLButtonElement) {
    const busy = cam.camera === "pending" || cam.camera === "loading";
    const kinectLive = cam.kinect === "live";
    startBtn.disabled = busy || cam.camera === "ready";
    startBtn.classList.toggle("primary", !missed && !kinectLive);
    startBtn.classList.toggle("ghost", missed || kinectLive);
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
    kinectBtn.classList.toggle("primary", kinectLive && !missed);
    kinectBtn.classList.toggle("ghost", !kinectLive || missed);
    if (cam.kinect === "live") kinectBtn.textContent = "Kinect on";
    else if (cam.kinect === "ready") kinectBtn.textContent = "Kinect ready";
    else if (kinectBusy && kinectAnnounced) kinectBtn.textContent = "Looking for Kinect…";
    else if ((cam.kinect === "missing" || cam.kinect === "error") && kinectAnnounced) {
      kinectBtn.textContent = "Try Kinect again";
    } else kinectBtn.textContent = "Connect Kinect";
  }

  if (playBtn instanceof HTMLButtonElement) {
    playBtn.hidden = !atGate;
    playBtn.classList.toggle("primary", atGate);
    playBtn.classList.toggle("ghost", !atGate);
    playBtn.textContent = state.phase === "over" ? "Play again" : "Play";
  }

  if (video instanceof HTMLVideoElement) {
    video.classList.toggle("is-live", cam.camera === "ready" || cam.camera === "loading");
  }
}

/**
 * @param {import("./game/index.js").GameState} state
 */
function headlineFor(state) {
  if (state.phase === "over") return "Game over";
  if (state.phase === "between") return `Round ${state.round} over`;
  if (state.phase === "waiting" || state.phase === "playing") return `Round ${state.round}`;
  return "Hit the orbs";
}

/**
 * @param {import("./game/index.js").GameState} state
 */
function ledeFor(state) {
  if (state.phase === "over") {
    return "Session over. Play again for another 3 rounds. Same verb — hit orbs, miss ends the round.";
  }
  if (state.phase === "between") {
    return "Missed that one. The next round is a little quicker.";
  }
  return "3 rounds. Hit orbs with your hands. Miss one and the round ends. The pointer works if the camera is off.";
}

/**
 * @param {import("./game/index.js").GameState} state
 */
function scorelineFor(state) {
  if (state.phase === "over") return `Score ${state.score}`;
  return `Round ${state.round} · Score ${state.score}`;
}

/**
 * @param {import("./game/index.js").GameState} state
 */
function statusFor(state) {
  if (state.phase === "over") {
    return `${state.score} hit${state.score === 1 ? "" : "s"} across ${state.rounds} rounds.`;
  }
  if (state.phase === "between") {
    const hits = `${state.roundHits} hit${state.roundHits === 1 ? "" : "s"} this round`;
    return `${hits}. Round ${state.round + 1} next.`;
  }
  if (state.phase === "playing" && state.timeLeft != null) {
    return `Round ${state.round} of ${state.rounds} · ${state.timeLeft.toFixed(1)}s left`;
  }
  if (state.phase === "waiting") {
    return `Round ${state.round} of ${state.rounds}. Reach for the orb.`;
  }
  return "Press Play when you are ready.";
}

function onResize() {
  renderer.resize();
  renderer.draw(game.getState());
}

window.addEventListener("resize", onResize);
renderer.resize();
updateHud(game.getState());
requestAnimationFrame(frame);
