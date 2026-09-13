/**
 * Facet low-poly marks for the carry-trio microgames.
 * Local units; origin is the hit center. Light from upper-left.
 * No gradients, arcs, or soft curves — triangles and hard edges only.
 */

import { FACET, FACET_RGB, FACET_STEPS, mixHex } from "../theme/facet.js";
import { drawCrystal, drawFaces, facetShade, fillDiamond, fillPoly, lilacCrystal, strokeHex } from "./facet.js";

/**
 * @typedef {import("./facet.js").Face} Face
 * @typedef {import("./facet.js").Pt} Pt
 */

/**
 * @param {{ missed?: boolean, held?: boolean, happy?: boolean, hue?: "moss" | "sky" | "lilac" | "ember" }} look
 */
export function carryShade({ missed = false, held = false, happy = false, hue = "lilac" } = {}) {
  if (missed) return facetShade("coral");
  if (held) return facetShade("ember");
  if (happy) return facetShade("moss");
  return facetShade(hue);
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
export function drawHitRing(ctx, x, y, zone, rgb, alpha, lineWidth = 2) {
  strokeHex(ctx, x, y, zone, `rgba(${rgb}, ${alpha})`, lineWidth);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {{ grown: boolean, missed: boolean, gated: boolean }} look
 * @param {number} zone
 */
export function drawCarryPlant(ctx, x, y, { grown, missed, gated }, zone) {
  const scale = grown ? 1.85 : 1.45;
  const alpha = gated ? 0.55 : missed ? 0.5 : 1;
  const moss = carryShade({ missed, hue: "moss" });
  const soil = missed ? facetShade("coral") : facetShade("moss");
  const soilDeep = missed ? FACET_STEPS.coralInk : mixHex(FACET.moss, FACET.ink, 0.55);
  const bud = missed ? facetShade("coral") : facetShade("lilac");

  ctx.save();
  ctx.globalAlpha = alpha;
  drawHitRing(ctx, x, y, zone, missed ? FACET_RGB.coral : FACET_RGB.moss, gated ? 0.25 : 0.55);

  drawFaces(ctx, x, y, scale, [
    { pts: [[-20, 24], [0, 12], [2, 30]], fill: soil.shade },
    { pts: [[0, 12], [20, 22], [2, 30]], fill: soil.mid },
    { pts: [[-12, 20], [0, 12], [10, 22]], fill: soil.lit },
    { pts: [[-8, 26], [2, 30], [12, 25]], fill: soilDeep },
  ]);

  if (grown) {
    drawFaces(ctx, x, y, scale, grownPlantFaces(moss));
    drawCrystal(ctx, x, y - 40 * scale, 14 * scale, missed ? coralBloom() : lilacCrystal());
  } else {
    drawFaces(ctx, x, y, scale, wiltedPlantFaces(moss, bud));
  }
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {{ held: boolean, gated: boolean, missed: boolean, face?: number }} look
 * @param {number} zone
 */
export function drawCarryCan(ctx, x, y, { held, gated, missed, face = 1 }, zone) {
  const scale = 1.55;
  const alpha = gated ? 0.45 : missed ? 0.55 : 1;
  const body = carryShade({ missed, held, hue: "lilac" });
  const lip = missed ? facetShade("coral") : held ? facetShade("ember") : facetShade("ember");
  const spout = missed ? facetShade("coral") : facetShade("sky");
  const fx = face < 0 ? -1 : 1;

  ctx.save();
  ctx.globalAlpha = alpha;
  drawHitRing(
    ctx,
    x,
    y,
    zone,
    missed ? FACET_RGB.coral : held ? FACET_RGB.ember : FACET_RGB.lilac,
    held ? 0.85 : gated ? 0.28 : 0.7,
    held ? 3 : 2,
  );
  drawFaces(ctx, x, y, scale, canFaces(body, lip, spout, fx));
  ctx.restore();
}

/**
 * Local spout tip, matching canFaces.
 * @param {number} [face]
 */
export function canSpoutOffset(face = 1) {
  const fx = face < 0 ? -1 : 1;
  return { x: 44 * 1.55 * fx, y: -6 * 1.55 };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {{ happy: boolean, missed: boolean, gated: boolean }} look
 * @param {number} zone
 */
export function drawCarryPet(ctx, x, y, { happy, missed, gated }, zone) {
  const scale = happy ? 1.7 : 1.5;
  const alpha = gated ? 0.55 : missed ? 0.5 : 1;
  const body = carryShade({ missed, happy, hue: "lilac" });
  const ear = missed ? facetShade("coral") : happy ? facetShade("ember") : facetShade("sky");
  const muzzle = missed ? FACET_STEPS.coralBone : happy ? FACET_STEPS.mossBone : FACET_STEPS.lilacBone;

  ctx.save();
  ctx.globalAlpha = alpha;
  drawHitRing(
    ctx,
    x,
    y,
    zone,
    missed ? FACET_RGB.coral : happy ? FACET_RGB.moss : FACET_RGB.lilac,
    gated ? 0.25 : 0.55,
  );
  drawFaces(ctx, x, y, scale, petFaces(body, ear, muzzle, { happy, missed }));
  fillDiamond(ctx, x - 5 * scale, y - 18 * scale, 2.4 * scale, FACET.ink);
  fillDiamond(ctx, x + 6 * scale, y - 17.5 * scale, 2.4 * scale, FACET.ink);
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {{ held: boolean, gated: boolean, missed: boolean }} look
 * @param {number} zone
 */
export function drawCarryBowl(ctx, x, y, { held, gated, missed }, zone) {
  const scale = 1.7;
  const alpha = gated ? 0.45 : missed ? 0.55 : 1;
  const dish = carryShade({ missed, held, hue: "lilac" });
  const kibble = missed ? facetShade("coral") : facetShade("ember");
  const well = missed ? FACET_STEPS.coralInk : FACET.ink;

  ctx.save();
  ctx.globalAlpha = alpha;
  drawHitRing(
    ctx,
    x,
    y,
    zone,
    missed ? FACET_RGB.coral : held ? FACET_RGB.ember : FACET_RGB.lilac,
    held ? 0.85 : gated ? 0.28 : 0.7,
    held ? 3 : 2,
  );
  drawFaces(ctx, x, y, scale, bowlFaces(dish, well, kibble));
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {{ out: boolean, missed: boolean, gated: boolean, elapsed: number }} look
 * @param {number} zone
 */
export function drawCarryFlame(ctx, x, y, { out, missed, gated, elapsed }, zone) {
  const flicker = 0.5 + 0.5 * Math.sin(elapsed * 9);
  const flameScale = out ? 1.2 : 1.72 + flicker * 0.1;
  const logScale = 1.62;
  const alpha = gated ? 0.55 : missed ? 0.5 : 1;
  const log = missed ? facetShade("coral") : facetShade("ember");
  const logDeep = missed ? FACET_STEPS.coralInk : mixHex(FACET.ember, FACET.ink, 0.58);

  ctx.save();
  ctx.globalAlpha = alpha;
  drawHitRing(
    ctx,
    x,
    y,
    zone,
    missed ? FACET_RGB.coral : out ? FACET_RGB.sky : FACET_RGB.ember,
    gated ? 0.25 : 0.55,
  );
  drawFaces(ctx, x, y, logScale, logFaces(log, logDeep));
  if (out) {
    drawFaces(ctx, x, y, 1.35, steamFaces(missed));
  } else {
    drawFaces(ctx, x, y, flameScale, flameFaces(missed));
  }
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {{ held: boolean, gated: boolean, missed: boolean, face?: number }} look
 * @param {number} zone
 */
export function drawCarryBucket(ctx, x, y, { held, gated, missed, face = 1 }, zone) {
  const scale = 1.5;
  const alpha = gated ? 0.45 : missed ? 0.55 : 1;
  const body = carryShade({ missed, held, hue: "lilac" });
  const water = missed ? facetShade("coral") : facetShade("sky");
  const fx = face < 0 ? -1 : 1;

  ctx.save();
  ctx.globalAlpha = alpha;
  drawHitRing(
    ctx,
    x,
    y,
    zone,
    missed ? FACET_RGB.coral : held ? FACET_RGB.ember : FACET_RGB.lilac,
    held ? 0.85 : gated ? 0.28 : 0.7,
    held ? 3 : 2,
  );
  drawFaces(ctx, x, y, scale, bucketFaces(body, water, fx));
  ctx.restore();
}

/**
 * Local lip of the bucket, matching bucketFaces.
 * @param {number} [face]
 */
export function bucketLipOffset(face = 1) {
  const fx = face < 0 ? -1 : 1;
  return { x: 8 * 1.5 * fx, y: -10 * 1.5 };
}

/**
 * Hard-edge chevron stream + triangular shards. No curves.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x0: number, y0: number, x1: number, y1: number, elapsed: number, rgb: string, count?: number }} opts
 */
export function drawCarryStream(ctx, { x0, y0, x1, y1, elapsed, rgb, count = 5 }) {
  const lift = 28;
  const mx = (x0 + x1) / 2;
  const my = Math.min(y0, y1) - lift;
  const pulse = 0.5 + 0.5 * Math.sin(elapsed * 10);
  const color = `rgba(${rgb}, ${0.42 + pulse * 0.4})`;
  const ribbon = `rgba(${rgb}, ${0.28 + pulse * 0.22})`;

  ctx.save();
  const width = 8;
  fillRibbon(ctx, [x0, y0], [mx, my], width, ribbon);
  fillRibbon(ctx, [mx, my], [x1, y1], width, ribbon);

  for (let i = 0; i < count; i += 1) {
    const t = (i / count + (elapsed * 1.7) % 1) % 1;
    const [x, y] = alongChevron(x0, y0, mx, my, x1, y1, t);
    const size = 5.2 + (i % 2) * 1.2;
    fillDiamond(ctx, x, y, size, color);
  }
  ctx.restore();
}

/**
 * @param {ReturnType<typeof facetShade>} moss
 * @param {ReturnType<typeof facetShade>} bud
 * @returns {Face[]}
 */
function wiltedPlantFaces(moss, bud) {
  return [
    { pts: [[-4, 22], [0, -18], [0, 22]], fill: moss.lit },
    { pts: [[0, 22], [0, -18], [4, 22]], fill: moss.shade },
    { pts: [[-4, 0], [-26, 12], [-8, 8]], fill: moss.shade },
    { pts: [[-4, 0], [-22, -8], [-8, 8]], fill: moss.lit },
    { pts: [[4, -6], [26, 8], [8, 4]], fill: moss.shade },
    { pts: [[4, -6], [20, -12], [8, 4]], fill: moss.mid },
    { pts: [[0, -18], [-8, -10], [8, -10]], fill: bud.mid },
    { pts: [[0, -28], [-6, -18], [6, -18]], fill: bud.lit },
  ];
}

/**
 * @param {ReturnType<typeof facetShade>} moss
 * @returns {Face[]}
 */
function grownPlantFaces(moss) {
  return [
    { pts: [[-3.8, 22], [0, -30], [0, 22]], fill: moss.lit },
    { pts: [[0, 22], [0, -30], [3.8, 22]], fill: moss.shade },
    { pts: [[-4, 2], [-28, 12], [-8, 12]], fill: moss.shade },
    { pts: [[-4, 2], [-22, -10], [-8, 12]], fill: moss.lit },
    { pts: [[4, -2], [28, 8], [8, 10]], fill: moss.shade },
    { pts: [[4, -2], [22, -14], [8, 10]], fill: moss.mid },
    { pts: [[-3, -14], [-22, -8], [-7, -6]], fill: moss.shade },
    { pts: [[-3, -14], [-16, -26], [-7, -6]], fill: moss.lit },
    { pts: [[3, -16], [22, -10], [7, -8]], fill: moss.mid },
    { pts: [[3, -16], [16, -28], [7, -8]], fill: moss.lit },
  ];
}

/**
 * @param {ReturnType<typeof facetShade>} body
 * @param {ReturnType<typeof facetShade>} lip
 * @param {ReturnType<typeof facetShade>} spout
 * @param {number} fx
 * @returns {Face[]}
 */
function canFaces(body, lip, spout, fx) {
  const flip = (pts) => pts.map(([x, y]) => /** @type {Pt} */ ([x * fx, y]));
  return [
    { pts: flip([[-16, -8], [12, -10], [-13, 22]]), fill: body.lit },
    { pts: flip([[12, -10], [16, 22], [-13, 22]]), fill: body.shade },
    { pts: flip([[-13, 22], [16, 22], [1, 28]]), fill: body.shade },
    { pts: flip([[-7, 6], [6, -2], [9, 12]]), fill: body.mid },
    { pts: flip([[-20, -18], [14, -20], [14, -8]]), fill: lip.lit },
    { pts: flip([[14, -20], [20, -16], [20, -8]]), fill: lip.mid },
    { pts: flip([[14, -20], [14, -8], [20, -8]]), fill: lip.shade },
    { pts: flip([[-20, -18], [14, -8], [-18, -8]]), fill: lip.lit },
    { pts: flip([[-16, -6], [-30, -16], [-22, 0]]), fill: body.shade },
    { pts: flip([[-30, -16], [-32, 8], [-22, 0]]), fill: body.mid },
    { pts: flip([[-22, 6], [-32, 8], [-14, 14]]), fill: body.shade },
    { pts: flip([[12, -12], [44, -8], [16, -2]]), fill: spout.lit },
    { pts: flip([[16, -6], [44, -8], [40, 6]]), fill: spout.shade },
    { pts: flip([[30, -6], [44, -8], [40, 6]]), fill: spout.mid },
  ];
}

/**
 * @param {ReturnType<typeof facetShade>} body
 * @param {ReturnType<typeof facetShade>} ear
 * @param {string} muzzle
 * @param {{ happy: boolean, missed: boolean }} look
 * @returns {Face[]}
 */
function petFaces(body, ear, muzzle, { happy, missed }) {
  const tail = happy
    ? [
        { pts: [[18, 6], [34, -12], [20, 12]], fill: body.mid },
        { pts: [[20, 12], [34, -12], [32, -20]], fill: body.lit },
      ]
    : [
        { pts: [[18, 10], [32, 20], [20, 16]], fill: body.mid },
        { pts: [[20, 16], [32, 20], [28, 28]], fill: body.shade },
      ];
  const ears = happy
    ? [
        { pts: [[-16, -26], [-22, -46], [-4, -30]], fill: ear.lit },
        { pts: [[-16, -26], [-4, -30], [-8, -18]], fill: ear.shade },
        { pts: [[10, -28], [20, -48], [2, -30]], fill: ear.mid },
        { pts: [[10, -28], [2, -30], [8, -18]], fill: ear.shade },
      ]
    : [
        { pts: [[-15, -22], [-24, -36], [-5, -26]], fill: ear.lit },
        { pts: [[-15, -22], [-5, -26], [-8, -14]], fill: ear.shade },
        { pts: [[10, -24], [22, -38], [4, -26]], fill: ear.mid },
        { pts: [[10, -24], [4, -26], [8, -14]], fill: ear.shade },
      ];
  const crest = happy
    ? [{ pts: [[0, -32], [-7, -44], [7, -42]], fill: missed ? FACET.coral : FACET.ember }]
    : [];
  const nose = missed ? FACET.coral : happy ? FACET.ember : FACET.coral;

  return [
    { pts: [[-20, 10], [0, -6], [0, 28]], fill: body.shade },
    { pts: [[0, -6], [22, 8], [0, 28]], fill: body.mid },
    { pts: [[-10, 14], [0, 2], [11, 16]], fill: body.lit },
    { pts: [[-16, 24], [-8, 20], [-6, 32]], fill: body.shade },
    { pts: [[6, 22], [16, 20], [12, 32]], fill: body.mid },
    { pts: [[-14, -6], [0, -32], [0, -2]], fill: body.lit },
    { pts: [[0, -32], [15, -8], [0, -2]], fill: body.shade },
    { pts: [[-7, -8], [0, 0], [8, -8]], fill: muzzle },
    { pts: [[-2.6, -3], [0, 2], [2.8, -3]], fill: nose },
    ...ears,
    ...crest,
    ...tail,
  ];
}

/**
 * @param {ReturnType<typeof facetShade>} dish
 * @param {string} well
 * @param {ReturnType<typeof facetShade>} kibble
 * @returns {Face[]}
 */
function bowlFaces(dish, well, kibble) {
  return [
    { pts: [[-34, -4], [0, -16], [0, 8]], fill: dish.lit },
    { pts: [[0, -16], [34, -4], [0, 8]], fill: dish.mid },
    { pts: [[-34, -4], [-24, 20], [0, 8]], fill: dish.shade },
    { pts: [[34, -4], [24, 20], [0, 8]], fill: dish.mid },
    { pts: [[-24, 20], [24, 20], [0, 8]], fill: dish.shade },
    { pts: [[-34, -4], [34, -4], [26, 2]], fill: dish.lit },
    { pts: [[-34, -4], [26, 2], [-26, 2]], fill: dish.lit },
    { pts: [[-18, -2], [18, -6], [-12, 8]], fill: well },
    { pts: [[18, -6], [12, 8], [-12, 8]], fill: well },
    { pts: [[-10, 0], [-2, -8], [2, 4]], fill: kibble.lit },
    { pts: [[4, 0], [14, -6], [12, 6]], fill: kibble.mid },
    { pts: [[-2, 4], [6, 0], [4, 10]], fill: kibble.shade },
  ];
}

/**
 * @param {ReturnType<typeof facetShade>} log
 * @param {string} logDeep
 * @returns {Face[]}
 */
function logFaces(log, logDeep) {
  return [
    { pts: [[-26, 12], [10, 4], [4, 24]], fill: log.shade },
    { pts: [[10, 4], [24, 14], [4, 24]], fill: log.mid },
    { pts: [[-12, 10], [28, 12], [18, 26]], fill: logDeep },
    { pts: [[-12, 10], [18, 26], [-20, 24]], fill: log.shade },
    { pts: [[-22, 10], [-8, 4], [-6, 16]], fill: log.lit },
  ];
}

/**
 * @param {boolean} missed
 * @returns {Face[]}
 */
function flameFaces(missed) {
  const tip = missed ? FACET_STEPS.coralBone : FACET_STEPS.emberBone;
  const mid = missed ? FACET.coral : FACET.ember;
  const shade = missed ? FACET_STEPS.coralInk : FACET_STEPS.emberInk;
  const inner = missed ? FACET.coral : FACET.lilac;
  const spark = missed ? FACET_STEPS.coralBone : FACET.bone;
  return [
    { pts: [[0, -38], [-16, -4], [16, -4]], fill: tip },
    { pts: [[-16, -4], [16, -4], [0, 8]], fill: mid },
    { pts: [[-16, -4], [-12, 20], [0, 8]], fill: shade },
    { pts: [[16, -4], [12, 20], [0, 8]], fill: inner },
    { pts: [[-12, 20], [12, 20], [0, 8]], fill: shade },
    { pts: [[0, -18], [-7, 2], [7, 2]], fill: inner },
    { pts: [[0, -30], [-4, -18], [4, -18]], fill: spark },
  ];
}

/**
 * @param {boolean} missed
 * @returns {Face[]}
 */
function steamFaces(missed) {
  const a = missed ? FACET.coral : FACET.sky;
  const b = missed ? FACET_STEPS.coralBone : FACET_STEPS.skyBone;
  const c = missed ? FACET_STEPS.coralInk : FACET.mist;
  return [
    { pts: [[-12, 0], [0, -20], [8, 2]], fill: a },
    { pts: [[4, -8], [14, -30], [18, -4]], fill: b },
    { pts: [[-4, -18], [4, -38], [12, -14]], fill: c },
  ];
}

/**
 * @param {ReturnType<typeof facetShade>} body
 * @param {ReturnType<typeof facetShade>} water
 * @param {number} fx
 * @returns {Face[]}
 */
function bucketFaces(body, water, fx) {
  const flip = (pts) => pts.map(([x, y]) => /** @type {Pt} */ ([x * fx, y]));
  return [
    { pts: flip([[-16, -10], [0, -32], [-6, -10]]), fill: body.lit },
    { pts: flip([[16, -10], [0, -32], [6, -10]]), fill: body.shade },
    { pts: flip([[0, -32], [-6, -22], [6, -22]]), fill: body.mid },
    { pts: flip([[-20, -4], [20, -4], [-16, 24]]), fill: body.lit },
    { pts: flip([[20, -4], [16, 24], [-16, 24]]), fill: body.shade },
    { pts: flip([[-16, 24], [16, 24], [0, 28]]), fill: body.shade },
    { pts: flip([[-8, 6], [5, 0], [9, 12]]), fill: body.mid },
    { pts: flip([[-24, -14], [24, -14], [22, -4]]), fill: body.lit },
    { pts: flip([[-24, -14], [22, -4], [-22, -4]]), fill: body.mid },
    { pts: flip([[-14, -2], [14, -2], [0, 6]]), fill: water.mid },
    { pts: flip([[-14, -2], [6, -5], [0, 6]]), fill: water.lit },
  ];
}

function coralBloom() {
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

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Pt} a
 * @param {Pt} b
 * @param {number} width
 * @param {string} fill
 */
function fillRibbon(ctx, a, b, width, fill) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * width;
  const ny = (dx / len) * width;
  fillPoly(
    ctx,
    [
      [a[0] + nx, a[1] + ny],
      [a[0] - nx, a[1] - ny],
      [b[0] - nx, b[1] - ny],
    ],
    fill,
  );
  fillPoly(
    ctx,
    [
      [a[0] + nx, a[1] + ny],
      [b[0] - nx, b[1] - ny],
      [b[0] + nx, b[1] + ny],
    ],
    fill,
  );
}

/**
 * @param {number} x0
 * @param {number} y0
 * @param {number} mx
 * @param {number} my
 * @param {number} x1
 * @param {number} y1
 * @param {number} t
 * @returns {Pt}
 */
function alongChevron(x0, y0, mx, my, x1, y1, t) {
  if (t < 0.5) {
    const u = t * 2;
    return [x0 + (mx - x0) * u, y0 + (my - y0) * u];
  }
  const u = (t - 0.5) * 2;
  return [mx + (x1 - mx) * u, my + (y1 - my) * u];
}
