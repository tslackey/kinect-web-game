/**
 * Draws the current game state onto the existing canvas.
 * Each pose map is its own stick figure. Orb games draw the crystal;
 * water-the-plant draws pot, plant, and a pour cue; feed-the-pet draws
 * bowl, pet, and a feed cue. Facet tokens stay.
 */

import { STICK_BONES } from "../input/joints.js";
import { posesFromSample } from "../input/poses.js";
import { HIT_RADIUS, TARGET_LIFETIME } from "../game/index.js";
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
      } else if (state.scene?.kind === "feed-pet") {
        drawFeedScene(state);
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
    const scale = grown ? 2.1 : 1.25;
    const alpha = gated ? 0.55 : missed ? 0.5 : 1;
    const stem = missed ? FACET.coral : FACET.moss;
    const leaf = missed ? FACET_STEPS.coralBone : FACET_STEPS.mossBone;
    const bloom = missed ? FACET.coral : FACET.lilac;
    const zone = HIT_RADIUS * Math.min(width, height);

    ctx.save();
    ctx.globalAlpha = alpha;
    const ring = hexVertices(x, y, zone);
    ctx.beginPath();
    ring.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    });
    ctx.closePath();
    ctx.strokeStyle = `rgba(${missed ? FACET_RGB.coral : FACET_RGB.moss}, ${gated ? 0.25 : 0.55})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = stem;
    ctx.lineWidth = grown ? 6 : 4.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y + 22 * scale);
    ctx.lineTo(x, y - 26 * scale);
    ctx.stroke();

    fillDiamond(ctx, x - 16 * scale, y - 4 * scale, 9 * scale, leaf);
    fillDiamond(ctx, x + 17 * scale, y - 10 * scale, 9 * scale, leaf);
    if (grown) {
      fillDiamond(ctx, x - 20 * scale, y - 24 * scale, 10 * scale, leaf);
      fillDiamond(ctx, x + 20 * scale, y - 28 * scale, 10 * scale, leaf);
      fillDiamond(ctx, x, y - 40 * scale, 12 * scale, bloom);
    } else {
      fillDiamond(ctx, x, y - 28 * scale, 7 * scale, bloom);
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
    const zone = HIT_RADIUS * Math.min(width, height);

    ctx.save();
    ctx.globalAlpha = alpha;
    const ring = hexVertices(x, y, zone);
    ctx.beginPath();
    ring.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    });
    ctx.closePath();
    ctx.strokeStyle = `rgba(${missed ? FACET_RGB.coral : held ? FACET_RGB.ember : FACET_RGB.lilac}, ${held ? 0.85 : gated ? 0.28 : 0.7})`;
    ctx.lineWidth = held ? 3 : 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 22, y - 8);
    ctx.lineTo(x + 18, y - 8);
    ctx.lineTo(x + 15, y + 22);
    ctx.lineTo(x - 18, y + 22);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x - 26, y - 14);
    ctx.lineTo(x + 22, y - 14);
    ctx.lineTo(x + 22, y - 5);
    ctx.lineTo(x - 26, y - 5);
    ctx.closePath();
    ctx.fillStyle = lip;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + 18, y - 10);
    ctx.quadraticCurveTo(x + 38, y - 18, x + 42, y + 4);
    ctx.lineTo(x + 34, y + 4);
    ctx.quadraticCurveTo(x + 30, y - 8, x + 18, y - 2);
    ctx.closePath();
    ctx.fillStyle = spout;
    ctx.fill();
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
  function drawFeedScene(state) {
    const scene = state.scene;
    if (!scene || scene.kind !== "feed-pet") return;
    const gated = state.phase === "prompt";
    const missed = state.phase === "over" || (state.phase === "result" && state.result === "fail");
    const won = state.phase === "result" && state.result === "win";
    const happy = scene.pet.stage >= 1 || won;
    drawPet(scene.pet, { happy, missed, gated });
    if (scene.feeding || won) {
      drawFeed(scene.bowl, scene.pet, state.elapsed);
    }
    drawBowl(scene.bowl, { held: scene.bowl.held, gated, missed });
  }

  /**
   * @param {{ x: number, y: number }} pet
   * @param {{ happy: boolean, missed: boolean, gated: boolean }} look
   */
  function drawPet(pet, { happy, missed, gated }) {
    const x = pet.x * width;
    const y = pet.y * height;
    const scale = happy ? 1.35 : 1;
    const alpha = gated ? 0.55 : missed ? 0.5 : 1;
    const body = missed ? FACET.coral : happy ? FACET.moss : FACET.lilac;
    const muzzle = missed ? FACET_STEPS.coralBone : happy ? FACET_STEPS.mossBone : FACET_STEPS.lilacBone;
    const ear = missed ? FACET.coral : happy ? FACET.ember : FACET.sky;
    const zone = HIT_RADIUS * Math.min(width, height);

    ctx.save();
    ctx.globalAlpha = alpha;
    const ring = hexVertices(x, y, zone);
    ctx.beginPath();
    ring.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    });
    ctx.closePath();
    ctx.strokeStyle = `rgba(${missed ? FACET_RGB.coral : happy ? FACET_RGB.moss : FACET_RGB.lilac}, ${gated ? 0.25 : 0.55})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    const earLift = happy ? -28 : -16;
    const earSpread = happy ? 18 : 14;
    fillDiamond(ctx, x - earSpread * scale, y + (earLift + 4) * scale, 8 * scale, ear);
    fillDiamond(ctx, x + earSpread * scale, y + earLift * scale, 8 * scale, ear);

    fillDiamond(ctx, x, y + 6 * scale, 20 * scale, body);
    fillDiamond(ctx, x, y - 10 * scale, 13 * scale, muzzle);

    ctx.strokeStyle = missed ? FACET.coral : happy ? FACET.moss : FACET.lilac;
    ctx.lineWidth = happy ? 5 : 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 16 * scale, y + 8 * scale);
    ctx.quadraticCurveTo(
      x + 30 * scale,
      y + (happy ? -10 : 18) * scale,
      x + 26 * scale,
      y + (happy ? -22 : 22) * scale,
    );
    ctx.stroke();

    const eyeY = y - 12 * scale;
    fillDiamond(ctx, x - 5 * scale, eyeY, 2.4 * scale, FACET.ink);
    fillDiamond(ctx, x + 5 * scale, eyeY, 2.4 * scale, FACET.ink);

    if (happy) {
      fillDiamond(ctx, x, y - 32 * scale, 7 * scale, FACET.ember);
    } else {
      fillDiamond(ctx, x, y - 2 * scale, 3.2 * scale, FACET.coral);
    }
    ctx.restore();
  }

  /**
   * @param {{ x: number, y: number, held?: boolean }} bowl
   * @param {{ held: boolean, gated: boolean, missed: boolean }} look
   */
  function drawBowl(bowl, { held, gated, missed }) {
    const x = bowl.x * width;
    const y = bowl.y * height;
    const alpha = gated ? 0.45 : missed ? 0.55 : 1;
    const dish = missed ? FACET.coral : held ? FACET.ember : FACET.lilac;
    const lip = missed ? FACET_STEPS.coralBone : held ? FACET_STEPS.emberBone : FACET_STEPS.lilacBone;
    const kibble = missed ? FACET.coral : FACET.ember;
    const zone = HIT_RADIUS * Math.min(width, height);

    ctx.save();
    ctx.globalAlpha = alpha;
    const ring = hexVertices(x, y, zone);
    ctx.beginPath();
    ring.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    });
    ctx.closePath();
    ctx.strokeStyle = `rgba(${missed ? FACET_RGB.coral : held ? FACET_RGB.ember : FACET_RGB.lilac}, ${held ? 0.85 : gated ? 0.28 : 0.7})`;
    ctx.lineWidth = held ? 3 : 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(x, y + 6, 26, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = dish;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x, y, 28, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = lip;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x, y + 1, 18, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = FACET.ink;
    ctx.fill();

    fillDiamond(ctx, x - 6, y + 1, 3.2, kibble);
    fillDiamond(ctx, x + 5, y + 2, 2.8, kibble);
    fillDiamond(ctx, x, y - 1, 2.4, FACET.sky);
    ctx.restore();
  }

  /**
   * @param {{ x: number, y: number }} bowl
   * @param {{ x: number, y: number }} pet
   * @param {number} elapsed
   */
  function drawFeed(bowl, pet, elapsed) {
    const x0 = bowl.x * width;
    const y0 = bowl.y * height - 4;
    const x1 = pet.x * width;
    const y1 = pet.y * height + 8;
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 10);

    ctx.save();
    ctx.strokeStyle = `rgba(${FACET_RGB.ember}, ${0.35 + pulse * 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 24, x1, y1);
    ctx.stroke();

    for (let i = 0; i < 4; i += 1) {
      const t = (i / 4 + (elapsed * 1.6) % 1) % 1;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * -18;
      fillDiamond(ctx, x, y, 3.4, `rgba(${FACET_RGB.ember}, ${0.45 + pulse * 0.4})`);
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
