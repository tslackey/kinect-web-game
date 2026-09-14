import { createInput } from "./input/index.js";
import { CAMERA_COPY } from "./input/camera-status.js";
import {
  DEFAULT_PACK,
  createGame,
  loadPlaylist,
  movePlaylistGame,
  savePlaylist,
  sessionOptionsFromPlaylist,
  setPlayerMode,
  setPlaylistEnabled,
} from "./game/index.js";
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
const scoreSolo = document.getElementById("score-solo");
const scoreDuo = document.getElementById("score-duo");
const scoreP1 = document.getElementById("score-p1");
const scoreP2 = document.getElementById("score-p2");
const scoreP1Wrap = document.getElementById("score-p1-wrap");
const scoreP2Wrap = document.getElementById("score-p2-wrap");
const roundline = document.getElementById("roundline");
const video = document.getElementById("camera-feed");
const video2 = document.getElementById("camera-feed-2");
const sessionMenu = document.getElementById("session-menu");
const playlistEl = document.getElementById("playlist");
const mode1pBtn = document.getElementById("mode-1p");
const mode2pBtn = document.getElementById("mode-2p");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Expected #motion-field canvas.");
}

const reducedMotion =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const input = createInput({
  video: video instanceof HTMLVideoElement ? video : null,
  video2: video2 instanceof HTMLVideoElement ? video2 : null,
});
const storage = typeof localStorage !== "undefined" ? localStorage : null;
let settings = loadPlaylist(storage, DEFAULT_PACK);
const game = createGame({ reducedMotion, ...sessionOptionsFromPlaylist(settings, DEFAULT_PACK) });
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
    applySettings(settings);
    game.start();
    if (cam.permission === "granted" && cam.camera === "prompt") {
      input.startCamera();
    }
    renderer.draw(game.getState());
    updateHud(game.getState());
  });
}

if (mode1pBtn instanceof HTMLButtonElement) {
  mode1pBtn.addEventListener("click", () => applySettings(setPlayerMode(settings, "1p")));
}
if (mode2pBtn instanceof HTMLButtonElement) {
  mode2pBtn.addEventListener("click", () => applySettings(setPlayerMode(settings, "2p")));
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
  const live = state.phase === "prompt" || state.phase === "playing";
  const curtain = state.phase === "prompt" && Boolean(state.transition);
  const missed = state.phase === "over" || (state.phase === "result" && state.result === "fail");
  const splitRound = state.phase === "result" && state.result === "split";
  const cameraReady = cam.camera === "ready" || cam.camerasReady > 0;
  const cameraBusy = cam.starting || cam.camera === "pending" || cam.camera === "loading";

  document.body.classList.toggle("is-start", state.phase === "start");
  document.body.classList.toggle("is-playing", live);
  document.body.classList.toggle("is-curtain", curtain);
  document.body.classList.toggle("is-between", state.phase === "result");
  if (state.backgroundId) document.body.dataset.stage = state.backgroundId;
  else delete document.body.dataset.stage;
  document.body.classList.toggle("is-over", state.phase === "over");
  document.body.classList.toggle("is-camera-prompt", cam.camera === "prompt");
  document.body.classList.toggle("is-camera-denied", cam.camera === "denied" || cam.camera === "unavailable" || cam.camera === "error");
  document.body.classList.toggle("is-camera-ready", cameraReady || cam.camera === "loading");

  if (headline) {
    headline.textContent = headlineFor(state);
    headline.classList.toggle("is-fail", missed);
    headline.classList.toggle("is-split", splitRound);
  }

  if (lede) {
    lede.textContent = ledeFor(state);
  }

  if (scoreboard) {
    scoreboard.hidden = state.phase === "start";
  }

  const duo = state.playerMode === "2p";
  const scores = state.scores ?? { p1: state.score, p2: 0 };
  if (scoreValue) {
    scoreValue.textContent = String(duo ? scores.p1 + scores.p2 : scores.p1);
  }
  if (scoreP1) scoreP1.textContent = String(scores.p1);
  if (scoreP2) scoreP2.textContent = String(scores.p2);
  if (scoreSolo instanceof HTMLElement) scoreSolo.hidden = duo;
  if (scoreDuo instanceof HTMLElement) scoreDuo.hidden = !duo;

  if (scoreline) {
    scoreline.classList.toggle("is-fail", missed);
    scoreline.classList.toggle("is-split", splitRound);
    scoreline.setAttribute(
      "aria-label",
      duo ? `P1 ${scores.p1}, P2 ${scores.p2}` : `Score ${scores.p1}`,
    );
  }
  if (scoreP1Wrap instanceof HTMLElement) {
    scoreP1Wrap.classList.toggle("is-fail", playerMissed(state, "p1"));
    scoreP1Wrap.classList.toggle("is-win", playerWon(state, "p1"));
  }
  if (scoreP2Wrap instanceof HTMLElement) {
    scoreP2Wrap.classList.toggle("is-fail", playerMissed(state, "p2"));
    scoreP2Wrap.classList.toggle("is-win", playerWon(state, "p2"));
  }

  if (roundline) {
    roundline.textContent = roundlineFor(state);
    roundline.classList.toggle("is-fail", missed);
  }

  if (statusEl) {
    statusEl.classList.toggle("is-fail", missed);
    statusEl.classList.toggle("is-split", splitRound);
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
    startBtn.hidden = cameraReady;
    startBtn.disabled = cameraBusy;
    const offerCamera = cam.camera === "prompt" || cameraBusy;
    startBtn.classList.toggle("primary", offerCamera && !missed);
    startBtn.classList.toggle("ghost", !offerCamera || missed);
    if (cameraBusy) startBtn.textContent = "Starting…";
    else if (cam.camera === "prompt" && cam.permission === "granted") startBtn.textContent = "Start camera";
    else if (cam.camera === "prompt") startBtn.textContent = "Allow camera";
    else startBtn.textContent = "Try camera again";
  }

  if (sessionMenu instanceof HTMLElement) {
    sessionMenu.hidden = !atGate;
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

  syncModeButtons();

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
  if (state.phase === "result" && state.result === "split") return splitHeadline(state);
  if (state.phase === "result" && state.result === "fail") return "Miss";
  if (state.phase === "result" && state.result === "win") return "Nice";
  if (state.phase === "prompt" || state.phase === "playing") return state.prompt || "Water plant";
  return "Short games";
}

/**
 * @param {import("./game/index.js").GameState} state
 */
function ledeFor(state) {
  if (state.phase === "over") {
    if (state.playerMode === "2p") {
      const scores = state.scores ?? { p1: state.score, p2: 0 };
      return `Session over. P1 ${scores.p1} · P2 ${scores.p2}. Play again for another short run.`;
    }
    return "Session over. Play again for another short run.";
  }
  if (state.phase === "result" && state.result === "split") {
    return `${splitHeadline(state)}. Scores stay separate — a split win only counts for that player.`;
  }
  if (state.phase === "result" && state.result === "win") {
    if (state.layout === "coop" && state.playerMode === "2p") {
      return state.game >= state.games
        ? "Shared win. Both scores go up. Session wrapping up."
        : "Shared win. Both scores go up. Next game incoming.";
    }
    return state.game >= state.games ? "Got it. Session wrapping up." : "Got it. Next game incoming.";
  }
  if (state.phase === "result") {
    return state.game >= state.games ? "Timed out. Session wrapping up." : "Timed out. Next game incoming.";
  }
  if (state.phase === "prompt") return "Curtain up. Get ready.";
  if (state.phase === "playing") return ledeForGame(state);
  return "Open, allow the camera, play. The top-right menu saves a playlist and 1P/2P. Hold a hand over the corner Play mark, or click Play. A longer curtain, a big title, then about 18 seconds. When a camera body is live, the camera is the only player. Pointer and keyboard still play if the camera is off.";
}

/**
 * @param {import("./game/index.js").GameState} state
 */
function ledeForGame(state) {
  const gameId = state.gameId;
  const split = state.layout === "split";
  if (gameId === "water-plant") {
    return split ? "Each side has a pot and a plant. Water yours." : "Hover the pot, carry it over the plant.";
  }
  if (gameId === "feed-pet") {
    return split ? "Each side has a bowl and a pet. Feed yours." : "Hover the bowl, carry it over the pet.";
  }
  if (gameId === "douse-fire") {
    return split ? "Each side has a bucket and a fire. Douse yours." : "Hover the bucket, carry it over the fire.";
  }
  if (gameId === "stomp-bug") return split ? "Each side has a bug. Stomp yours." : "Hover an ankle over the bug, or stomp through it.";
  if (gameId === "duck-beam") return "Drop your hips or head under the beam.";
  if (gameId === "jump-bar") return "Pop your hips or head up over the bar.";
  if (gameId === "strike-pose") return "Hold both wrists on the glowing anchors.";
  if (gameId === "lean-away") return "Lean your torso toward the lit side.";
  if (gameId === "clap-now") return "When the mark lights, clap — or tap it.";
  if (gameId === "score-goal") return split ? "Each side has a ball and a goal. Score yours." : "Kick the ball so it rolls into the goal.";
  if (gameId === "stretch-wide") return "Stretch your wrists apart, or tag both posts.";
  if (gameId === "high-five") return "Slap the high zone with a wrist.";
  if (gameId === "catch-fruit") return "Catch the falling fruit with a wrist.";
  if (gameId === "wave-hello") return "Hold a wrist up above your head.";
  if (gameId === "squash-it") return "Put both hands on the zone, or dwell with the pointer.";
  if (gameId === "balance-tray") return "Keep the tray level and carry it to the mark.";
  if (gameId === "mirror-me") return "Copy the other wrists in the middle, or hold the ghost marks.";
  if (gameId === "hot-potato") return "Pass the potato in the middle. Offer with both hands, then one hand accepts.";
  if (gameId === "shoot-hoops") return "Flick a wrist to toss the ball through the hoop.";
  if (gameId === "roll-dough") return "Both hands on the pin, then roll it up and down.";
  return split ? "Each side has a target. Hit yours." : "One hit. Timer is live.";
}

/**
 * @param {import("./game/index.js").GameState} state
 */
function roundlineFor(state) {
  if (state.phase === "over") {
    if (state.playerMode === "2p") {
      const scores = state.scores ?? { p1: state.score, p2: 0 };
      return `P1 ${scores.p1} · P2 ${scores.p2} · ${state.games} games`;
    }
    return `${state.score} hit${state.score === 1 ? "" : "s"} · ${state.games} games`;
  }
  return `Game ${state.game} of ${state.games}`;
}

/**
 * @param {import("./game/index.js").GameState} state
 * @param {{ camera: string }} cam
 */
function statusFor(state, cam) {
  if (state.phase === "over") {
    if (state.playerMode === "2p") {
      const scores = state.scores ?? { p1: state.score, p2: 0 };
      return `P1 ${scores.p1} · P2 ${scores.p2} across ${state.games} games.`;
    }
    return `${state.score} hit${state.score === 1 ? "" : "s"} across ${state.games} games.`;
  }
  if (state.phase === "result" && state.result === "split") {
    return state.game >= state.games ? `${splitHeadline(state)}. Session complete.` : `${splitHeadline(state)}. Game ${state.game + 1} next.`;
  }
  if (state.phase === "result" && state.result === "win") {
    const note = state.layout === "coop" && state.playerMode === "2p" ? "Both score. " : "";
    return state.game >= state.games ? `${note}Nice. Session complete.` : `${note}Nice. Game ${state.game + 1} next.`;
  }
  if (state.phase === "result") {
    return state.game >= state.games ? "Miss. Session complete." : `Miss. Game ${state.game + 1} next.`;
  }
  if (state.phase === "playing" && state.timeLeft != null) {
    const live = liveSplitNote(state);
    return live
      ? `Game ${state.game} of ${state.games} · ${state.timeLeft.toFixed(1)}s left · ${live}`
      : `Game ${state.game} of ${state.games} · ${state.timeLeft.toFixed(1)}s left`;
  }
  if (state.phase === "prompt") {
    if (cam.camera !== "ready") {
      return `Game ${state.game} of ${state.games}. ${state.prompt}. Pointer and keyboard work.`;
    }
    return `Game ${state.game} of ${state.games}. ${state.prompt}.`;
  }
  if (cam.camera === "denied" || cam.camera === "unavailable" || cam.camera === "error") {
    return "Camera is off. Hold Play or press Play to use the pointer or keyboard.";
  }
  return "Allow the camera, then hold Play or press Play.";
}

/**
 * @param {import("./game/index.js").GameState} state
 */
function splitHeadline(state) {
  const p1 = state.playerResults?.p1 === "win" ? "P1 nice" : "P1 miss";
  const p2 = state.playerResults?.p2 === "win" ? "P2 nice" : "P2 miss";
  return `${p1} · ${p2}`;
}

/**
 * @param {import("./game/index.js").GameState} state
 */
function liveSplitNote(state) {
  if (state.layout !== "split" || state.playerMode !== "2p") return "";
  const p1 = state.playerResults?.p1;
  const p2 = state.playerResults?.p2;
  if (p1 === "win" && p2 !== "win" && p2 !== "fail") return "P1 scored — P2 still playing";
  if (p2 === "win" && p1 !== "win" && p1 !== "fail") return "P2 scored — P1 still playing";
  return "";
}

/**
 * @param {import("./game/index.js").GameState} state
 * @param {"p1" | "p2"} player
 */
function playerMissed(state, player) {
  if (state.phase !== "result" && state.phase !== "over") return false;
  return state.playerResults?.[player] === "fail";
}

/**
 * @param {import("./game/index.js").GameState} state
 * @param {"p1" | "p2"} player
 */
function playerWon(state, player) {
  return state.playerResults?.[player] === "win";
}

/**
 * @param {{ camera: string, permission: string, message: string }} cam
 * @param {import("./game/index.js").GameState} state
 */
function cameraKickerFor(cam, state) {
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

/**
 * @param {import("./game/index.js").PlaylistSettings} next
 */
function applySettings(next) {
  settings = savePlaylist(storage, next, DEFAULT_PACK);
  game.configure(sessionOptionsFromPlaylist(settings, DEFAULT_PACK));
  renderPlaylist();
  syncModeButtons();
}

function syncModeButtons() {
  const one = settings.playerMode === "1p";
  if (mode1pBtn instanceof HTMLButtonElement) {
    mode1pBtn.classList.toggle("is-on", one);
    mode1pBtn.setAttribute("aria-pressed", one ? "true" : "false");
  }
  if (mode2pBtn instanceof HTMLButtonElement) {
    mode2pBtn.classList.toggle("is-on", !one);
    mode2pBtn.setAttribute("aria-pressed", one ? "false" : "true");
  }
}

function renderPlaylist() {
  if (!(playlistEl instanceof HTMLOListElement)) return;
  playlistEl.replaceChildren();
  const titles = new Map(DEFAULT_PACK.map((def) => [def.id, def.title ?? def.prompt]));
  const enabledCount = settings.games.filter((entry) => entry.enabled).length;
  settings.games.forEach((entry, index) => {
    const row = document.createElement("li");
    row.className = entry.enabled ? "playlist-row" : "playlist-row is-off";
    row.dataset.id = entry.id;

    const pick = document.createElement("label");
    pick.className = "playlist-pick";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = entry.enabled;
    box.disabled = entry.enabled && enabledCount <= 1;
    box.addEventListener("change", () => {
      applySettings(setPlaylistEnabled(settings, entry.id, box.checked));
    });
    const name = document.createElement("span");
    name.textContent = titles.get(entry.id) ?? entry.id;
    pick.append(box, name);

    const up = document.createElement("button");
    up.type = "button";
    up.className = "btn ghost";
    up.textContent = "Up";
    up.disabled = index === 0;
    up.setAttribute("aria-label", `Move ${name.textContent} up`);
    up.addEventListener("click", () => {
      applySettings(movePlaylistGame(settings, entry.id, -1));
    });

    const down = document.createElement("button");
    down.type = "button";
    down.className = "btn ghost";
    down.textContent = "Down";
    down.disabled = index === settings.games.length - 1;
    down.setAttribute("aria-label", `Move ${name.textContent} down`);
    down.addEventListener("click", () => {
      applySettings(movePlaylistGame(settings, entry.id, 1));
    });

    row.append(pick, up, down);
    playlistEl.append(row);
  });
}

function onResize() {
  renderer.resize();
  renderer.draw(game.getState());
}

window.addEventListener("resize", onResize);
renderer.resize();
renderPlaylist();
syncModeButtons();
updateHud(game.getState());
requestAnimationFrame(frame);
