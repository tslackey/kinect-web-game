/**
 * Facet low-poly marks for the simple-pack microgames.
 * Local units; origin is the hit center. Light from upper-left.
 * No gradients, arcs, or soft curves — triangles and hard edges only.
 */

import { FACET, FACET_RGB } from "../theme/facet.js";
import { drawCrystal, drawFaces, drawOfferedCue, facetShade, fillTri, strokeHex } from "./facet.js";
import { impactFaces, stompFootFaces } from "./stomp.js";

/**
 * @typedef {import("./facet.js").Face} Face
 * @typedef {import("./facet.js").Pt} Pt
 */

/**
 * @param {{ missed?: boolean, ready?: boolean, hue?: "moss" | "sky" | "lilac" | "ember" | "coral" }} look
 */
export function simpleShade({ missed = false, ready = false, hue = "sky" } = {}) {
  if (missed) return facetShade("coral");
  if (ready) return facetShade("moss");
  return facetShade(hue);
}

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
  const elapsed = Number.isFinite(state.elapsed) ? state.elapsed : 0;
  const alpha = gated ? 0.35 : missed ? 0.55 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;

  if (scene.kind === "duck-beam") {
    drawBeam(ctx, width, height, scene.beam.y, scene.ducked || won, missed);
  } else if (scene.kind === "jump-bar") {
    drawBar(ctx, width, height, scene.bar.y, scene.cleared || won, missed);
  } else if (scene.kind === "strike-pose") {
    drawPoseAnchor(ctx, width, height, scene.left.x * width, scene.left.y * height, scene.left.held || won, missed);
    drawPoseAnchor(ctx, width, height, scene.right.x * width, scene.right.y * height, scene.right.held || won, missed);
  } else if (scene.kind === "lean-away") {
    drawLean(ctx, width, height, scene.side, scene.leaned || won, missed);
  } else if (scene.kind === "clap-now") {
    drawClap(ctx, width, height, scene.cue, scene.clapped || won, missed, elapsed);
  } else if (scene.kind === "score-goal") {
    drawGoalMouth(ctx, width, height, scene.goal, scene.kicking || won, missed);
    drawBall(ctx, width, height, scene.ball.x * width, scene.ball.y * height, scene.kicking || won, missed, elapsed, {
      hue: "sky",
      foot: true,
    });
  } else if (scene.kind === "shoot-hoops") {
    drawHoop(ctx, width, height, scene.hoop.x * width, scene.hoop.y * height, scene.shooting || won, missed);
    drawBall(ctx, width, height, scene.ball.x * width, scene.ball.y * height, scene.shooting || won, missed, elapsed, {
      hue: "ember",
      foot: false,
    });
  } else if (scene.kind === "stretch-wide") {
    drawStretchPost(ctx, width, height, scene.left.x * width, scene.left.y * height, scene.left.held || won, missed, -1);
    drawStretchPost(ctx, width, height, scene.right.x * width, scene.right.y * height, scene.right.held || won, missed, 1);
  } else if (scene.kind === "high-five") {
    drawHighFive(ctx, width, height, scene.zone.x * width, scene.zone.y * height, scene.slapped || won, missed, elapsed);
  } else if (scene.kind === "catch-fruit") {
    drawFruit(ctx, width, height, scene.fruit.x * width, scene.fruit.y * height, scene.caught || won, missed);
  } else if (scene.kind === "wave-hello") {
    drawWave(ctx, width, height, scene.waving || won, missed, elapsed);
  } else if (scene.kind === "squash-it") {
    drawSquash(ctx, width, height, scene.zone.x * width, scene.zone.y * height, scene.squashing || won, missed);
  } else if (scene.kind === "roll-dough") {
    drawDough(
      ctx,
      width,
      height,
      scene.dough.x * width,
      scene.dough.y * height,
      scene.dough.flatten,
      scene.rolling || won,
      missed,
    );
    drawPin(
      ctx,
      width,
      height,
      scene.left.x * width,
      scene.right.x * width,
      scene.pin.y * height,
      scene.pin.held || won,
      missed,
    );
  } else if (scene.kind === "balance-tray") {
    drawTrayGoal(ctx, width, height, scene.goal.x * width, scene.goal.y * height, scene.arriving || won, missed);
    drawTray(
      ctx,
      width,
      height,
      scene.tray.x * width,
      scene.tray.y * height,
      scene.tray.held || won,
      scene.tray.offered,
      scene.tray.tipped || missed,
      missed,
    );
  } else if (scene.kind === "mirror-me") {
    drawGhostMark(ctx, width, height, scene.left.x * width, scene.left.y * height, scene.left.held || won, missed);
    drawGhostMark(ctx, width, height, scene.right.x * width, scene.right.y * height, scene.right.held || won, missed);
  } else if (scene.kind === "hot-potato") {
    drawPotato(
      ctx,
      width,
      height,
      scene.potato.x * width,
      scene.potato.y * height,
      scene.potato.held || won,
      scene.potato.offered,
      missed,
    );
  } else if (scene.kind === "swat-fly") {
    drawFruit(ctx, width, height, scene.fly.x * width, scene.fly.y * height, scene.swatted || won, missed);
  } else if (scene.kind === "ring-bell") {
    drawHighFive(ctx, width, height, scene.bell.x * width, scene.bell.y * height, scene.rung || won, missed, elapsed);
  } else if (scene.kind === "freeze-dance") {
    drawClap(ctx, width, height, scene.cue, scene.frozen || won, missed, elapsed);
  } else if (scene.kind === "limbo-under") {
    drawBeam(ctx, width, height, scene.bar.y, scene.ducked || won, missed);
  } else if (scene.kind === "bow-king") {
    drawLean(ctx, width, height, "right", scene.bowed || won, missed);
  } else if (scene.kind === "cover-ears") {
    drawWave(ctx, width, height, scene.covering || won, missed, elapsed);
  } else if (scene.kind === "stir-pot") {
    drawDough(ctx, width, height, scene.pot.x * width, scene.pot.y * height, Math.min(1, scene.loops / 2), scene.stirring || won, missed);
  } else if (scene.kind === "block-it") {
    drawBall(ctx, width, height, scene.shot.x * width, scene.shot.y * height, scene.blocked || won, missed, elapsed, {
      hue: "ember",
      foot: false,
    });
    drawStretchPost(ctx, width, height, scene.shield.x * width, scene.shield.y * height, scene.blocked || won, missed, 1);
  } else if (scene.kind === "peek-binoculars") {
    drawGhostMark(ctx, width, height, scene.peeking || won ? width * 0.46 : width * 0.44, height * 0.22, scene.peeking || won, missed);
    drawGhostMark(ctx, width, height, scene.peeking || won ? width * 0.54 : width * 0.56, height * 0.22, scene.peeking || won, missed);
  } else if (scene.kind === "pat-dog") {
    drawFruit(ctx, width, height, scene.dog.x * width, scene.dog.y * height, scene.patting || won, missed);
  } else if (scene.kind === "pull-rope") {
    drawStretchPost(ctx, width, height, scene.handle.x * width, scene.handle.y * height, scene.handle.held || won, missed, 1);
  } else if (scene.kind === "pop-balloons") {
    for (const balloon of scene.balloons ?? []) {
      drawFruit(ctx, width, height, balloon.x * width, balloon.y * height, won, missed);
    }
  } else if (scene.kind === "brush-teeth") {
    drawWave(ctx, width, height, scene.brushing || won, missed, elapsed);
  } else if (scene.kind === "flap-wings") {
    drawWave(ctx, width, height, scene.flapping || won, missed, elapsed);
  } else if (scene.kind === "open-umbrella") {
    drawStretchPost(ctx, width, height, scene.left.x * width, scene.left.y * height, scene.left.held || won, missed, -1);
    drawStretchPost(ctx, width, height, scene.right.x * width, scene.right.y * height, scene.right.held || won, missed, 1);
  } else if (scene.kind === "stamp-passport") {
    drawSquash(ctx, width, height, scene.pad.x * width, scene.pad.y * height, scene.stamped || won, missed);
  } else if (scene.kind === "head-ball") {
    drawBall(ctx, width, height, scene.ball.x * width, scene.ball.y * height, scene.headed || won, missed, elapsed, {
      hue: "sky",
      foot: false,
    });
  } else if (scene.kind === "hop-foot") {
    drawBar(ctx, width, height, 0.62, scene.hopping || won, missed);
  } else if (scene.kind === "comb-hair") {
    drawWave(ctx, width, height, scene.combing || won, missed, elapsed);
  } else if (scene.kind === "knock-door") {
    drawSquash(ctx, width, height, scene.door.x * width, scene.door.y * height, scene.knocking || won, missed);
  } else if (scene.kind === "cheers-toast") {
    drawClap(ctx, width, height, scene.toasting, scene.toasting || won, missed, elapsed);
  } else if (scene.kind === "tug-of-war") {
    drawPin(ctx, width, height, width * 0.32, width * 0.68, scene.rope.y * height, scene.tugging || won, missed);
  } else if (scene.kind === "dig-treasure") {
    drawDough(ctx, width, height, scene.pile.x * width, scene.pile.y * height, scene.found || won ? 1 : Math.min(1, (scene.digs ?? 0) / 3), scene.found || won, missed);
  } else if (scene.kind === "skip-rope") {
    drawBar(ctx, width, height, scene.rope.y, scene.jumping || won, missed);
  }

  ctx.restore();
}

/**
 * @param {number} width
 * @param {number} height
 */
function unit(width, height) {
  return Math.min(width, height) / 400;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} zone
 * @param {string} rgb
 * @param {number} alpha
 * @param {number} [lineWidth]
 */
function drawHitRing(ctx, x, y, zone, rgb, alpha, lineWidth = 2) {
  strokeHex(ctx, x, y, zone, `rgba(${rgb}, ${alpha})`, lineWidth);
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
  const s = unit(width, height);
  const body = simpleShade({ missed, ready: ducked, hue: "ember" });
  const rgb = missed ? FACET_RGB.coral : ducked ? FACET_RGB.moss : FACET_RGB.ember;

  const left = width * 0.1;
  const right = width * 0.9;
  const thick = 18 * s;
  fillTri(ctx, [left, py - thick], [right, py - thick * 0.45], [left, py], body.lit);
  fillTri(ctx, [left, py], [right, py - thick * 0.45], [right, py + thick * 0.55], body.mid);
  fillTri(ctx, [left, py], [right, py + thick * 0.55], [left, py + thick], body.shade);
  if (ducked) {
    fillTri(ctx, [width * 0.42, py - thick * 0.2], [width * 0.58, py - thick * 0.2], [width * 0.5, py + thick * 0.15], FACET.bone);
  }

  drawFaces(ctx, left, py, 2.7 * s, beamPylonFaces(body, 1, missed));
  drawFaces(ctx, right, py, 2.7 * s, beamPylonFaces(body, -1, missed));
  drawHitRing(ctx, left, py, 26 * s, rgb, ducked ? 0.75 : 0.45, ducked ? 3 : 2);
  drawHitRing(ctx, right, py, 26 * s, rgb, ducked ? 0.75 : 0.45, ducked ? 3 : 2);
}

/**
 * Side emitter for the duck beam. `fx` +1 faces right.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {number} fx
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function beamPylonFaces(body, fx, missed) {
  const flip = (pts) => pts.map(([x, y]) => /** @type {Pt} */ ([x * fx, y]));
  const spark = missed ? FACET.coral : FACET.bone;
  return [
    { pts: flip([[-10, 22], [6, 18], [0, 32]]), fill: body.shade },
    { pts: flip([[-10, 22], [-8, -8], [6, 18]]), fill: body.mid },
    { pts: flip([[-8, -8], [8, -4], [6, 18]]), fill: body.lit },
    { pts: flip([[-8, -8], [0, -26], [8, -4]]), fill: body.lit },
    { pts: flip([[8, -4], [0, -26], [14, -10]]), fill: body.shade },
    { pts: flip([[8, -2], [28, 0], [10, 8]]), fill: body.mid },
    { pts: flip([[8, -2], [22, -10], [28, 0]]), fill: spark },
    { pts: flip([[-4, -4], [2, -2], [-2, 6]]), fill: FACET.ink },
  ];
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
  const s = unit(width, height);
  const body = simpleShade({ missed, ready: cleared, hue: "sky" });
  const post = simpleShade({ missed, ready: cleared, hue: "moss" });
  const left = width * 0.2;
  const right = width * 0.8;
  const thick = 14 * s;

  fillTri(ctx, [left, py - thick], [right, py - thick * 0.4], [left, py + 2], body.lit);
  fillTri(ctx, [left, py + 2], [right, py - thick * 0.4], [right, py + thick], body.shade);
  fillTri(ctx, [left + 8, py - 4], [right - 8, py - 2], [width * 0.5, py + 6], body.mid);

  drawFaces(ctx, left, py, 2.7 * s, hurdlePostFaces(post, 1, missed));
  drawFaces(ctx, right, py, 2.7 * s, hurdlePostFaces(post, -1, missed));
}

/**
 * Jump hurdle post. `fx` +1 is the left post.
 *
 * @param {ReturnType<typeof facetShade>} post
 * @param {number} fx
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function hurdlePostFaces(post, fx, missed) {
  const flip = (pts) => pts.map(([x, y]) => /** @type {Pt} */ ([x * fx, y]));
  const flag = missed ? FACET.coral : FACET.ember;
  return [
    { pts: flip([[-8, 26], [-2, -22], [2, 26]]), fill: post.lit },
    { pts: flip([[-2, -22], [8, -16], [2, 26]]), fill: post.shade },
    { pts: flip([[-12, 24], [10, 20], [0, 34]]), fill: post.shade },
    { pts: flip([[-10, -18], [0, -32], [10, -14]]), fill: post.mid },
    { pts: flip([[2, -20], [22, -28], [8, -10]]), fill: flag },
    { pts: flip([[8, -10], [22, -28], [20, -8]]), fill: missed ? FACET.coral : FACET.bone },
  ];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} x
 * @param {number} y
 * @param {boolean} held
 * @param {boolean} missed
 */
function drawPoseAnchor(ctx, width, height, x, y, held, missed) {
  const s = unit(width, height);
  const zone = 32 * s;
  const body = simpleShade({ missed, ready: held, hue: "lilac" });
  const rgb = missed ? FACET_RGB.coral : held ? FACET_RGB.moss : FACET_RGB.lilac;
  drawHitRing(ctx, x, y, zone, rgb, held ? 0.8 : 0.5, held ? 3 : 2);
  drawFaces(ctx, x, y, 2.2 * s, poseStarFaces(body, missed));
  drawCrystal(ctx, x, y, 14 * s, held || missed ? (missed ? coralCue() : mossCue()) : lilacCue());
}

/**
 * Pose target shards around the crystal.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function poseStarFaces(body, missed) {
  const tip = missed ? FACET.coral : FACET.bone;
  return [
    { pts: [[0, -22], [-8, -8], [8, -8]], fill: body.lit },
    { pts: [[18, 0], [8, -8], [8, 8]], fill: body.mid },
    { pts: [[0, 22], [8, 8], [-8, 8]], fill: body.shade },
    { pts: [[-18, 0], [-8, 8], [-8, -8]], fill: body.shade },
    { pts: [[-10, -16], [-18, -20], [-6, -8]], fill: tip },
    { pts: [[12, -14], [20, -18], [8, -6]], fill: tip },
  ];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {"left" | "right"} side
 * @param {boolean} leaned
 * @param {boolean} missed
 */
function drawLean(ctx, width, height, side, leaned, missed) {
  const s = unit(width, height);
  const fx = side === "left" ? -1 : 1;
  const x = side === "left" ? width * 0.18 : width * 0.82;
  const y = height * 0.5;
  const body = simpleShade({ missed, ready: leaned, hue: "ember" });
  drawFaces(ctx, x, y, 3.8 * s, leanChevronFaces(body, fx, missed));
}

/**
 * Lean-away chevrons. `fx` +1 points right.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {number} fx
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function leanChevronFaces(body, fx, missed) {
  const flip = (pts) => pts.map(([x, y]) => /** @type {Pt} */ ([x * fx, y]));
  const edge = missed ? FACET.coral : FACET.bone;
  return [
    { pts: flip([[-16, -28], [22, 0], [-16, 28]]), fill: body.mid },
    { pts: flip([[-16, -28], [6, 0], [-16, -4]]), fill: body.lit },
    { pts: flip([[-16, 4], [6, 0], [-16, 28]]), fill: body.shade },
    { pts: flip([[-6, -16], [14, 0], [-6, 16]]), fill: body.lit },
    { pts: flip([[-28, -12], [-8, 0], [-28, 12]]), fill: body.shade },
    { pts: flip([[10, -6], [24, 0], [10, 6]]), fill: edge },
  ];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {boolean} cue
 * @param {boolean} clapped
 * @param {boolean} missed
 * @param {number} elapsed
 */
function drawClap(ctx, width, height, cue, clapped, missed, elapsed) {
  const s = unit(width, height);
  const x = width * 0.5;
  const y = height * 0.42;
  const body = simpleShade({ missed, ready: clapped, hue: cue ? "ember" : "lilac" });
  const gap = clapped ? 14 * s : cue ? 28 * s : 40 * s;
  const pulse = cue && !clapped ? 1 + 0.06 * Math.sin(elapsed * 10) : 1;
  const rgb = missed ? FACET_RGB.coral : clapped ? FACET_RGB.moss : cue ? FACET_RGB.ember : FACET_RGB.lilac;
  drawHitRing(ctx, x, y, (cue ? 44 : 30) * s * pulse, rgb, cue ? 0.7 : 0.4, cue ? 3 : 2);
  drawFaces(ctx, x - gap, y, 2.7 * s * pulse, clapHandFaces(body, 1, missed));
  drawFaces(ctx, x + gap, y, 2.7 * s * pulse, clapHandFaces(body, -1, missed));
}

/**
 * Clap hand. `fx` +1 faces right (the left hand).
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {number} fx
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function clapHandFaces(body, fx, missed) {
  const flip = (pts) => pts.map(([x, y]) => /** @type {Pt} */ ([x * fx, y]));
  const nail = missed ? FACET.coral : FACET.bone;
  return [
    { pts: flip([[-14, -4], [6, -8], [4, 14]]), fill: body.lit },
    { pts: flip([[-14, -4], [4, 14], [-16, 12]]), fill: body.shade },
    { pts: flip([[-16, 8], [-6, 12], [-18, 22]]), fill: body.mid },
    { pts: flip([[4, -18], [14, -26], [10, -6]]), fill: body.lit },
    { pts: flip([[8, -8], [22, -12], [12, 2]]), fill: body.mid },
    { pts: flip([[8, 2], [22, 6], [10, 12]]), fill: body.mid },
    { pts: flip([[6, 10], [16, 20], [2, 16]]), fill: body.shade },
    { pts: flip([[-12, -8], [-24, -14], [-8, 2]]), fill: body.lit },
    { pts: flip([[12, -24], [16, -26], [14, -16]]), fill: nail },
  ];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} x
 * @param {number} y
 * @param {boolean} active
 * @param {boolean} missed
 * @param {number} elapsed
 * @param {{ hue?: "sky" | "ember", foot?: boolean }} [look]
 */
function drawBall(ctx, width, height, x, y, active, missed, elapsed, { hue = "sky", foot = false } = {}) {
  const s = unit(width, height);
  const zone = 30 * s;
  const body = simpleShade({ missed, ready: active, hue });
  const rgb = missed ? FACET_RGB.coral : active ? FACET_RGB.moss : FACET_RGB[hue];
  drawHitRing(ctx, x, y, zone, rgb, active ? 0.85 : 0.5, active ? 3 : 2);
  drawFaces(ctx, x, y, 2.4 * s, ballFaces(body, missed));
  if (active) {
    drawFaces(ctx, x, y, 2 * s, impactFaces(missed, elapsed));
    if (foot) drawFaces(ctx, x - 12 * s, y + 10 * s, 1.5 * s, stompFootFaces(missed));
  }
}

/**
 * Low-poly score / hoop ball. Upper-left panel is lit.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function ballFaces(body, missed) {
  const seam = missed ? FACET.coral : FACET.ink;
  const patch = missed ? FACET.coral : FACET.bone;
  return [
    { pts: [[0, -18], [-12, -8], [10, -10]], fill: body.lit },
    { pts: [[-12, -8], [-18, 4], [0, 2]], fill: body.mid },
    { pts: [[10, -10], [0, 2], [18, 2]], fill: body.mid },
    { pts: [[-18, 4], [0, 18], [0, 2]], fill: body.shade },
    { pts: [[18, 2], [0, 2], [0, 18]], fill: body.shade },
    { pts: [[-18, 4], [18, 2], [0, 18]], fill: body.shade },
    { pts: [[-6, -6], [6, -4], [0, 6]], fill: patch },
    { pts: [[-2, -2], [4, 0], [0, 4]], fill: seam },
  ];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {{ x0: number, y0: number, x1: number, y1: number }} goal
 * @param {boolean} ready
 * @param {boolean} missed
 */
function drawGoalMouth(ctx, width, height, goal, ready, missed) {
  const x0 = goal.x0 * width;
  const x1 = goal.x1 * width;
  const y0 = goal.y0 * height;
  const y1 = goal.y1 * height;
  const x = (x0 + x1) / 2;
  const y = (y0 + y1) / 2;
  const body = simpleShade({ missed, ready, hue: "moss" });
  const s = Math.min((x1 - x0) / 44, (y1 - y0) / 54);
  drawFaces(ctx, x, y, s, goalMouthFaces(body, missed));
}

/**
 * Soccer mouth: near/far posts, crossbar, net. Opening faces the field (−x).
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function goalMouthFaces(body, missed) {
  const net = missed ? FACET.coral : FACET.bone;
  const mesh = missed ? FACET.coral : FACET.mist;
  const flag = missed ? FACET.coral : FACET.ember;
  return [
    { pts: [[-20, 24], [-18, -24], [-12, 24]], fill: body.lit },
    { pts: [[-18, -24], [-12, -22], [-12, 24]], fill: body.shade },
    { pts: [[14, 20], [16, -18], [22, 20]], fill: body.mid },
    { pts: [[16, -18], [22, -16], [22, 20]], fill: body.shade },
    { pts: [[-18, -24], [16, -18], [-12, -18]], fill: body.lit },
    { pts: [[-12, -18], [16, -18], [22, -16]], fill: body.mid },
    { pts: [[-12, -16], [14, -12], [0, 2]], fill: net },
    { pts: [[-12, -2], [14, 2], [2, 16]], fill: mesh },
    { pts: [[-10, 14], [16, 12], [4, 22]], fill: body.shade },
    { pts: [[-20, 22], [22, 18], [0, 28]], fill: body.mid },
    { pts: [[12, -10], [22, -14], [20, 16]], fill: body.shade },
    { pts: [[-22, -24], [-12, -30], [-14, -18]], fill: flag },
  ];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} x
 * @param {number} y
 * @param {boolean} ready
 * @param {boolean} missed
 */
function drawHoop(ctx, width, height, x, y, ready, missed) {
  const s = unit(width, height);
  const body = simpleShade({ missed, ready, hue: "ember" });
  const rgb = missed ? FACET_RGB.coral : ready ? FACET_RGB.moss : FACET_RGB.ember;
  drawHitRing(ctx, x, y, 28 * s, rgb, ready ? 0.85 : 0.5, ready ? 3 : 2);
  drawFaces(ctx, x, y, 2.8 * s, hoopFaces(body, missed));
}

/**
 * Backboard, ember rim, hanging net. Opening stays at the hit center.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function hoopFaces(body, missed) {
  const rim = missed ? FACET.coral : FACET.ember;
  const board = missed ? facetShade("coral") : facetShade("lilac");
  const net = missed ? FACET.coral : FACET.mist;
  const shine = missed ? FACET.coral : FACET.bone;
  return [
    { pts: [[6, -6], [24, -26], [26, 8]], fill: board.mid },
    { pts: [[6, -6], [26, 8], [8, 10]], fill: board.shade },
    { pts: [[10, -18], [22, -24], [20, -4]], fill: board.lit },
    { pts: [[12, -16], [18, -20], [16, -6]], fill: shine },
    { pts: [[4, -2], [16, -8], [8, 4]], fill: body.shade },
    { pts: [[-16, 0], [0, -7], [16, 2]], fill: rim },
    { pts: [[-16, 0], [16, 2], [0, 7]], fill: body.shade },
    { pts: [[-8, 0], [8, 1], [0, 4]], fill: missed ? FACET.coral : FACET.ink },
    { pts: [[-12, 6], [0, 8], [-8, 20]], fill: net },
    { pts: [[12, 6], [0, 8], [8, 20]], fill: body.mid },
    { pts: [[-8, 20], [0, 8], [8, 20]], fill: body.shade },
    { pts: [[0, 10], [-4, 24], [4, 24]], fill: net },
  ];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} x
 * @param {number} heightY
 * @param {number} flatten
 * @param {boolean} rolling
 * @param {boolean} missed
 */
function drawDough(ctx, width, height, x, heightY, flatten, rolling, missed) {
  const s = unit(width, height);
  const body = simpleShade({ missed, ready: rolling, hue: "ember" });
  const rgb = missed ? FACET_RGB.coral : rolling ? FACET_RGB.moss : FACET_RGB.ember;
  const spread = Math.min(1, Math.max(0, flatten));
  drawHitRing(ctx, x, heightY, (36 + 10 * spread) * s, rgb, rolling ? 0.7 : 0.4, rolling ? 3 : 2);
  drawFaces(ctx, x, heightY, 3.2 * s, doughBlobFaces(body, missed, spread));
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} x0
 * @param {number} x1
 * @param {number} y
 * @param {boolean} held
 * @param {boolean} missed
 */
function drawPin(ctx, width, height, x0, x1, y, held, missed) {
  const s = unit(width, height);
  const body = simpleShade({ missed, ready: held, hue: "sky" });
  const rgb = missed ? FACET_RGB.coral : held ? FACET_RGB.moss : FACET_RGB.sky;
  const mid = (x0 + x1) / 2;
  drawHitRing(ctx, x0, y, 22 * s, rgb, held ? 0.8 : 0.45, held ? 3 : 2);
  drawHitRing(ctx, x1, y, 22 * s, rgb, held ? 0.8 : 0.45, held ? 3 : 2);
  drawFaces(ctx, mid, y, 2.4 * s, doughPinFaces(body, missed));
}

/**
 * Rolling pin barrel with Bone grips. Light from upper-left.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function doughPinFaces(body, missed) {
  const grip = missed ? FACET.coral : FACET.bone;
  const band = missed ? FACET.coral : FACET.ember;
  return [
    { pts: [[-20, -6], [20, -8], [20, 0]], fill: body.lit },
    { pts: [[-20, -6], [20, 0], [-20, 6]], fill: body.shade },
    { pts: [[-16, -4], [16, -4], [0, 4]], fill: body.mid },
    { pts: [[-4, -7], [4, -7], [0, 1]], fill: band },
    { pts: [[-28, -3], [-20, -8], [-20, 6]], fill: grip },
    { pts: [[-32, -1], [-28, -6], [-26, 5]], fill: body.shade },
    { pts: [[28, -2], [20, -8], [20, 6]], fill: grip },
    { pts: [[32, 1], [28, -6], [26, 6]], fill: body.mid },
  ];
}

/**
 * Lumpy dough. `flatten` 0 is a mound; 1 is a wide pancake (visual only).
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {boolean} missed
 * @param {number} [flatten]
 * @returns {Face[]}
 */
export function doughBlobFaces(body, missed, flatten = 0) {
  const t = Math.min(1, Math.max(0, flatten));
  const sx = 1 + 0.55 * t;
  const sy = 1 - 0.5 * t;
  const map = (pts) => pts.map(([x, y]) => /** @type {Pt} */ ([x * sx, y * sy]));
  const flour = missed ? FACET.coral : FACET.bone;
  return [
    { pts: map([[0, -16], [-18, 0], [2, 4]]), fill: body.lit },
    { pts: map([[0, -16], [18, -2], [2, 4]]), fill: body.mid },
    { pts: map([[-18, 0], [2, 4], [0, 16]]), fill: body.shade },
    { pts: map([[18, -2], [2, 4], [0, 16]]), fill: body.shade },
    { pts: map([[-10, -6], [6, -10], [4, 2]]), fill: body.lit },
    { pts: map([[10, -14], [20, -18], [16, -4]]), fill: body.mid },
    { pts: map([[-16, 6], [16, 8], [0, 18]]), fill: body.shade },
    { pts: map([[-4, -4], [4, -2], [0, 4]]), fill: flour },
  ];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} x
 * @param {number} y
 * @param {boolean} held
 * @param {boolean} missed
 * @param {number} fx
 */
function drawStretchPost(ctx, width, height, x, y, held, missed, fx) {
  const s = unit(width, height);
  const body = simpleShade({ missed, ready: held, hue: "sky" });
  const rgb = missed ? FACET_RGB.coral : held ? FACET_RGB.moss : FACET_RGB.sky;
  drawHitRing(ctx, x, y, 30 * s, rgb, held ? 0.8 : 0.45, held ? 3 : 2);
  drawFaces(ctx, x, y, 2.6 * s, stretchPostFaces(body, fx, missed));
}

/**
 * Reach handle. `fx` +1 is the right post (handle faces inward).
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {number} fx
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function stretchPostFaces(body, fx, missed) {
  const flip = (pts) => pts.map(([x, y]) => /** @type {Pt} */ ([x * fx, y]));
  const grip = missed ? FACET.coral : FACET.ember;
  return [
    { pts: flip([[-6, 24], [-2, -20], [2, 24]]), fill: body.lit },
    { pts: flip([[-2, -20], [6, -16], [2, 24]]), fill: body.shade },
    { pts: flip([[-14, -8], [4, -12], [4, 2]]), fill: body.mid },
    { pts: flip([[4, -12], [16, -6], [4, 2]]), fill: body.shade },
    { pts: flip([[-16, -6], [-4, -10], [-4, 4]]), fill: grip },
    { pts: flip([[-10, -22], [0, -32], [8, -18]]), fill: body.lit },
  ];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} x
 * @param {number} y
 * @param {boolean} slapped
 * @param {boolean} missed
 * @param {number} elapsed
 */
function drawHighFive(ctx, width, height, x, y, slapped, missed, elapsed) {
  const s = unit(width, height);
  const body = simpleShade({ missed, ready: slapped, hue: "lilac" });
  const rgb = missed ? FACET_RGB.coral : slapped ? FACET_RGB.moss : FACET_RGB.lilac;
  drawHitRing(ctx, x, y, 34 * s, rgb, slapped ? 0.85 : 0.5, slapped ? 3 : 2);
  drawFaces(ctx, x, y, 2.6 * s, highFiveHandFaces(body, missed));
  if (slapped) drawFaces(ctx, x, y, 2 * s, impactFaces(missed, elapsed));
}

/**
 * Open palm facing the player.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function highFiveHandFaces(body, missed) {
  const nail = missed ? FACET.coral : FACET.bone;
  return [
    { pts: [[-12, 4], [0, -8], [12, 6]], fill: body.lit },
    { pts: [[-12, 4], [12, 6], [0, 18]], fill: body.shade },
    { pts: [[-10, -6], [-14, -24], [-2, -8]], fill: body.lit },
    { pts: [[-2, -8], [-4, -28], [6, -8]], fill: body.mid },
    { pts: [[6, -8], [8, -26], [14, -4]], fill: body.mid },
    { pts: [[12, 0], [20, -16], [16, 8]], fill: body.shade },
    { pts: [[-14, 6], [-24, 2], [-10, 14]], fill: body.lit },
    { pts: [[-14, -22], [-12, -24], [-8, -10]], fill: nail },
    { pts: [[-4, -26], [-2, -28], [2, -10]], fill: nail },
  ];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} x
 * @param {number} y
 * @param {boolean} caught
 * @param {boolean} missed
 */
function drawFruit(ctx, width, height, x, y, caught, missed) {
  const s = unit(width, height);
  const body = simpleShade({ missed, ready: caught, hue: "ember" });
  const rgb = missed ? FACET_RGB.coral : caught ? FACET_RGB.moss : FACET_RGB.ember;
  drawHitRing(ctx, x, y, 30 * s, rgb, caught ? 0.8 : 0.5, caught ? 3 : 2);
  drawFaces(ctx, x, y, 2.5 * s, fruitFaces(body, missed));
}

/**
 * Faceted apple with a Moss leaf.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function fruitFaces(body, missed) {
  const leaf = missed ? facetShade("coral") : facetShade("moss");
  const stem = missed ? FACET.coral : FACET.ink;
  return [
    { pts: [[0, -14], [-16, 2], [0, 18]], fill: body.lit },
    { pts: [[0, -14], [16, 0], [0, 18]], fill: body.mid },
    { pts: [[-16, 2], [16, 0], [0, 18]], fill: body.shade },
    { pts: [[-6, -2], [2, -8], [4, 4]], fill: body.lit },
    { pts: [[0, -14], [-2, -24], [3, -16]], fill: stem },
    { pts: [[2, -16], [16, -22], [8, -8]], fill: leaf.lit },
    { pts: [[8, -8], [16, -22], [14, -6]], fill: leaf.shade },
  ];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {boolean} waving
 * @param {boolean} missed
 * @param {number} elapsed
 */
function drawWave(ctx, width, height, waving, missed, elapsed) {
  const s = unit(width, height);
  const x = width * 0.5;
  const y = height * 0.18;
  const body = simpleShade({ missed, ready: waving, hue: "sky" });
  const tilt = waving ? Math.sin(elapsed * 8) * 6 * s : 0;
  const rgb = missed ? FACET_RGB.coral : waving ? FACET_RGB.moss : FACET_RGB.sky;
  drawHitRing(ctx, x, y, 32 * s, rgb, waving ? 0.8 : 0.45, waving ? 3 : 2);
  drawFaces(ctx, x + tilt, y, 2.5 * s, waveHandFaces(body, missed));
  drawFaces(ctx, x, y - 36 * s, 2 * s, waveChevronFaces(body, missed));
}

/**
 * Waving hand, slightly tilted.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function waveHandFaces(body, missed) {
  const nail = missed ? FACET.coral : FACET.bone;
  return [
    { pts: [[-10, 8], [4, -6], [14, 10]], fill: body.lit },
    { pts: [[-10, 8], [14, 10], [0, 20]], fill: body.shade },
    { pts: [[0, -8], [-4, -24], [8, -6]], fill: body.lit },
    { pts: [[8, -6], [10, -26], [16, -2]], fill: body.mid },
    { pts: [[14, 0], [22, -14], [18, 10]], fill: body.shade },
    { pts: [[-12, 4], [-22, -2], [-8, 12]], fill: body.lit },
    { pts: [[-4, -22], [-2, -24], [4, -8]], fill: nail },
  ];
}

/**
 * Greeting chevrons above the wave hand.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function waveChevronFaces(body, missed) {
  const tip = missed ? FACET.coral : FACET.bone;
  return [
    { pts: [[-22, 8], [0, -10], [22, 8]], fill: body.mid },
    { pts: [[-22, 8], [-8, 2], [0, -10]], fill: body.lit },
    { pts: [[0, -10], [8, 2], [22, 8]], fill: body.shade },
    { pts: [[-14, 16], [0, 4], [14, 16]], fill: body.lit },
    { pts: [[-4, -2], [0, -10], [4, -2]], fill: tip },
  ];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} x
 * @param {number} y
 * @param {boolean} squashing
 * @param {boolean} missed
 */
function drawSquash(ctx, width, height, x, y, squashing, missed) {
  const s = unit(width, height);
  const body = simpleShade({ missed, ready: squashing, hue: "ember" });
  const rgb = missed ? FACET_RGB.coral : squashing ? FACET_RGB.moss : FACET_RGB.ember;
  const squash = squashing ? 0.72 : 1;
  drawHitRing(ctx, x, y, 38 * s, rgb, squashing ? 0.85 : 0.5, squashing ? 3 : 2);
  drawFaces(ctx, x, y, 2.6 * s, squashPadFaces(body, missed, squash));
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} x
 * @param {number} y
 * @param {boolean} arriving
 * @param {boolean} missed
 */
function drawTrayGoal(ctx, width, height, x, y, arriving, missed) {
  const s = unit(width, height);
  const body = simpleShade({ missed, ready: arriving, hue: "moss" });
  const rgb = missed ? FACET_RGB.coral : arriving ? FACET_RGB.moss : FACET_RGB.sky;
  drawHitRing(ctx, x, y, 32 * s, rgb, arriving ? 0.8 : 0.45, arriving ? 3 : 2);
  drawFaces(ctx, x, y, 2.4 * s, trayGoalFaces(body, missed));
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} x
 * @param {number} y
 * @param {boolean} held
 * @param {boolean} offered
 * @param {boolean} tipped
 * @param {boolean} missed
 */
function drawTray(ctx, width, height, x, y, held, offered, tipped, missed) {
  const s = unit(width, height);
  const fail = missed || tipped;
  const body = simpleShade({ missed: fail, ready: held && !tipped, hue: offered ? "sky" : "lilac" });
  drawOfferedCue(ctx, x, y, 34 * s, { missed: fail, held, offered });
  drawFaces(ctx, x, y, 2.5 * s, trayFaces(body, fail));
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} x
 * @param {number} y
 * @param {boolean} held
 * @param {boolean} offered
 * @param {boolean} missed
 */
function drawPotato(ctx, width, height, x, y, held, offered, missed) {
  const s = unit(width, height);
  const body = simpleShade({ missed, ready: held && !offered, hue: offered ? "sky" : "ember" });
  drawOfferedCue(ctx, x, y, 30 * s, { missed, held, offered });
  drawFaces(ctx, x, y, 2.4 * s, potatoFaces(body, missed));
}

function drawGhostMark(ctx, width, height, x, y, held, missed) {
  const s = unit(width, height);
  const zone = 32 * s;
  const body = simpleShade({ missed, ready: held, hue: "lilac" });
  const rgb = missed ? FACET_RGB.coral : held ? FACET_RGB.moss : FACET_RGB.lilac;
  drawHitRing(ctx, x, y, zone, rgb, held ? 0.8 : 0.5, held ? 3 : 2);
  drawFaces(ctx, x, y, 2.3 * s, ghostMarkFaces(body, missed));
}

/**
 * Copy / reflection kite. Split down the middle so it reads as a ghost, not a pose star.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function ghostMarkFaces(body, missed) {
  const glass = missed ? FACET.coral : FACET.mist;
  const echo = missed ? facetShade("coral") : facetShade("sky");
  const shine = missed ? FACET.coral : FACET.bone;
  return [
    { pts: [[0, -22], [-16, 0], [0, 2]], fill: body.lit },
    { pts: [[0, -22], [16, 0], [0, 2]], fill: echo.mid },
    { pts: [[-16, 0], [0, 22], [0, 2]], fill: body.shade },
    { pts: [[16, 0], [0, 22], [0, 2]], fill: echo.shade },
    { pts: [[-8, -10], [0, -18], [0, -4]], fill: shine },
    { pts: [[-18, -8], [-28, 0], [-14, 6]], fill: glass },
    { pts: [[18, -8], [28, 0], [14, 6]], fill: glass },
    { pts: [[-10, 12], [0, 26], [10, 12]], fill: echo.lit },
  ];
}

/**
 * Serving tray with a cup and a Moss level bead. Light from upper-left.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function trayFaces(body, missed) {
  const lip = missed ? FACET.coral : FACET.bone;
  const cup = missed ? facetShade("coral") : facetShade("ember");
  const bead = missed ? FACET.coral : FACET.moss;
  return [
    { pts: [[-24, 2], [0, -10], [24, 4]], fill: body.lit },
    { pts: [[-24, 2], [24, 4], [0, 14]], fill: body.shade },
    { pts: [[-16, 0], [16, 0], [0, 10]], fill: body.mid },
    { pts: [[-18, -2], [0, -14], [18, 0]], fill: lip },
    { pts: [[-28, 0], [-20, -6], [-18, 6]], fill: body.mid },
    { pts: [[-28, 0], [-18, 6], [-30, 8]], fill: body.shade },
    { pts: [[28, 2], [20, -4], [18, 8]], fill: body.mid },
    { pts: [[28, 2], [18, 8], [30, 10]], fill: body.shade },
    { pts: [[-6, -6], [0, -20], [2, 2]], fill: cup.lit },
    { pts: [[0, -20], [8, -4], [2, 2]], fill: cup.mid },
    { pts: [[-6, -6], [8, -4], [0, 4]], fill: cup.shade },
    { pts: [[-8, -18], [0, -24], [8, -16]], fill: lip },
    { pts: [[-4, 6], [0, 2], [4, 6]], fill: bead },
    { pts: [[-4, 6], [4, 6], [0, 10]], fill: missed ? FACET.coral : FACET.ink },
  ];
}

/**
 * Landing shelf the tray is carried to. Horizontal plate reads “set it down level.”
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function trayGoalFaces(body, missed) {
  const plate = missed ? FACET.coral : FACET.bone;
  const bead = missed ? FACET.coral : FACET.moss;
  return [
    { pts: [[-8, 24], [-2, -4], [2, 24]], fill: body.lit },
    { pts: [[-2, -4], [8, 0], [2, 24]], fill: body.shade },
    { pts: [[-12, 20], [12, 18], [0, 28]], fill: body.shade },
    { pts: [[-22, -2], [0, -14], [22, 0]], fill: body.mid },
    { pts: [[-22, -2], [22, 0], [0, 8]], fill: body.shade },
    { pts: [[-16, -4], [14, -6], [0, 2]], fill: plate },
    { pts: [[-10, -8], [0, -16], [10, -6]], fill: bead },
    { pts: [[-4, -10], [0, -14], [4, -8]], fill: plate },
  ];
}

/**
 * Lumpy hot potato with ember sparks and a Moss sprout.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function potatoFaces(body, missed) {
  const eye = missed ? FACET.coral : FACET.ink;
  const sprout = missed ? FACET.coral : FACET.moss;
  const spark = missed ? FACET.coral : FACET.bone;
  return [
    { pts: [[-6, -18], [-20, -4], [0, 0]], fill: body.lit },
    { pts: [[-6, -18], [12, -16], [0, 0]], fill: body.lit },
    { pts: [[12, -16], [22, 0], [0, 0]], fill: body.mid },
    { pts: [[-20, -4], [-22, 10], [0, 4]], fill: body.mid },
    { pts: [[22, 0], [16, 16], [0, 4]], fill: body.shade },
    { pts: [[-22, 10], [-8, 20], [0, 4]], fill: body.shade },
    { pts: [[-8, 20], [16, 16], [0, 4]], fill: body.shade },
    { pts: [[-10, -8], [6, -6], [0, 8]], fill: body.mid },
    { pts: [[-8, -16], [2, -28], [4, -12]], fill: spark },
    { pts: [[10, -14], [20, -24], [16, -8]], fill: body.lit },
    { pts: [[-8, -4], [-2, -2], [-4, 4]], fill: eye },
    { pts: [[6, -2], [12, 0], [8, 4]], fill: eye },
    { pts: [[4, -18], [10, -28], [12, -12]], fill: sprout },
  ];
}

/**
 * Press pad. `squash` < 1 flattens the plate (visual only).
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {boolean} missed
 * @param {number} [squash]
 * @returns {Face[]}
 */
export function squashPadFaces(body, missed, squash = 1) {
  const flatten = (pts) => pts.map(([x, y]) => /** @type {Pt} */ ([x, y * squash]));
  const plate = missed ? FACET.coral : FACET.bone;
  return [
    { pts: flatten([[-22, 4], [0, -8], [22, 6]]), fill: body.lit },
    { pts: flatten([[-22, 4], [22, 6], [0, 16]]), fill: body.shade },
    { pts: flatten([[-16, 2], [14, 0], [0, 10]]), fill: body.mid },
    { pts: flatten([[-10, -2], [0, -12], [10, 0]]), fill: plate },
    { pts: flatten([[-8, 12], [8, 12], [0, 20]]), fill: body.shade },
    { pts: flatten([[-26, 10], [-18, 4], [-14, 16]]), fill: body.shade },
    { pts: flatten([[26, 10], [18, 6], [14, 16]]), fill: body.mid },
  ];
}

function lilacCue() {
  return {
    top: FACET.bone,
    topRight: FACET.lilac,
    right: FACET.moss,
    bottom: FACET.ink,
    left: FACET.sky,
    topLeft: FACET.ember,
  };
}

function mossCue() {
  return {
    top: FACET.bone,
    topRight: FACET.moss,
    right: FACET.sky,
    bottom: FACET.ink,
    left: FACET.moss,
    topLeft: FACET.ember,
  };
}

function coralCue() {
  return {
    top: FACET.bone,
    topRight: FACET.coral,
    right: FACET.ink,
    bottom: FACET.ink,
    left: FACET.coral,
    topLeft: FACET.ember,
  };
}
