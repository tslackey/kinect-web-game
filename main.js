import { createInput } from "./input/index.js";
import { createGame } from "./game/index.js";
import { createRenderer } from "./render/index.js";

const canvas = document.getElementById("motion-field");
const statusEl = document.getElementById("status");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Expected #motion-field canvas.");
}

const input = createInput();
const game = createGame();
const renderer = createRenderer(canvas);

let lastTime = performance.now();
let lastHudAt = 0;

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
  if (!statusEl) return;
  const seconds = state.elapsed.toFixed(1);
  statusEl.textContent = `${state.inputSource} · tick ${state.ticks} · ${seconds}s`;
}

function onResize() {
  renderer.resize();
  renderer.draw(game.getState());
}

window.addEventListener("resize", onResize);
renderer.resize();
requestAnimationFrame(frame);
