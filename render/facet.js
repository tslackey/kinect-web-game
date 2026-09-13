/**
 * Facet canvas primitives. Flat fills, hard edges, one light from upper-left.
 * Depth is a mix toward Bone or Ink — never a new named hue.
 */

import { FACET, FACET_STEPS } from "../theme/facet.js";

/**
 * @typedef {[number, number]} Pt
 * @typedef {{ pts: Pt[], fill: string }} Face
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Pt[]} points
 * @param {string} fill
 */
export function fillPoly(ctx, points, fill) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Pt} a
 * @param {Pt} b
 * @param {Pt} c
 * @param {string} fill
 */
export function fillTri(ctx, a, b, c, fill) {
  fillPoly(ctx, [a, b, c], fill);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {string} fill
 */
export function fillDiamond(ctx, x, y, r, fill) {
  fillPoly(
    ctx,
    [
      [x, y - r],
      [x + r, y],
      [x, y + r],
      [x - r, y],
    ],
    fill,
  );
}

/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @returns {Pt[]}
 */
export function hexVertices(cx, cy, r) {
  /** @type {Pt[]} */
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
 * @param {string} stroke
 * @param {number} [lineWidth]
 */
export function strokeHex(ctx, cx, cy, r, stroke, lineWidth = 2) {
  const ring = hexVertices(cx, cy, r);
  ctx.beginPath();
  ring.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point[0], point[1]);
    else ctx.lineTo(point[0], point[1]);
  });
  ctx.closePath();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.stroke();
}

/**
 * Draw local-space faces. Origin is the hit center; +y is down.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} scale
 * @param {Face[]} faces
 */
export function drawFaces(ctx, cx, cy, scale, faces) {
  const s = Number.isFinite(scale) ? scale : 1;
  for (const face of faces) {
    fillPoly(
      ctx,
      face.pts.map(([x, y]) => [cx + x * s, cy + y * s]),
      face.fill,
    );
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @param {{ top: string, topRight: string, right: string, bottom: string, left: string, topLeft: string }} palette
 */
export function drawCrystal(ctx, cx, cy, r, palette) {
  const verts = hexVertices(cx, cy, r);
  const fills = [palette.top, palette.topRight, palette.right, palette.bottom, palette.left, palette.topLeft];
  for (let i = 0; i < 6; i += 1) {
    fillTri(ctx, [cx, cy], verts[i], verts[(i + 1) % 6], fills[i]);
  }
}

export function mossCrystal() {
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

export function emberCrystal() {
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

export function coralCrystal() {
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

export function lilacCrystal() {
  return {
    top: FACET_STEPS.lilacBone,
    topRight: FACET.lilac,
    right: FACET.moss,
    bottom: FACET_STEPS.mossInk,
    left: FACET_STEPS.mossBone,
    topLeft: FACET.moss,
    stroke: FACET.lilac,
  };
}

/**
 * Light / mid / dark steps of one Facet hue.
 *
 * @param {"moss" | "sky" | "lilac" | "ember" | "coral"} hue
 */
export function facetShade(hue) {
  return {
    lit: FACET_STEPS[`${hue}Bone`],
    mid: FACET[hue],
    shade: FACET_STEPS[`${hue}Ink`],
  };
}
