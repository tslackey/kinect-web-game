import { createInput } from "./input/index.js";
import { CAMERA_COPY } from "./input/camera-status.js";
import { createGame } from "./game/index.js";
import { createRenderer } from "./render/index.js";
import { createAudio } from "./feel/audio.js";

const canvas = document.getElementById("motion-field");
const statusEl = document.getElementById("status");
const cameraInvite = document.getElementById("camera-invite");
const cameraKicker = document.getElementById("camera-kicker-text") ?? document.getElementById("camera-kicker");
const cameraCopy = document.getElementById("camera-copy");
const startBtn = document.getElementById("start-camera");
const playBtn = document.getElementById("play");
const playLabel = document.getElementById("play-label");
const soundBtn = document.getElementById("toggle-sound");
const headline = document.getElementById("headline");
const lede = document.getElementById("lede");
const scoreboard = document.getElementById("scoreboard");
const scoreline = document.getElementById("scoreline");
const scoreValue = document.getElementById("score-value");
const roundline = document.getElementById("roundline");
const video = document.getElementById("camera-feed");
const video2 = document.getElementById("camera-feed-2");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Expected #motion-field canvas.");
}

const reducedMotion =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const input = createInput({
  video: video instanceof HTMLVideoElement ? video : null,
  video2: video2 instanceof HTMLVideoElement ? video2 : null,
});
const game = createGame();
const renderer = createRenderer(canvas, { reducedMotion });
const audio = createAudio();

let lastTime = performance.now();
let lastHudAt = 0;
let lastPhase = game.getState().phase;
let lastFlashId = -1;

if (startBtn instanceof HTMLButtonElement) {
  startBtn.addEventListener("click", () => {
    input.startCamera();
    updateHud(game.getState());
  });
}

if (playBtn instanceof HTMLButtonElement) {
  playBtn.addEventListener("click", () => {
    const cam = input.getStatus();
    game.start();
    if (cam.permission === "granted" && cam.camera === "prompt") {
      input.startCamera();
    }
    renderer.draw(game.getState());
    updateHud(game.getState());
  });
}

if (soundBtn instanceof HTMLButtonElement) {
  syncSoundButton();
  soundBtn.addEventListener("click", () => {
    audio.toggle();
    syncSoundButton();
  });
}

function frame(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  const sample = input.sample();
  const state = game.tick(dt, sample);
  renderer.draw(state);

  const flash = state.flash;
  const flashChanged = Boolean(flash && flash.id !== lastFlashId);
  if (flashChanged && flash) {
    lastFlashId = flash.id;
    audio.play(flash.kind);
    if (flash.kind === "hit") popScore();
  }

  const phaseChanged = state.phase !== lastPhase;
  if (flashChanged || phaseChanged || now - lastHudAt > 80) {
    lastPhase = state.phase;
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
  const cameraReady = cam.camerasReady > 0 || cam.camera === "ready";
  const cameraBusy =
    cam.starting ||
    cam.camera === "pending" ||
    cam.camera === "loading" ||
    cam.camera2 === "pending" ||
    cam.camera2 === "loading";
  const twoLive = cam.camerasReady >= 2;
  const offerSecond =
    cam.camera === "ready" && !twoLive && cam.deviceCount >= 2 && cam.camera2 !== "denied";

  document.body.classList.toggle("is-start", state.phase === "start");
  document.body.classList.toggle("is-playing", state.phase === "waiting" || state.phase === "playing");
  document.body.classList.toggle("is-between", state.phase === "between");
  document.body.classList.toggle("is-over", state.phase === "over");
  document.body.classList.toggle("is-camera-prompt", cam.camera === "prompt");
  document.body.classList.toggle("is-camera-denied", cam.camera === "denied" || cam.camera === "unavailable" || cam.camera === "error");
  document.body.classList.toggle("is-camera-ready", cameraReady || cam.camera === "loading");
  document.body.classList.toggle("is-two-cameras", twoLive);

  if (headline) {
    headline.textContent = headlineFor(state);
    headline.classList.toggle("is-fail", missed);
  }

  if (lede) {
    lede.textContent = ledeFor(state);
  }

  if (scoreboard) {
    scoreboard.hidden = state.phase === "start";
  }

  if (scoreValue) {
    scoreValue.textContent = String(state.score);
  }

  if (scoreline) {
    scoreline.classList.toggle("is-fail", missed);
    scoreline.setAttribute("aria-label", `Score ${state.score}`);
  }

  if (roundline) {
    roundline.textContent = roundlineFor(state);
    roundline.classList.toggle("is-fail", missed);
  }

  if (statusEl) {
    statusEl.classList.toggle("is-fail", missed);
    statusEl.textContent = statusFor(state, cam);
  }

  if (cameraKicker) {
    cameraKicker.textContent = cameraKickerFor(cam, state);
  }

  if (cameraCopy) {
    cameraCopy.textContent = cam.message;
  }

  if (cameraInvite) {
    cameraInvite.dataset.state = cam.camera;
  }

  if (startBtn instanceof HTMLButtonElement) {
    startBtn.hidden = cameraReady && !offerSecond;
    startBtn.disabled = cameraBusy;
    const offerCamera = cam.camera === "prompt" || cameraBusy || offerSecond;
    startBtn.classList.toggle("primary", offerCamera && !missed);
    startBtn.classList.toggle("ghost", !offerCamera || missed);
    if (cameraBusy) startBtn.textContent = "Starting…";
    else if (offerSecond && cam.camera2 === "error") startBtn.textContent = "Try second camera again";
    else if (offerSecond) startBtn.textContent = "Allow second camera";
    else if (cam.camera === "prompt" && cam.permission === "granted") startBtn.textContent = "Start camera";
    else if (cam.camera === "prompt") startBtn.textContent = "Allow camera";
    else startBtn.textContent = "Try camera again";
  }

  if (playBtn instanceof HTMLButtonElement) {
    playBtn.hidden = !atGate;
    playBtn.classList.toggle("primary", atGate && (cameraReady || cam.camera !== "prompt" || state.phase === "over"));
    playBtn.classList.toggle("ghost", state.phase === "start" && cam.camera === "prompt");
    const playText =
      state.phase === "over" ? "Play again" : cameraReady ? "Play" : "Play without camera";
    if (playLabel) playLabel.textContent = playText;
    else playBtn.textContent = playText;
  }

  if (video instanceof HTMLVideoElement) {
    video.classList.toggle("is-live", cam.camera === "ready" || cam.camera === "loading");
  }

  if (video2 instanceof HTMLVideoElement) {
    video2.classList.toggle("is-live", cam.camera2 === "ready" || cam.camera2 === "loading");
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
    return "Session over. Play again for another 3 rounds.";
  }
  if (state.phase === "between") {
    return "Missed that one. The next round is a little quicker.";
  }
  return "Open, allow a camera, play. A second webcam is a second player. 3 rounds. Hit orbs with your hands. Pointer and keyboard stand in if a camera is off.";
}

/**
 * @param {import("./game/index.js").GameState} state
 */
function roundlineFor(state) {
  if (state.phase === "over") return `${state.score} hit${state.score === 1 ? "" : "s"} · ${state.rounds} rounds`;
  return `Round ${state.round} of ${state.rounds}`;
}

/**
 * @param {import("./game/index.js").GameState} state
 * @param {{ camera: string }} cam
 */
function statusFor(state, cam) {
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
    if (cam.camerasReady >= 2) {
      return `Round ${state.round} of ${state.rounds}. Both players, reach for the orb.`;
    }
    if (cam.camera !== "ready") {
      return `Round ${state.round} of ${state.rounds}. Pointer and keyboard work. You can still allow the camera.`;
    }
    return `Round ${state.round} of ${state.rounds}. Reach for the orb.`;
  }
  if (cam.camera === "denied" || cam.camera === "unavailable" || cam.camera === "error") {
    return "Camera is off. Press Play to use the pointer or keyboard.";
  }
  return "Allow the camera, then press Play.";
}

/**
 * @param {{ camera: string, permission: string, message: string }} cam
 * @param {import("./game/index.js").GameState} state
 */
function cameraKickerFor(cam, state) {
  if (cam.camerasReady >= 2) return "Two cameras live";
  if (cam.camera === "ready") return "Camera live";
  if (cam.camera === "loading" || cam.camera === "pending") return "Camera";
  if (cam.camera === "denied") return "Camera blocked";
  if (cam.camera === "unavailable" || cam.camera === "error") return "Camera off";
  if (cam.permission === "granted" || cam.message === CAMERA_COPY.granted) return "Camera ready";
  if (state.phase === "start") return "First visit";
  return "Camera";
}

function popScore() {
  if (!(scoreline instanceof HTMLElement)) return;
  scoreline.classList.remove("is-pop");
  void scoreline.offsetWidth;
  scoreline.classList.add("is-pop");
}

function syncSoundButton() {
  if (!(soundBtn instanceof HTMLButtonElement)) return;
  const muted = audio.isMuted();
  soundBtn.setAttribute("aria-pressed", muted ? "false" : "true");
  soundBtn.textContent = muted ? "Sound off" : "Sound on";
}

function onResize() {
  renderer.resize();
  renderer.draw(game.getState());
}

window.addEventListener("resize", onResize);
renderer.resize();
updateHud(game.getState());
requestAnimationFrame(frame);
