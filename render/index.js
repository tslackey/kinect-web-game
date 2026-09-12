/**
 * Draws the current game state onto the existing canvas.
 * Each pose map is its own stick figure. Orb games draw the crystal;
 * water-the-plant draws pot, plant, and a pour cue. Facet tokens stay.
 */

import { STICK_BONES } from "../input/joints.js";
import { posesFromSample } from "../input/poses.js";
import { TARGET_LIFETIME } from "../game/index.js";
import { FACET, FACET_RGB, FACET_STEPS, PLAYER_RGB, hexToRgb } from "../theme/facet.js";

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
    const poses = posesFromSample(state.pose);
    poses.forEach((pose, index) => {
      drawSkeleton(pose.joints, PLAYER_RGB[index % PLAYER_RGB.length], pose.id);
    });
    if (state.phase !== "start") {
      if (state.scene?.kind === "water-plant") {
        drawWaterScene(state);
      } else {
        drawTarget(state);
      }
    }
    drawMarkers(state);
    drawFlash(state);
  }

  /**
   * @param {Record<string, Joint> | undefined | null} joints
   * @param {string} rgb
   * @param {string} [label]
   */
  function drawSkeleton(joints, rgb, label) {
    if (!joints) return;

    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    ctx.miterLimit = 3;
    ctx.lineWidth = 5;
    ctx.strokeStyle = `rgba(${rgb}, 0.92)`;

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
      const fill =
        name.endsWith("wrist") || name === "nose" ? `rgb(${rgb})` : FACET.bone;
      fillDiamond(ctx, joint.x * width, joint.y * height, radius, fill);
    }

    const tag = usable(nose) ? nose : Object.values(joints).find((joint) => usable(joint));
    if (label && tag) {
      ctx.font = '700 14px "Bebas Neue", "Arial Narrow", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = `rgb(${rgb})`;
      ctx.fillText(label.toUpperCase(), tag.x * width, tag.y * height - 12);
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
    const gated = phase === "start" || phase === "over" || phase === "prompt";
    const missed = phase === "over" || (phase === "result" && state.result === "fail");
    const limit = lifetime ?? TARGET_LIFETIME;
    const remaining = phase === "playing" && timeLeft != null ? timeLeft / limit : 1;
    const palette = missed ? coralCrystal() : remaining < 0.35 ? emberCrystal() : mossCrystal();
    const alpha = gated ? 0.28 : missed ? 0.55 : 0.96;
    const size = 22 + (gated || missed ? 0 : pulse * 3);

    ctx.globalAlpha = alpha;
    drawCrystal(ctx, x, y, size, palette);
    ctx.globalAlpha = 1;

    const hex = hexVertices(x, y, 36);
    ctx.beginPath();
    hex.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    });
    ctx.closePath();
    ctx.strokeStyle = `rgba(${hexToRgb(palette.stroke).css}, ${gated || missed ? 0.35 : 0.9})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    if (phase === "playing" && remaining < 1) {
      const ticks = Math.max(1, Math.ceil(6 * remaining));
      for (let i = 0; i < ticks; i += 1) {
        const a0 = -Math.PI / 2 + (i / 6) * Math.PI * 2;
        const a1 = -Math.PI / 2 + ((i + 0.72) / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a0) * 42, y + Math.sin(a0) * 42);
        ctx.lineTo(x + Math.cos(a1) * 42, y + Math.sin(a1) * 42);
        ctx.strokeStyle = palette.stroke;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }

  /**
   * @param {GameState} state
   */
  function drawWaterScene(state) {
    const scene = state.scene;
    if (!scene || scene.kind !== "water-plant") return;
    const gated = state.phase === "prompt";
    const missed = state.phase === "over" || (state.phase === "result" && state.result === "fail");
    const won = state.phase === "result" && state.result === "win";
    const grown = scene.plant.stage >= 1 || won;
    drawPlant(scene.plant, { grown, missed, gated });
    if (scene.pouring || won) {
      drawPour(scene.pot, scene.plant, state.elapsed);
    }
    drawPot(scene.pot, { held: scene.pot.held, gated, missed });
  }

  /**
   * @param {{ x: number, y: number }} plant
   * @param {{ grown: boolean, missed: boolean, gated: boolean }} look
   */
  function drawPlant(plant, { grown, missed, gated }) {
    const x = plant.x * width;
    const y = plant.y * height;
    const scale = grown ? 1.45 : 0.78;
    const alpha = gated ? 0.55 : missed ? 0.5 : 1;
    const stem = missed ? FACET.coral : FACET.moss;
    const leaf = missed ? FACET_STEPS.coralBone : FACET_STEPS.mossBone;
    const bloom = missed ? FACET.coral : FACET.lilac;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = stem;
    ctx.lineWidth = grown ? 5 : 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y + 18 * scale);
    ctx.lineTo(x, y - 22 * scale);
    ctx.stroke();

    fillDiamond(ctx, x - 12 * scale, y - 6 * scale, 7 * scale, leaf);
    fillDiamond(ctx, x + 13 * scale, y - 10 * scale, 7 * scale, leaf);
    if (grown) {
      fillDiamond(ctx, x - 16 * scale, y - 22 * scale, 8 * scale, leaf);
      fillDiamond(ctx, x + 16 * scale, y - 26 * scale, 8 * scale, leaf);
      fillDiamond(ctx, x, y - 34 * scale, 9 * scale, bloom);
    } else {
      fillDiamond(ctx, x, y - 24 * scale, 5 * scale, bloom);
    }
    ctx.restore();
  }

  /**
   * @param {{ x: number, y: number, held?: boolean }} pot
   * @param {{ held: boolean, gated: boolean, missed: boolean }} look
   */
  function drawPot(pot, { held, gated, missed }) {
    const x = pot.x * width;
    const y = pot.y * height;
    const alpha = gated ? 0.45 : missed ? 0.55 : 1;
    const body = missed ? FACET.coral : held ? FACET.ember : FACET.lilac;
    const lip = missed ? FACET_STEPS.coralBone : FACET_STEPS.emberBone;
    const spout = missed ? FACET.coral : FACET.sky;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(x - 16, y - 6);
    ctx.lineTo(x + 14, y - 6);
    ctx.lineTo(x + 11, y + 16);
    ctx.lineTo(x - 13, y + 16);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x - 18, y - 10);
    ctx.lineTo(x + 16, y - 10);
    ctx.lineTo(x + 16, y - 4);
    ctx.lineTo(x - 18, y - 4);
    ctx.closePath();
    ctx.fillStyle = lip;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + 14, y - 8);
    ctx.quadraticCurveTo(x + 28, y - 14, x + 30, y + 2);
    ctx.lineTo(x + 24, y + 2);
    ctx.quadraticCurveTo(x + 22, y - 6, x + 14, y - 2);
    ctx.closePath();
    ctx.fillStyle = spout;
    ctx.fill();

    if (held) {
      const ring = hexVertices(x, y, 26);
      ctx.beginPath();
      ring.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      });
      ctx.closePath();
      ctx.strokeStyle = `rgba(${FACET_RGB.ember}, 0.7)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * @param {{ x: number, y: number }} pot
   * @param {{ x: number, y: number }} plant
   * @param {number} elapsed
   */
  function drawPour(pot, plant, elapsed) {
    const x0 = pot.x * width + 26;
    const y0 = pot.y * height + 2;
    const x1 = plant.x * width;
    const y1 = plant.y * height - 8;
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 10);

    ctx.save();
    ctx.strokeStyle = `rgba(${FACET_RGB.sky}, ${0.35 + pulse * 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 24, x1, y1);
    ctx.stroke();

    for (let i = 0; i < 4; i += 1) {
      const t = (i / 4 + (elapsed * 1.6) % 1) % 1;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * -18;
      fillDiamond(ctx, x, y, 3.4, `rgba(${FACET_RGB.sky}, ${0.45 + pulse * 0.4})`);
    }
    ctx.restore();
  }

  /**
   * @param {GameState} state
   */
  function drawMarkers(state) {
    const missed = state.phase === "over" || (state.phase === "result" && state.result === "fail");
    const markers = state.markers?.length ? state.markers : [{ id: "p1", x: state.marker.x, y: state.marker.y }];
    markers.forEach((marker, index) => {
      const color = missed ? FACET_RGB.coral : PLAYER_RGB[index % PLAYER_RGB.length];
      drawMarker(marker, color, state.elapsed);
    });
  }

  /**
   * @param {{ x: number, y: number }} marker
   * @param {string} color
   * @param {number} elapsed
   */
  function drawMarker(marker, color, elapsed) {
    const x = marker.x * width;
    const y = marker.y * height;
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 4);

    const ring = 22 + pulse * 6;
    const hex = hexVertices(x, y, ring);
    ctx.beginPath();
    hex.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    });
    ctx.closePath();
    ctx.strokeStyle = `rgba(${color}, 0.45)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    fillDiamond(ctx, x, y, 8, `rgb(${color})`);
    fillDiamond(ctx, x, y, 2.5, FACET.ink);
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
      flash.kind === "hit" ? FACET_RGB.moss : flash.kind === "over" ? FACET_RGB.coral : FACET_RGB.ember;
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
    const color = hit ? FACET_RGB.moss : FACET_RGB.coral;
    const ring = reducedMotion ? 28 : 22 + t * 92;
    const hex = hexVertices(x, y, ring);

    ctx.beginPath();
    hex.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    });
    ctx.closePath();
    ctx.strokeStyle = `rgba(${color}, ${0.2 + fade * 0.75})`;
    ctx.lineWidth = reducedMotion ? 3 : Math.max(1.5, 6 * fade);
    ctx.stroke();

    if (hit && !reducedMotion) {
      for (let i = 0; i < 8; i += 1) {
        const seed = flash.id * 17 + i * 41;
        const angle = unit(seed) * Math.PI * 2;
        const dist = (18 + unit(seed + 3) * 36) * (0.35 + t);
        fillDiamond(
          ctx,
          x + Math.cos(angle) * dist,
          y + Math.sin(angle) * dist,
          3.2 * fade,
          `rgba(${FACET_RGB.bone}, ${fade})`,
        );
      }
    }

    if (hit) {
      const lift = reducedMotion ? 18 : 16 + t * 42;
      ctx.font = `700 ${Math.round(Math.min(width, height) * 0.05)}px "Bebas Neue", "Arial Narrow", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(${FACET_RGB.moss}, ${fade})`;
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

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {string} fill
 */
function fillDiamond(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @returns {number[][]}
 */
function hexVertices(cx, cy, r) {
  /** @type {number[][]} */
  const points = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 3;
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  return points;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {{ top: string, topRight: string, right: string, bottom: string, left: string, topLeft: string }} palette
 */
function drawCrystal(ctx, cx, cy, r, palette) {
  const verts = hexVertices(cx, cy, r);
  const center = [cx, cy];
  const fills = [palette.top, palette.topRight, palette.right, palette.bottom, palette.left, palette.topLeft];
  for (let i = 0; i < 6; i += 1) {
    ctx.beginPath();
    ctx.moveTo(center[0], center[1]);
    ctx.lineTo(verts[i][0], verts[i][1]);
    ctx.lineTo(verts[(i + 1) % 6][0], verts[(i + 1) % 6][1]);
    ctx.closePath();
    ctx.fillStyle = fills[i];
    ctx.fill();
  }
}

function mossCrystal() {
  return {
    top: FACET_STEPS.mossBone,
    topRight: FACET.moss,
    right: FACET.lilac,
    bottom: FACET_STEPS.lilacInk,
    left: FACET.sky,
    topLeft: FACET_STEPS.skyInk,
    stroke: FACET.moss,
  };
}

function emberCrystal() {
  return {
    top: FACET_STEPS.emberBone,
    topRight: FACET.ember,
    right: FACET.lilac,
    bottom: FACET_STEPS.emberInk,
    left: FACET.sky,
    topLeft: FACET_STEPS.skyInk,
    stroke: FACET.ember,
  };
}

function coralCrystal() {
  return {
    top: FACET_STEPS.coralBone,
    topRight: FACET.coral,
    right: FACET_STEPS.lilacInk,
    bottom: FACET_STEPS.coralInk,
    left: FACET.coral,
    topLeft: FACET.ink,
    stroke: FACET.coral,
  };
}
