/**
 * Facet low-poly marks for Stomp the bug.
 * Local units; origin is the hit center. Light from upper-left.
 * No gradients, arcs, or soft curves — triangles and hard edges only.
 */

import { FACET, FACET_RGB } from "../theme/facet.js";
import { drawFaces, facetShade, strokeHex } from "./facet.js";

/**
 * @typedef {import("./facet.js").Face} Face
 * @typedef {import("./facet.js").Pt} Pt
 */

/**
 * @param {{ missed?: boolean, squashed?: boolean }} look
 */
export function stompShade({ missed = false, squashed = false } = {}) {
  if (missed) return facetShade("coral");
  if (squashed) return facetShade("lilac");
  return facetShade("lilac");
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {{ squashed: boolean, squashing: boolean, missed: boolean, gated: boolean, elapsed: number }} look
 * @param {number} zone
 */
export function drawStompBug(ctx, x, y, { squashed, squashing, missed, gated, elapsed }, zone) {
  const scurry = squashed ? 0 : Math.sin(elapsed * 8);
  const hop = scurry * 3;
  const scale = squashed ? 1.85 : 1.95;
  const alpha = gated ? 0.55 : missed ? 0.5 : 1;
  const face = squashed ? 1 : Math.cos(elapsed * 2.2) >= 0 ? 1 : -1;
  const body = stompShade({ missed, squashed });
  const shell = missed ? facetShade("coral") : squashed ? facetShade("moss") : facetShade("lilac");
  const leg = missed ? facetShade("coral") : facetShade("ember");
  const ringRgb = missed ? FACET_RGB.coral : squashed ? FACET_RGB.moss : FACET_RGB.lilac;

  ctx.save();
  ctx.globalAlpha = alpha;
  strokeHex(ctx, x, y, zone, `rgba(${ringRgb}, ${gated ? 0.25 : squashing ? 0.85 : 0.55})`, squashing ? 3 : 2);

  if (squashed) {
    drawFaces(ctx, x, y, scale, squashFaces(body, leg, missed));
  } else {
    drawFaces(ctx, x, y + hop, scale, bugFaces(body, shell, leg, face, missed));
  }

  if (squashing && !gated) {
    drawFaces(ctx, x, y, 1.7, impactFaces(missed, elapsed));
    drawFaces(ctx, x, y, 1.7, stompFootFaces(missed));
  }
  ctx.restore();
}

/**
 * Live beetle in side view. Head faces `fx` (+1 right / -1 left).
 * Dumpy abdomen, grounded legs, antennae up — not a radial fish.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {ReturnType<typeof facetShade>} shell
 * @param {ReturnType<typeof facetShade>} leg
 * @param {number} fx
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function bugFaces(body, shell, leg, fx, missed) {
  const flip = (pts) => pts.map(([x, y]) => /** @type {Pt} */ ([x * fx, y]));
  const pincer = missed ? body.mid : FACET.ember;
  return [
    { pts: flip([[-22, 2], [-8, -16], [-2, 4]]), fill: shell.lit },
    { pts: flip([[-22, 2], [-2, 4], [-18, 16]]), fill: body.shade },
    { pts: flip([[-22, 2], [-30, 8], [-18, 16]]), fill: body.shade },
    { pts: flip([[-18, -2], [-10, -12], [-4, 2]]), fill: shell.lit },

    { pts: flip([[-8, -16], [10, -10], [-2, 4]]), fill: shell.mid },
    { pts: flip([[10, -10], [12, 6], [-2, 4]]), fill: body.mid },
    { pts: flip([[-2, 4], [12, 6], [6, 16]]), fill: body.shade },
    { pts: flip([[-2, 4], [6, 16], [-18, 16]]), fill: body.shade },
    { pts: flip([[-6, -4], [6, -2], [0, 8]]), fill: shell.lit },

    { pts: flip([[10, -10], [22, -8], [12, 2]]), fill: body.lit },
    { pts: flip([[12, 2], [22, -8], [24, 8]]), fill: body.mid },
    { pts: flip([[12, 2], [24, 8], [10, 12]]), fill: body.shade },
    { pts: flip([[14, -6], [18, -3], [14, 0]]), fill: FACET.ink },
    { pts: flip([[14, -6], [14, 0], [10.5, -3]]), fill: FACET.ink },

    { pts: flip([[20, -4], [28, -2], [22, 2]]), fill: pincer },
    { pts: flip([[20, 6], [28, 10], [22, 8]]), fill: pincer },
    { pts: flip([[16, -10], [10, -24], [18, -22]]), fill: leg.lit },
    { pts: flip([[18, -8], [22, -22], [24, -12]]), fill: leg.mid },

    { pts: flip([[-16, 10], [-14, 6], [-22, 24]]), fill: leg.lit },
    { pts: flip([[-14, 6], [-8, 12], [-22, 24]]), fill: leg.mid },
    { pts: flip([[-4, 12], [-2, 6], [-10, 26]]), fill: leg.mid },
    { pts: flip([[-2, 6], [4, 12], [-10, 26]]), fill: leg.shade },
    { pts: flip([[8, 10], [10, 4], [4, 24]]), fill: leg.lit },
    { pts: flip([[10, 4], [16, 12], [4, 24]]), fill: leg.shade },
    { pts: flip([[-12, 14], [-6, 12], [-8, 22]]), fill: leg.shade },
    { pts: flip([[2, 14], [8, 12], [6, 22]]), fill: leg.mid },
  ];
}

/**
 * Flattened splat after a successful stomp. No ellipses.
 *
 * @param {ReturnType<typeof facetShade>} body
 * @param {ReturnType<typeof facetShade>} leg
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function squashFaces(body, leg, missed) {
  const crack = missed ? FACET.coral : FACET.ink;
  const chip = missed ? FACET.coral : FACET.moss;
  return [
    { pts: [[-34, 6], [0, -6], [34, 8]], fill: body.lit },
    { pts: [[-34, 6], [34, 8], [0, 16]], fill: body.shade },
    { pts: [[-20, 4], [-4, -4], [4, 10]], fill: body.mid },
    { pts: [[8, 2], [24, -2], [18, 10]], fill: body.lit },
    { pts: [[-12, 6], [12, 8], [0, 14]], fill: body.shade },
    { pts: [[-8, 4], [6, 12], [-2, 8]], fill: crack },
    { pts: [[6, 2], [-4, 12], [2, 8]], fill: crack },
    { pts: [[-24, 12], [-32, 18], [-16, 16]], fill: leg.shade },
    { pts: [[18, 12], [30, 18], [22, 14]], fill: leg.mid },
    { pts: [[-4, -2], [4, -10], [6, 2]], fill: chip },
  ];
}

/**
 * Faceted boot pressing down from upper-left.
 *
 * @param {boolean} missed
 * @returns {Face[]}
 */
export function stompFootFaces(missed) {
  const boot = missed ? facetShade("coral") : facetShade("ember");
  const cuff = missed ? facetShade("coral") : facetShade("moss");
  return [
    { pts: [[-18, 2], [22, 8], [16, 16]], fill: boot.shade },
    { pts: [[-18, 2], [16, 16], [-16, 12]], fill: boot.mid },
    { pts: [[-22, -18], [-18, 2], [4, -8]], fill: boot.lit },
    { pts: [[4, -8], [-18, 2], [22, 8]], fill: boot.mid },
    { pts: [[4, -8], [22, 8], [16, -4]], fill: boot.shade },
    { pts: [[-18, -34], [-10, -16], [4, -26]], fill: cuff.lit },
    { pts: [[-10, -16], [10, -12], [4, -26]], fill: cuff.mid },
    { pts: [[-20, -38], [8, -28], [-4, -44]], fill: cuff.shade },
  ];
}

/**
 * Hard-edge impact shards around the contact. Pulse is visual only.
 *
 * @param {boolean} missed
 * @param {number} elapsed
 * @returns {Face[]}
 */
export function impactFaces(missed, elapsed) {
  const pulse = 0.5 + 0.5 * Math.sin(elapsed * 14);
  const kick = 1 + pulse * 0.12;
  const a = missed ? FACET.coral : FACET.bone;
  const b = missed ? FACET.coral : FACET.ember;
  const c = missed ? FACET.coral : FACET.moss;
  const scale = (pts) => pts.map(([x, y]) => /** @type {Pt} */ ([x * kick, y * kick]));
  return [
    { pts: scale([[-28, 4], [-38, 10], [-24, 12]]), fill: a },
    { pts: scale([[26, 2], [38, -6], [30, 10]]), fill: b },
    { pts: scale([[-8, 18], [0, 28], [10, 18]]), fill: c },
    { pts: scale([[18, 14], [30, 22], [22, 10]]), fill: a },
    { pts: scale([[-20, 16], [-32, 22], [-14, 18]]), fill: b },
    { pts: scale([[12, -22], [22, -32], [24, -16]]), fill: c },
  ];
}
