/**
 * Draws the current game state onto the existing canvas.
 * Each pose map is its own stick figure. Orb games draw the crystal;
 * water-the-plant, feed-the-pet, and put-out-the-fire use Facet
 * low-poly marks (hard-edge triangles, token steps, upper-left light);
 * stomp-the-bug draws a Facet low-poly bug and stomp cue.
 * Interstitials use Facet theater drapes, a title placard, and stage sets.
 * Start and game-over draw the hand-hold Play mark with a progress ring.
 */

import { STICK_BONES } from "../input/joints.js";
import { posesFromSample } from "../input/poses.js";
import { HIT_RADIUS, TARGET_LIFETIME } from "../game/index.js";
import { FACET, FACET_RGB, PLAYER_RGB, hexToRgb } from "../theme/facet.js";
import {
  bucketLipOffset,
  canSpoutOffset,
  drawCarryBowl,
  drawCarryBucket,
  drawCarryCan,
  drawCarryFlame,
  drawCarryPet,
  drawCarryPlant,
  drawCarryStream,
} from "./carry.js";
import {
  coralCrystal,
  drawCrystal,
  emberCrystal,
  fillDiamond,
  mossCrystal,
  strokeHex,
} from "./facet.js";
import { drawCurtain, drawStageWash } from "./curtain.js";
import { drawSimpleScene } from "./simple.js";
import { drawStompBug } from "./stomp.js";

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
    if (state.phase !== "start") {
      drawStageWash(ctx, width, height, state.backgroundId);
    }
    drawFlashVeil(state);
    const poses = posesFromSample(state.pose);
    const footGame = state.scene?.kind === "stomp-bug" || state.scene?.kind === "kick-ball";
    poses.forEach((pose, index) => {
      drawSkeleton(pose.joints, PLAYER_RGB[index % PLAYER_RGB.length], pose.id, footGame);
    });
    if (state.phase !== "start") {
      if (state.scene?.kind === "water-plant") {
        drawWaterScene(state);
      } else if (state.scene?.kind === "feed-pet") {
        drawFeedScene(state);
      } else if (state.scene?.kind === "douse-fire") {
        drawFireScene(state);
      } else if (state.scene?.kind === "stomp-bug") {
        drawBugScene(state);
      } else if (state.scene?.kind) {
        drawSimpleScene(ctx, width, height, state);
      } else {
        drawTarget(state);
      }
    }
    drawMarkers(state);
    drawStartHold(state);
    drawFlash(state);
    if (state.transition && state.phase === "prompt") {
      drawCurtain(ctx, width, height, state.transition, { reducedMotion });
    }
  }

  /**
   * Facet dwell button. Start / game-over only. Progress fill resets
   * when the hand leaves — see game/start-dwell.js.
   *
   * @param {GameState} state
   */
  function drawStartHold(state) {
    const hold = state.startHold;
    if (!hold?.active) return;

    const x = hold.target.x * width;
    const y = hold.target.y * height;
    const zone = HIT_RADIUS * Math.min(width, height);
    const r = zone * 0.62;
    const palette = hold.hovering || hold.progress > 0 ? mossCrystal() : emberCrystal();

    ctx.globalAlpha = 0.94;
    drawCrystal(ctx, x, y, r * 0.72, palette);
    ctx.globalAlpha = 1;
    strokeHex(ctx, x, y, r, palette.stroke, 3);

    ctx.beginPath();
    ctx.strokeStyle = `rgba(${FACET_RGB.mist}, 0.45)`;
    ctx.lineWidth = 6;
    ctx.lineCap = "butt";
    ctx.arc(x, y, r * 0.88, 0, Math.PI * 2);
    ctx.stroke();

    if (hold.progress > 0) {
      ctx.beginPath();
      ctx.strokeStyle = FACET.moss;
      ctx.lineWidth = 6;
      ctx.arc(x, y, r * 0.88, -Math.PI / 2, -Math.PI / 2 + hold.progress * Math.PI * 2);
      ctx.stroke();
    }

    ctx.font = `700 ${Math.round(Math.min(width, height) * 0.032)}px "Bebas Neue", "Arial Narrow", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = FACET.bone;
    ctx.fillText(hold.label.toUpperCase(), x, y + r + 18);
  }

  /**
   * @param {Record<string, Joint> | undefined | null} joints
   * @param {string} rgb
   * @param {string} [label]
   * @param {boolean} [footGame]
   */
  function drawSkeleton(joints, rgb, label, footGame = false) {
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
      const strike =
        name.endsWith("wrist") || (footGame && name.endsWith("ankle"));
      const radius = name === "nose" || strike ? 7 : 4.5;
      const fill = strike || name === "nose" ? `rgb(${rgb})` : FACET.bone;
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
    const covered = (state.transition?.cover ?? 0) > 0.2;
    const gated = phase === "start" || phase === "over" || (phase === "prompt" && covered);
    const missed = phase === "over" || (phase === "result" && state.result === "fail");
    const limit = lifetime ?? TARGET_LIFETIME;
    const remaining = phase === "playing" && timeLeft != null ? timeLeft / limit : 1;
    const palette = missed ? coralCrystal() : remaining < 0.35 ? emberCrystal() : mossCrystal();
    const alpha = gated ? 0.28 : missed ? 0.55 : 0.96;
    const size = 22 + (gated || missed ? 0 : pulse * 3);

    ctx.globalAlpha = alpha;
    drawCrystal(ctx, x, y, size, palette);
    ctx.globalAlpha = 1;

    strokeHex(
      ctx,
      x,
      y,
      36,
      `rgba(${hexToRgb(palette.stroke).css}, ${gated || missed ? 0.35 : 0.9})`,
      3,
    );

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
    const gated = sceneGated(state);
    const missed = state.phase === "over" || (state.phase === "result" && state.result === "fail");
    const won = state.phase === "result" && state.result === "win";
    const grown = scene.plant.stage >= 1 || won;
    const face = scene.plant.x < scene.pot.x ? -1 : 1;
    drawPlant(scene.plant, { grown, missed, gated });
    if (scene.pouring || won) {
      drawPour(scene.pot, scene.plant, state.elapsed);
    }
    drawPot(scene.pot, { held: scene.pot.held, gated, missed, face });
  }

  /**
   * @param {{ x: number, y: number }} plant
   * @param {{ grown: boolean, missed: boolean, gated: boolean }} look
   */
  function drawPlant(plant, { grown, missed, gated }) {
    const zone = HIT_RADIUS * Math.min(width, height);
    drawCarryPlant(ctx, plant.x * width, plant.y * height, { grown, missed, gated }, zone);
  }

  /**
   * @param {{ x: number, y: number, held?: boolean }} pot
   * @param {{ held: boolean, gated: boolean, missed: boolean, face?: number }} look
   */
  function drawPot(pot, { held, gated, missed, face = 1 }) {
    const zone = HIT_RADIUS * Math.min(width, height);
    drawCarryCan(ctx, pot.x * width, pot.y * height, { held, gated, missed, face }, zone);
  }

  /**
   * @param {{ x: number, y: number }} pot
   * @param {{ x: number, y: number }} plant
   * @param {number} elapsed
   */
  function drawPour(pot, plant, elapsed) {
    const face = plant.x < pot.x ? -1 : 1;
    const spout = canSpoutOffset(face);
    drawCarryStream(ctx, {
      x0: pot.x * width + spout.x,
      y0: pot.y * height + spout.y,
      x1: plant.x * width,
      y1: plant.y * height - 8,
      elapsed,
      rgb: FACET_RGB.sky,
      count: 5,
    });
  }

  /**
   * @param {GameState} state
   */
  function drawFeedScene(state) {
    const scene = state.scene;
    if (!scene || scene.kind !== "feed-pet") return;
    const gated = sceneGated(state);
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
    const zone = HIT_RADIUS * Math.min(width, height);
    drawCarryPet(ctx, pet.x * width, pet.y * height, { happy, missed, gated }, zone);
  }

  /**
   * @param {{ x: number, y: number, held?: boolean }} bowl
   * @param {{ held: boolean, gated: boolean, missed: boolean }} look
   */
  function drawBowl(bowl, { held, gated, missed }) {
    const zone = HIT_RADIUS * Math.min(width, height);
    drawCarryBowl(ctx, bowl.x * width, bowl.y * height, { held, gated, missed }, zone);
  }

  /**
   * @param {{ x: number, y: number }} bowl
   * @param {{ x: number, y: number }} pet
   * @param {number} elapsed
   */
  function drawFeed(bowl, pet, elapsed) {
    drawCarryStream(ctx, {
      x0: bowl.x * width,
      y0: bowl.y * height - 6,
      x1: pet.x * width,
      y1: pet.y * height + 8,
      elapsed,
      rgb: FACET_RGB.ember,
      count: 5,
    });
  }

  /**
   * @param {GameState} state
   */
  function drawFireScene(state) {
    const scene = state.scene;
    if (!scene || scene.kind !== "douse-fire") return;
    const gated = sceneGated(state);
    const missed = state.phase === "over" || (state.phase === "result" && state.result === "fail");
    const won = state.phase === "result" && state.result === "win";
    const out = scene.fire.stage >= 1 || won;
    const face = scene.fire.x < scene.bucket.x ? -1 : 1;
    drawFlame(scene.fire, { out, missed, gated, elapsed: state.elapsed });
    if (scene.dousing || won) {
      drawSpray(scene.bucket, scene.fire, state.elapsed);
    }
    drawBucket(scene.bucket, { held: scene.bucket.held, gated, missed, face });
  }

  /**
   * @param {{ x: number, y: number }} fire
   * @param {{ out: boolean, missed: boolean, gated: boolean, elapsed: number }} look
   */
  function drawFlame(fire, { out, missed, gated, elapsed }) {
    const zone = HIT_RADIUS * Math.min(width, height);
    drawCarryFlame(ctx, fire.x * width, fire.y * height, { out, missed, gated, elapsed }, zone);
  }

  /**
   * @param {{ x: number, y: number, held?: boolean }} bucket
   * @param {{ held: boolean, gated: boolean, missed: boolean, face?: number }} look
   */
  function drawBucket(bucket, { held, gated, missed, face = 1 }) {
    const zone = HIT_RADIUS * Math.min(width, height);
    drawCarryBucket(ctx, bucket.x * width, bucket.y * height, { held, gated, missed, face }, zone);
  }

  /**
   * @param {{ x: number, y: number }} bucket
   * @param {{ x: number, y: number }} fire
   * @param {number} elapsed
   */
  function drawSpray(bucket, fire, elapsed) {
    const face = fire.x < bucket.x ? -1 : 1;
    const lip = bucketLipOffset(face);
    drawCarryStream(ctx, {
      x0: bucket.x * width + lip.x,
      y0: bucket.y * height + lip.y,
      x1: fire.x * width,
      y1: fire.y * height - 10,
      elapsed,
      rgb: FACET_RGB.sky,
      count: 5,
    });
  }

  /**
   * @param {GameState} state
   */
  function drawBugScene(state) {
    const scene = state.scene;
    if (!scene || scene.kind !== "stomp-bug") return;
    const gated = sceneGated(state);
    const missed = state.phase === "over" || (state.phase === "result" && state.result === "fail");
    const won = state.phase === "result" && state.result === "win";
    const squashed = scene.bug.stage >= 1 || won;
    drawBug(scene.bug, { squashed, squashing: scene.squashing || won, missed, gated, elapsed: state.elapsed });
  }

  /**
   * @param {{ x: number, y: number }} bug
   * @param {{ squashed: boolean, squashing: boolean, missed: boolean, gated: boolean, elapsed: number }} look
   */
  function drawBug(bug, { squashed, squashing, missed, gated, elapsed }) {
    const zone = HIT_RADIUS * Math.min(width, height);
    drawStompBug(
      ctx,
      bug.x * width,
      bug.y * height,
      { squashed, squashing, missed, gated, elapsed },
      zone,
    );
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
    strokeHex(ctx, x, y, ring, `rgba(${color}, 0.45)`, 2);

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
    strokeHex(
      ctx,
      x,
      y,
      ring,
      `rgba(${color}, ${0.2 + fade * 0.75})`,
      reducedMotion ? 3 : Math.max(1.5, 6 * fade),
    );

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
 * Dim the stage only while the curtain is still covering it.
 *
 * @param {GameState} state
 */
function sceneGated(state) {
  return state.phase === "prompt" && (state.transition?.cover ?? 0) > 0.2;
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
