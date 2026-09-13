/**
 * Placeholder Facet marks for the simple-microgame sweep.
 * Readable enough to teach the verb; Shine skins later.
 */

import { FACET, FACET_STEPS } from "../theme/facet.js";
import { fillDiamond, fillPoly, strokeHex } from "./facet.js";

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {object} state
 */
export function drawSimpleScene(ctx, width, height, state) {
  const scene = state.scene;
  if (!scene) return;
  const gated = state.phase === "prompt" && (state.transition?.cover ?? 0) > 0.2;
  const missed = state.phase === "over" || (state.phase === "result" && state.result === "fail");
  const won = state.phase === "result" && state.result === "win";
  const alpha = gated ? 0.35 : missed ? 0.55 : 1;
  ctx.globalAlpha = alpha;

  if (scene.kind === "duck-beam") {
    drawBeam(ctx, width, height, scene.beam.y, scene.ducked || won, missed);
  } else if (scene.kind === "jump-bar") {
    drawBar(ctx, width, height, scene.bar.y, scene.cleared || won, missed);
  } else if (scene.kind === "strike-pose") {
    drawAnchor(ctx, scene.left.x * width, scene.left.y * height, scene.left.held || won);
    drawAnchor(ctx, scene.right.x * width, scene.right.y * height, scene.right.held || won);
  } else if (scene.kind === "lean-away") {
    drawLean(ctx, width, height, scene.side, scene.leaned || won);
  } else if (scene.kind === "clap-now") {
    drawClap(ctx, width, height, scene.cue, scene.clapped || won);
  } else if (scene.kind === "kick-ball") {
    drawBall(ctx, scene.ball.x * width, scene.ball.y * height, scene.kicking || won, missed);
  } else if (scene.kind === "stretch-wide") {
    drawAnchor(ctx, scene.left.x * width, scene.left.y * height, scene.left.held || won);
    drawAnchor(ctx, scene.right.x * width, scene.right.y * height, scene.right.held || won);
  } else if (scene.kind === "high-five") {
    drawHighFive(ctx, scene.zone.x * width, scene.zone.y * height, scene.slapped || won);
  } else if (scene.kind === "catch-fruit") {
    drawFruit(ctx, scene.fruit.x * width, scene.fruit.y * height, scene.caught || won, missed);
  } else if (scene.kind === "wave-hello") {
    drawWave(ctx, width, height, scene.waving || won);
  } else if (scene.kind === "squash-it") {
    drawSquash(ctx, scene.zone.x * width, scene.zone.y * height, scene.squashing || won);
  }

  ctx.globalAlpha = 1;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} y
 * @param {boolean} ducked
 * @param {boolean} missed
 */
function drawBeam(ctx, width, height, y, ducked, missed) {
  const py = y * height;
  ctx.fillStyle = missed ? FACET.coral : ducked ? FACET.moss : FACET.ember;
  ctx.fillRect(width * 0.08, py - 6, width * 0.84, 12);
  fillDiamond(ctx, width * 0.08, py, 10, FACET.bone);
  fillDiamond(ctx, width * 0.92, py, 10, FACET.bone);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} y
 * @param {boolean} cleared
 * @param {boolean} missed
 */
function drawBar(ctx, width, height, y, cleared, missed) {
  const py = y * height;
  ctx.fillStyle = missed ? FACET.coral : cleared ? FACET.moss : FACET.sky;
  ctx.fillRect(width * 0.18, py - 5, width * 0.64, 10);
  fillPoly(
    ctx,
    [
      [width * 0.16, py - 16],
      [width * 0.2, py + 16],
      [width * 0.14, py + 16],
    ],
    FACET_STEPS.skyInk,
  );
  fillPoly(
    ctx,
    [
      [width * 0.84, py - 16],
      [width * 0.86, py + 16],
      [width * 0.8, py + 16],
    ],
    FACET_STEPS.skyInk,
  );
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {boolean} held
 */
function drawAnchor(ctx, x, y, held) {
  strokeHex(ctx, x, y, 28, held ? FACET.moss : FACET.lilac, 3);
  fillDiamond(ctx, x, y, 10, held ? FACET.moss : FACET.bone);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {"left" | "right"} side
 * @param {boolean} leaned
 */
function drawLean(ctx, width, height, side, leaned) {
  const x = side === "left" ? width * 0.18 : width * 0.82;
  const color = leaned ? FACET.moss : FACET.ember;
  fillPoly(
    ctx,
    [
      [x, height * 0.28],
      [x + (side === "left" ? 48 : -48), height * 0.5],
      [x, height * 0.72],
    ],
    color,
  );
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {boolean} cue
 * @param {boolean} clapped
 */
function drawClap(ctx, width, height, cue, clapped) {
  const x = width * 0.5;
  const y = height * 0.42;
  const color = clapped ? FACET.moss : cue ? FACET.ember : FACET.mist;
  strokeHex(ctx, x, y, cue ? 40 : 26, color, 4);
  fillDiamond(ctx, x - 16, y, 9, color);
  fillDiamond(ctx, x + 16, y, 9, color);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {boolean} kicking
 * @param {boolean} missed
 */
function drawBall(ctx, x, y, kicking, missed) {
  const color = missed ? FACET.coral : kicking ? FACET.moss : FACET.bone;
  fillDiamond(ctx, x, y, 18, color);
  fillDiamond(ctx, x, y, 8, FACET.ink);
  strokeHex(ctx, x, y, 26, kicking ? FACET.moss : FACET.mist, 2);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {boolean} slapped
 */
function drawHighFive(ctx, x, y, slapped) {
  strokeHex(ctx, x, y, 32, slapped ? FACET.moss : FACET.lilac, 3);
  fillDiamond(ctx, x, y, 14, slapped ? FACET.moss : FACET_STEPS.lilacBone);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {boolean} caught
 * @param {boolean} missed
 */
function drawFruit(ctx, x, y, caught, missed) {
  const color = missed ? FACET.coral : caught ? FACET.moss : FACET.ember;
  fillPoly(
    ctx,
    [
      [x, y - 16],
      [x + 14, y + 4],
      [x, y + 16],
      [x - 14, y + 4],
    ],
    color,
  );
  fillDiamond(ctx, x, y - 18, 5, FACET.moss);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {boolean} waving
 */
function drawWave(ctx, width, height, waving) {
  const y = height * 0.16;
  ctx.fillStyle = waving ? FACET.moss : FACET.sky;
  ctx.fillRect(width * 0.22, y - 4, width * 0.56, 8);
  fillDiamond(ctx, width * 0.5, y, 12, waving ? FACET.moss : FACET.bone);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {boolean} squashing
 */
function drawSquash(ctx, x, y, squashing) {
  strokeHex(ctx, x, y, 42, squashing ? FACET.moss : FACET.ember, 4);
  fillDiamond(ctx, x, y, 16, squashing ? FACET.moss : FACET_STEPS.emberBone);
}
