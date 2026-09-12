/**
 * Draws the current game state onto the existing canvas.
 * Webcam joints become a stick figure; the marker still shows game aim.
 */

import { STICK_BONES } from "../input/joints.js";

/**
 * @typedef {import("../game/index.js").GameState} GameState
 * @typedef {import("../input/index.js").Joint} Joint
 */

/**
 * @param {HTMLCanvasElement} canvas
 */
export function createRenderer(canvas) {
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
    drawSkeleton(state.pose?.joints);
    drawMarker(state);
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
  function drawMarker(state) {
    const x = state.marker.x * width;
    const y = state.marker.y * height;
    const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * 4);

    ctx.beginPath();
    ctx.arc(x, y, 28 + pulse * 10, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(61, 255, 154, ${0.18 + pulse * 0.22})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(61, 255, 154, 0.95)";
    ctx.shadowColor = "rgba(61, 255, 154, 0.55)";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = "#052015";
    ctx.fill();
  }

  return { resize, draw };
}

/**
 * @param {Joint | undefined} joint
 */
function usable(joint) {
  return Boolean(joint && Number.isFinite(joint.x) && Number.isFinite(joint.y));
}
