/**
 * Facet theater skins for the inter-microgame wipe.
 * Cover 0 is open; 1 is closed. Panels drop from the top and rise back.
 * Flat triangles, token steps, upper-left light — no gradients or soft edges.
 */

import { FACET, FACET_RGB, FACET_STEPS, mixHex } from "../theme/facet.js";
import { drawCrystal, facetShade, fillDiamond, fillPoly, fillTri } from "./facet.js";

/**
 * @typedef {import("../game/transition.js").CurtainView} CurtainView
 * @typedef {import("./facet.js").Pt} Pt
 * @typedef {"moss" | "sky" | "lilac" | "ember" | "coral"} StageHue
 * @typedef {"hills" | "trees" | "logs" | "mounds" | "shards" | "beams" | "posts" | "flats" | "wedges" | "marks" | "field" | "waves"} StageMotif
 * @typedef {{
 *   hue: StageHue,
 *   motif: StageMotif,
 *   rgb: string,
 *   alpha: number,
 *   lit: string,
 *   mid: string,
 *   shade: string,
 *   deep: string,
 * }} StageKit
 */

const CLOTH_DEEP = mixHex(FACET.ember, FACET.ink, 0.55);
const MIST_LIT = mixHex(FACET.mist, FACET.bone, 0.22);
const MIST_SHADE = mixHex(FACET.mist, FACET.ink, 0.32);
const MIST_DEEP = mixHex(FACET.mist, FACET.ink, 0.55);

/** Extra mixes used by the curtain / stage skins. Tests whitelist these. */
export const CURTAIN_MIXES = Object.freeze({
  clothDeep: CLOTH_DEEP,
  mossDeep: mixHex(FACET.moss, FACET.ink, 0.55),
  skyDeep: mixHex(FACET.sky, FACET.ink, 0.55),
  lilacDeep: mixHex(FACET.lilac, FACET.ink, 0.55),
  coralDeep: mixHex(FACET.coral, FACET.ink, 0.55),
  mistLit: MIST_LIT,
  mistShade: MIST_SHADE,
  mistDeep: MIST_DEEP,
});

/**
 * @param {string | null | undefined} backgroundId
 * @returns {StageKit}
 */
export function stageKitFor(backgroundId) {
  return STAGE_KITS[backgroundId ?? ""] ?? STAGE_KITS.crystal;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {string | null | undefined} backgroundId
 */
export function drawStageWash(ctx, width, height, backgroundId) {
  const kit = stageKitFor(backgroundId);
  ctx.fillStyle = `rgba(${kit.rgb}, ${kit.alpha})`;
  ctx.fillRect(0, 0, width, height);
  drawFloorRange(ctx, width, height, kit);
  drawStageMotif(ctx, width, height, kit);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {CurtainView} view
 * @param {{ reducedMotion?: boolean }} [look]
 */
export function drawCurtain(ctx, width, height, view, { reducedMotion = false } = {}) {
  const cover = clamp01(view.cover);
  if (cover > 0.001) {
    drawTheaterDrapes(ctx, width, height, cover);
  }
  if (view.placard) drawPlacard(ctx, width, height, view, reducedMotion);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} cover
 */
function drawTheaterDrapes(ctx, width, height, cover) {
  const drop = height * cover;
  const cloth = facetShade("ember");
  const lining = facetShade("lilac");

  fillPoly(
    ctx,
    [
      [0, 0],
      [width, 0],
      [width, drop],
      [0, drop],
    ],
    `rgba(${FACET_RGB.ink}, ${0.62 * cover})`,
  );

  const mid = width * 0.5;
  const overlap = width * 0.035 * cover;
  drawDrapePanel(ctx, 0, mid + overlap, drop, cover, cloth, lining, 1);
  drawDrapePanel(ctx, mid - overlap, width, drop, cover, cloth, lining, -1);
  drawValance(ctx, width, Math.min(height * 0.12, 86, drop));
}

/**
 * One traveler half. `face` is +1 for the left panel (lining on the right).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x0
 * @param {number} x1
 * @param {number} drop
 * @param {number} cover
 * @param {ReturnType<typeof facetShade>} cloth
 * @param {ReturnType<typeof facetShade>} lining
 * @param {number} face
 */
function drawDrapePanel(ctx, x0, x1, drop, cover, cloth, lining, face) {
  const folds = 6;
  const span = x1 - x0;
  const foldW = span / folds;
  const hem = 22 * cover;

  for (let i = 0; i < folds; i += 1) {
    const a = x0 + i * foldW;
    const b = a + foldW;
    const ridge = a + foldW * 0.38;
    const dip = i % 2 === 0 ? hem : hem * 0.35;
    const dipB = i % 2 === 1 ? hem : hem * 0.4;
    const inner = face > 0 ? i === folds - 1 : i === 0;
    const outer = face > 0 ? i === 0 : i === folds - 1;
    const litFill = inner ? lining.lit : cloth.lit;
    const midFill = inner ? lining.mid : outer ? CLOTH_DEEP : cloth.mid;
    const shadeFill = inner ? lining.shade : outer ? CLOTH_DEEP : cloth.shade;

    fillTri(ctx, [a, 0], [ridge, 0], [ridge, drop + dip * 0.55], litFill);
    fillTri(ctx, [a, 0], [ridge, drop + dip * 0.55], [a, drop + dip], litFill);
    fillTri(ctx, [ridge, 0], [b, 0], [b, drop + dipB], midFill);
    fillTri(ctx, [ridge, 0], [b, drop + dipB], [ridge, drop + dip * 0.55], shadeFill);
  }

  const innerX = face > 0 ? x1 : x0;
  const inward = face > 0 ? -14 : 14;
  fillTri(
    ctx,
    [innerX, drop * 0.12],
    [innerX + inward, drop * 0.5],
    [innerX, drop * 0.88],
    lining.mid,
  );
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} valH
 */
function drawValance(ctx, width, valH) {
  if (valH < 8) return;
  const cloth = facetShade("ember");
  fillPoly(
    ctx,
    [
      [0, 0],
      [width, 0],
      [width, valH * 0.38],
      [0, valH * 0.38],
    ],
    cloth.shade,
  );

  const swags = 8;
  const swagW = width / swags;
  for (let i = 0; i < swags; i += 1) {
    const a = i * swagW;
    const b = a + swagW;
    const mid = (a + b) / 2;
    const tip = valH * (i % 2 === 0 ? 1 : 0.78);
    fillTri(ctx, [a, 0], [b, 0], [mid, tip], i % 2 === 0 ? cloth.mid : cloth.lit);
    fillTri(ctx, [a, 0], [mid, tip * 0.55], [a + swagW * 0.22, valH * 0.2], cloth.lit);
  }

  fillPoly(
    ctx,
    [
      [0, 0],
      [width, 0],
      [width, 7],
      [0, 7],
    ],
    FACET.ink,
  );

  const tassels = 4;
  for (let i = 0; i < tassels; i += 1) {
    const x = ((i + 0.5) / tassels) * width;
    fillDiamond(ctx, x, valH * 0.42, 7, FACET.ember);
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {CurtainView} view
 * @param {boolean} reducedMotion
 */
export function drawPlacard(ctx, width, height, view, reducedMotion) {
  const title = view.title || "";
  if (!title) return;
  const reveal = view.phase === "hold" || view.phase === "done" ? 1 : 1 - clamp01(view.cover);
  if (reveal <= 0.08) return;

  const cx = width / 2;
  const cy = height * 0.46;
  const cardW = Math.min(width * 0.74, 680);
  const cardH = Math.min(height * 0.3, 236);
  const left = cx - cardW / 2;
  const top = cy - cardH / 2;
  const right = cx + cardW / 2;
  const bottom = cy + cardH / 2;
  const cut = Math.min(28, cardW * 0.06);

  ctx.globalAlpha = 0.28 + reveal * 0.72;

  fillPoly(
    ctx,
    [
      [left + 12, top + 22],
      [left + cut + 12, top + 12],
      [right + 10, top + 12],
      [right + 10, bottom - cut + 12],
      [right - cut + 10, bottom + 12],
      [left + 12, bottom + 12],
    ],
    FACET.ink,
  );

  const frame = [
    [left, top + cut],
    [left + cut, top],
    [right, top],
    [right, bottom - cut],
    [right - cut, bottom],
    [left, bottom],
  ];
  fillPoly(ctx, frame, FACET_STEPS.emberInk);

  fillPoly(
    ctx,
    [
      [left, top + cut],
      [left + cut, top],
      [left + cardW * 0.42, top],
      [left, top + cardH * 0.55],
    ],
    FACET_STEPS.emberBone,
  );

  const inset = 14;
  fillPoly(
    ctx,
    [
      [left + inset, top + cut + 4],
      [left + cut + 4, top + inset],
      [right - inset, top + inset],
      [right - inset, bottom - cut - 2],
      [right - cut - 2, bottom - inset],
      [left + inset, bottom - inset],
    ],
    FACET.bone,
  );

  fillTri(ctx, [cx - 36, top - 6], [cx + 36, top - 6], [cx, top - 28], FACET.ember);
  fillTri(ctx, [cx - 18, top - 6], [cx + 18, top - 6], [cx, top - 20], FACET_STEPS.emberBone);

  fillDiamond(ctx, left + 10, cy, 12, FACET.ember);
  fillDiamond(ctx, right - 10, cy, 12, FACET.ember);
  drawCrystal(ctx, left - 6, cy, 16, {
    top: FACET_STEPS.emberBone,
    topRight: FACET.ember,
    right: FACET.lilac,
    bottom: FACET_STEPS.emberInk,
    left: FACET.sky,
    topLeft: FACET_STEPS.skyInk,
  });
  drawCrystal(ctx, right + 6, cy, 16, {
    top: FACET_STEPS.lilacBone,
    topRight: FACET.lilac,
    right: FACET.moss,
    bottom: FACET_STEPS.lilacInk,
    left: FACET.ember,
    topLeft: FACET_STEPS.emberBone,
  });

  const label = title.toUpperCase();
  let size = Math.round(Math.min(width, height) * (reducedMotion ? 0.11 : 0.16));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
  const maxW = cardW * 0.78;
  if (typeof ctx.measureText === "function") {
    while (size > 28 && ctx.measureText(label).width > maxW) {
      size -= 2;
      ctx.font = `700 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
    }
  }
  ctx.fillStyle = FACET.ink;
  ctx.fillText(label, cx, cy - (view.subtitle ? 16 : 0));

  if (view.subtitle) {
    ctx.font = `600 ${Math.round(size * 0.28)}px "DM Sans", "Segoe UI", sans-serif`;
    ctx.fillStyle = FACET_STEPS.emberInk;
    ctx.fillText(view.subtitle, cx, cy + size * 0.42);
  }
  ctx.globalAlpha = 1;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {StageKit} kit
 */
function drawFloorRange(ctx, width, height, kit) {
  const band = Math.min(height * 0.24, 176);
  const y = height;

  fillTri(ctx, [0, y], [width * 0.18, y - band * 0.92], [width * 0.34, y], kit.mid);
  fillTri(ctx, [0, y], [width * 0.07, y - band * 0.42], [width * 0.18, y - band * 0.92], kit.lit);
  fillTri(
    ctx,
    [width * 0.155, y - band * 0.72],
    [width * 0.18, y - band * 0.92],
    [width * 0.205, y - band * 0.72],
    FACET.bone,
  );

  fillTri(ctx, [width * 0.3, y], [width * 0.5, y - band * 0.78], [width * 0.68, y], kit.mid);
  fillTri(ctx, [width * 0.5, y - band * 0.78], [width * 0.62, y - band * 0.4], [width * 0.68, y], kit.shade);

  fillTri(ctx, [width * 0.66, y], [width * 0.86, y - band], [width, y], kit.mid);
  fillTri(ctx, [width * 0.86, y - band], [width, y - band * 0.48], [width, y], kit.shade);
  fillTri(
    ctx,
    [width * 0.835, y - band * 0.78],
    [width * 0.86, y - band],
    [width * 0.885, y - band * 0.78],
    FACET.bone,
  );

  fillTri(ctx, [0, y], [width * 0.22, y - band * 0.5], [width * 0.4, y], kit.deep);
  fillTri(ctx, [width * 0.36, y], [width * 0.58, y - band * 0.42], [width * 0.78, y], kit.shade);
  fillTri(ctx, [width * 0.72, y], [width * 0.92, y - band * 0.46], [width, y], kit.deep);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {StageKit} kit
 */
function drawStageMotif(ctx, width, height, kit) {
  const motif = kit.motif;
  if (motif === "hills" || motif === "field" || motif === "mounds") {
    drawCornerPlant(ctx, width * 0.08, height * 0.78, kit, motif === "mounds" ? 0.7 : 1);
    drawCornerPlant(ctx, width * 0.92, height * 0.8, kit, motif === "field" ? 0.55 : 0.9);
    return;
  }
  if (motif === "trees") {
    drawTree(ctx, width * 0.09, height * 0.7, kit, 1);
    drawTree(ctx, width * 0.91, height * 0.68, kit, 0.85);
    return;
  }
  if (motif === "logs") {
    drawLogStack(ctx, width * 0.1, height * 0.82, kit);
    drawFlameShard(ctx, width * 0.9, height * 0.78, kit);
    return;
  }
  if (motif === "shards") {
    drawCrystal(ctx, width * 0.08, height * 0.78, 28, crystalPalette(kit));
    drawCrystal(ctx, width * 0.93, height * 0.74, 22, crystalPalette(kit));
    return;
  }
  if (motif === "beams") {
    fillTri(ctx, [0, 0], [width * 0.2, 0], [0, height * 0.42], kit.lit);
    fillTri(ctx, [width * 0.08, 0], [width * 0.3, 0], [width * 0.04, height * 0.36], kit.mid);
    fillTri(ctx, [width * 0.78, 0], [width, 0], [width, height * 0.28], kit.shade);
    return;
  }
  if (motif === "posts") {
    drawPost(ctx, width * 0.1, height * 0.42, height * 0.46, kit);
    drawPost(ctx, width * 0.9, height * 0.4, height * 0.48, kit);
    return;
  }
  if (motif === "flats") {
    drawFlat(ctx, width * 0.015, height * 0.22, width * 0.12, height * 0.62, kit);
    drawFlat(ctx, width * 0.865, height * 0.2, width * 0.12, height * 0.64, kit);
    return;
  }
  if (motif === "wedges") {
    fillTri(ctx, [0, height * 0.28], [width * 0.2, height * 0.55], [0, height * 0.78], kit.mid);
    fillTri(ctx, [width, height * 0.22], [width, height * 0.72], [width * 0.78, height * 0.5], kit.shade);
    return;
  }
  if (motif === "marks") {
    fillDiamond(ctx, width * 0.08, height * 0.36, 16, kit.mid);
    fillDiamond(ctx, width * 0.92, height * 0.34, 16, kit.lit);
    fillDiamond(ctx, width * 0.08, height * 0.36, 6, FACET.ink);
    fillDiamond(ctx, width * 0.92, height * 0.34, 6, FACET.ink);
    return;
  }
  fillTri(ctx, [width * 0.18, height * 0.08], [width * 0.34, height * 0.08], [width * 0.26, height * 0.16], kit.lit);
  fillTri(ctx, [width * 0.66, height * 0.08], [width * 0.82, height * 0.08], [width * 0.74, height * 0.16], kit.mid);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {StageKit} kit
 * @param {number} scale
 */
function drawCornerPlant(ctx, x, y, kit, scale) {
  fillTri(ctx, [x - 18 * scale, y + 22 * scale], [x, y - 8 * scale], [x + 4 * scale, y + 24 * scale], kit.shade);
  fillTri(ctx, [x, y - 8 * scale], [x + 22 * scale, y + 16 * scale], [x + 4 * scale, y + 24 * scale], kit.mid);
  fillTri(ctx, [x - 10 * scale, y], [x, y - 28 * scale], [x + 10 * scale, y], kit.lit);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {StageKit} kit
 * @param {number} scale
 */
function drawTree(ctx, x, y, kit, scale) {
  fillTri(ctx, [x - 8 * scale, y + 36 * scale], [x, y + 8 * scale], [x + 8 * scale, y + 36 * scale], kit.deep);
  fillTri(ctx, [x - 28 * scale, y + 16 * scale], [x, y - 36 * scale], [x + 6 * scale, y + 16 * scale], kit.mid);
  fillTri(ctx, [x - 6 * scale, y + 16 * scale], [x, y - 36 * scale], [x + 28 * scale, y + 18 * scale], kit.shade);
  fillTri(ctx, [x - 10 * scale, y - 12 * scale], [x, y - 36 * scale], [x + 10 * scale, y - 12 * scale], kit.lit);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {StageKit} kit
 */
function drawLogStack(ctx, x, y, kit) {
  fillTri(ctx, [x - 34, y + 10], [x + 36, y - 4], [x + 30, y + 16], kit.shade);
  fillTri(ctx, [x - 34, y + 10], [x - 28, y - 8], [x + 36, y - 4], kit.mid);
  fillTri(ctx, [x - 22, y - 2], [x + 24, y - 18], [x + 18, y + 2], kit.lit);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {StageKit} kit
 */
function drawFlameShard(ctx, x, y, kit) {
  fillTri(ctx, [x - 16, y + 18], [x, y - 32], [x + 4, y + 16], kit.lit);
  fillTri(ctx, [x, y - 32], [x + 18, y + 14], [x + 4, y + 16], kit.mid);
  fillTri(ctx, [x - 8, y + 6], [x, y - 14], [x + 8, y + 6], FACET.bone);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} h
 * @param {StageKit} kit
 */
function drawPost(ctx, x, y, h, kit) {
  fillTri(ctx, [x - 10, y + h], [x - 6, y], [x + 2, y + h], kit.lit);
  fillTri(ctx, [x - 6, y], [x + 10, y + 8], [x + 2, y + h], kit.shade);
  fillTri(ctx, [x - 16, y + 10], [x, y - 14], [x + 16, y + 12], kit.mid);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {StageKit} kit
 */
function drawFlat(ctx, x, y, w, h, kit) {
  fillTri(ctx, [x, y], [x + w, y + 10], [x, y + h], kit.lit);
  fillTri(ctx, [x + w, y + 10], [x + w, y + h], [x, y + h], kit.shade);
  fillTri(ctx, [x + 6, y + 16], [x + w * 0.7, y + 22], [x + 8, y + h * 0.42], kit.mid);
}

/**
 * @param {StageKit} kit
 */
function crystalPalette(kit) {
  return {
    top: kit.lit,
    topRight: kit.mid,
    right: FACET.lilac,
    bottom: kit.shade,
    left: FACET.sky,
    topLeft: kit.lit,
  };
}

/**
 * @param {StageHue} hue
 * @param {StageMotif} motif
 * @param {number} alpha
 * @returns {StageKit}
 */
function kit(hue, motif, alpha) {
  const shade = facetShade(hue);
  return {
    hue,
    motif,
    rgb: FACET_RGB[hue],
    alpha,
    lit: shade.lit,
    mid: shade.mid,
    shade: shade.shade,
    deep: hue === "ember" ? CLOTH_DEEP : CURTAIN_MIXES[`${hue}Deep`],
  };
}

/** @type {Record<string, StageKit>} */
const STAGE_KITS = {
  garden: kit("moss", "hills", 0.1),
  grove: kit("moss", "trees", 0.11),
  hearth: kit("ember", "logs", 0.1),
  ash: kit("coral", "logs", 0.09),
  dirt: {
    hue: "moss",
    motif: "mounds",
    rgb: FACET_RGB.mist,
    alpha: 0.08,
    lit: MIST_LIT,
    mid: FACET.mist,
    shade: MIST_SHADE,
    deep: MIST_DEEP,
  },
  crystal: kit("lilac", "shards", 0.08),
  beam: kit("sky", "beams", 0.1),
  bar: kit("moss", "posts", 0.09),
  stage: kit("lilac", "flats", 0.1),
  tilt: kit("ember", "wedges", 0.09),
  cue: kit("coral", "marks", 0.1),
  pitch: kit("moss", "field", 0.1),
  span: kit("sky", "posts", 0.1),
  high: kit("lilac", "shards", 0.1),
  hello: kit("sky", "waves", 0.09),
  press: kit("ember", "wedges", 0.1),
};

/**
 * @param {number} value
 */
function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
