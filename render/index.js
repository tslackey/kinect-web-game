/**
 * Draws the current game state onto the existing canvas.
 * Webcam joints become a stick figure; the orb is the one verb.
 */

import { STICK_BONES } from "../input/joints.js";
import { TARGET_LIFETIME } from "../game/index.js";

/**
 * @typedef {import("../game/index.js").GameState} GameState
 * @typedef {import("../input/index.js").Joint} Joint
 */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ reducedMotion?: boolean }} [options]
 */
export function createRenderer(canvas, { reducedMotion = false } = {}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context is not available.");
  }

  let width = 0;
  let height = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  /**
   * @param {GameState} state
   */
  function draw(state) {
    ctx.clearRect(0, 0, width, height);
    drawFlashVeil(state);
    drawSkeleton(state.pose?.joints);
    if (state.phase !== "start") {
      drawTarget(state);
    }
    drawMarker(state);
    drawFlash(state);
  }

  /**
   * @param {Record<string, Joint> | undefined | null} joints
   */
  function drawSkeleton(joints) {
    if (!joints) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(61, 255, 154, 0.78)";

    for (const [from, to] of STICK_BONES) {
      const a = joints[from];
      const b = joints[to];
      if (!usable(a) || !usable(b)) continue;
      ctx.beginPath();
      ctx.moveTo(a.x * width, a.y * height);
      ctx.lineTo(b.x * width, b.y * height);
      ctx.stroke();
    }

    const nose = joints.nose;
    const leftShoulder = joints.left_shoulder;
    const rightShoulder = joints.right_shoulder;
    if (usable(nose) && usable(leftShoulder) && usable(rightShoulder)) {
      ctx.beginPath();
      ctx.moveTo(nose.x * width, nose.y * height);
      ctx.lineTo(
        ((leftShoulder.x + rightShoulder.x) / 2) * width,
        ((leftShoulder.y + rightShoulder.y) / 2) * height,
      );
      ctx.stroke();
    }

    for (const [name, joint] of Object.entries(joints)) {
      if (name === "pointer" || !usable(joint)) continue;
      const radius = name === "nose" || name.endsWith("wrist") ? 7 : 4.5;
      ctx.beginPath();
      ctx.arc(joint.x * width, joint.y * height, radius, 0, Math.PI * 2);
      ctx.fillStyle =
        name.endsWith("wrist") || name === "nose"
          ? "rgba(61, 255, 154, 0.95)"
          : "rgba(232, 242, 236, 0.88)";
      ctx.fill();
    }
  }

  /**
   * @param {GameState} state
   */
  function drawTarget(state) {
    const { target, phase, timeLeft, elapsed, lifetime } = state;
    const x = target.x * width;
    const y = target.y * height;
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 5);
    const gated = phase === "start" || phase === "over";
    const missed = phase === "between" || phase === "over";
    const limit = lifetime ?? TARGET_LIFETIME;
    const remaining = phase === "playing" && timeLeft != null ? timeLeft / limit : 1;
    const hue = missed ? [255, 107, 107] : remaining < 0.35 ? [255, 196, 84] : [61, 255, 154];
    const [r, g, b] = hue;
    const alpha = gated ? 0.22 : missed ? 0.45 : 0.85 + pulse * 0.15;

    const ringX = Math.min(width, height) * 0.055;
    const ringY = ringX;
    ctx.beginPath();
    ctx.ellipse(x, y, ringX, ringY, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${gated || missed ? 0.16 : 0.22 + pulse * 0.14})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 7]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(x, y, 36, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, remaining));
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${gated || missed ? 0.28 : 0.9})`;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 18 + pulse * 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.55)`;
    ctx.shadowBlur = 22;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = missed ? "rgba(20, 8, 8, 0.85)" : "#052015";
    ctx.fill();
  }

  /**
   * @param {GameState} state
   */
  function drawMarker(state) {
    const x = state.marker.x * width;
    const y = state.marker.y * height;
    const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * 4);
    const missed = state.phase === "between" || state.phase === "over";
    const color = missed ? "255, 107, 107" : "61, 255, 154";

    ctx.beginPath();
    ctx.arc(x, y, 28 + pulse * 10, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${color}, ${0.18 + pulse * 0.22})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color}, 0.95)`;
    ctx.shadowColor = `rgba(${color}, 0.55)`;
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = "#052015";
    ctx.fill();
  }

  /**
   * @param {GameState} state
   */
  function drawFlashVeil(state) {
    const flash = state.flash;
    if (!flash) return;
    const age = state.elapsed - flash.at;
    const window = flash.kind === "hit" ? 0.14 : 0.22;
    if (age < 0 || age > window) return;
    const fade = 1 - age / window;
    const color =
      flash.kind === "hit" ? "61, 255, 154" : flash.kind === "over" ? "255, 107, 107" : "255, 168, 110";
    const strength = reducedMotion ? 0.04 : flash.kind === "hit" ? 0.14 : 0.1;
    ctx.fillStyle = `rgba(${color}, ${strength * fade})`;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * @param {GameState} state
   */
  function drawFlash(state) {
    const flash = state.flash;
    if (!flash) return;
    const age = state.elapsed - flash.at;
    if (age < 0 || age > 0.55) return;

    const t = age / 0.55;
    const fade = 1 - t;
    const x = flash.x * width;
    const y = flash.y * height;
    const hit = flash.kind === "hit";
    const color = hit ? "61, 255, 154" : "255, 107, 107";
    const ring = reducedMotion ? 28 : 22 + t * 92;

    ctx.beginPath();
    ctx.arc(x, y, ring, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${color}, ${0.15 + fade * 0.75})`;
    ctx.lineWidth = reducedMotion ? 3 : Math.max(1.5, 7 * fade);
    ctx.stroke();

    if (hit && !reducedMotion) {
      for (let i = 0; i < 8; i += 1) {
        const seed = flash.id * 17 + i * 41;
        const angle = unit(seed) * Math.PI * 2;
        const dist = (18 + unit(seed + 3) * 36) * (0.35 + t);
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 2.4 * fade, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 242, 236, ${fade})`;
        ctx.fill();
      }
    }

    if (hit) {
      const lift = reducedMotion ? 18 : 16 + t * 42;
      ctx.font = `700 ${Math.round(Math.min(width, height) * 0.05)}px "Bebas Neue", "Arial Narrow", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(61, 255, 154, ${fade})`;
      ctx.fillText("+1", x, y - lift);
    }
  }

  return { resize, draw };
}

/**
 * @param {number} seed
 */
function unit(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * @param {Joint | undefined} joint
 */
function usable(joint) {
  return Boolean(joint && Number.isFinite(joint.x) && Number.isFinite(joint.y));
}
