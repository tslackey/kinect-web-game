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
    `rgba(${FACET_RGB.ink}, ${0.7 * cover})`,
  );

  const mid = width * 0.5;
  const overlap = width * 0.028 * cover;
  drawDrapePanel(ctx, 0, mid + overlap, drop, cover, cloth, 1);
  drawDrapePanel(ctx, mid - overlap, width, drop, cover, cloth, -1);
  drawCenterLining(ctx, mid, drop, cover, lining);
  drawValance(ctx, width, Math.min(height * 0.2, 128, Math.max(drop * 0.34, 44 * cover)));
}

/**
 * One drop-curtain half. Ridges lean so each fold reads as two triangles.
 * `face` is +1 for the left panel.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x0
 * @param {number} x1
 * @param {number} drop
 * @param {number} cover
 * @param {ReturnType<typeof facetShade>} cloth
 * @param {number} face
 */
function drawDrapePanel(ctx, x0, x1, drop, cover, cloth, face) {
  const folds = 4;
  const span = x1 - x0;
  const foldW = span / folds;
  const hem = Math.max(48, drop * 0.12) * cover;

  for (let i = 0; i < folds; i += 1) {
    const a = x0 + i * foldW;
    const b = a + foldW;
    const slash = (i + (face > 0 ? 0 : 1)) % 2 === 0;
    const dip = i % 2 === 0 ? hem : hem * 0.45;
    const lit = slash ? cloth.lit : cloth.mid;
    const shade = slash ? cloth.shade : CLOTH_DEEP;
    if (slash) {
      fillTri(ctx, [a, 0], [b, 0], [a, drop + dip], lit);
      fillTri(ctx, [b, 0], [b, drop + dip * 0.7], [a, drop + dip], shade);
    } else {
      fillTri(ctx, [a, 0], [b, 0], [b, drop + dip], lit);
      fillTri(ctx, [a, 0], [b, drop + dip], [a, drop + dip * 0.7], shade);
    }
    fillTri(
      ctx,
      [a, drop + (slash ? dip : dip * 0.7)],
      [b, drop + (slash ? dip * 0.7 : dip)],
      [(a + b) / 2, drop + hem * 1.25],
      i % 2 === 0 ? CLOTH_DEEP : cloth.shade,
    );
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} mid
 * @param {number} drop
 * @param {number} cover
 * @param {ReturnType<typeof facetShade>} lining
 */
function drawCenterLining(ctx, mid, drop, cover, lining) {
  const w = 18 * Math.max(cover, 0.4);
  fillTri(ctx, [mid - w, 0], [mid, 0], [mid - w * 0.35, drop], lining.lit);
  fillTri(ctx, [mid, 0], [mid + w, 0], [mid + w * 0.35, drop], lining.mid);
  fillTri(ctx, [mid - w, 0], [mid - w * 0.35, drop], [mid, drop + 12 * cover], lining.shade);
  fillTri(ctx, [mid, drop + 12 * cover], [mid + w * 0.35, drop], [mid + w, 0], lining.shade);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} valH
 */
function drawValance(ctx, width, valH) {
  if (valH < 10) return;
  const cloth = facetShade("ember");
  fillPoly(
    ctx,
    [
      [0, 0],
      [width, 0],
      [width, valH * 0.42],
      [0, valH * 0.42],
    ],
    FACET.ink,
  );

  const swags = 7;
  const swagW = width / swags;
  for (let i = 0; i < swags; i += 1) {
    const a = i * swagW;
    const b = a + swagW;
    const mid = (a + b) / 2;
    const tip = valH * (i % 2 === 0 ? 1 : 0.7);
    fillTri(ctx, [a, 8], [b, 8], [mid, tip], CLOTH_DEEP);
    fillTri(ctx, [a, 8], [mid, tip], [mid - swagW * 0.18, 8], cloth.shade);
    fillDiamond(ctx, mid, tip - 5, 7, FACET.bone);
  }

  fillPoly(
    ctx,
    [
      [0, 0],
      [width, 0],
      [width, 10],
      [0, 10],
    ],
    FACET.ink,
  );
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
  const cy = height * 0.44;
  const cardW = Math.min(width * 0.78, 720);
  const cardH = Math.max(Math.min(height * 0.36, 268), Math.min(168, height * 0.48));
  const left = cx - cardW / 2;
  const top = cy - cardH / 2;
  const right = cx + cardW / 2;
  const bottom = cy + cardH / 2;
  const cut = Math.min(44, cardW * 0.1);

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

  const inset = Math.max(18, cardH * 0.12);
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

  fillTri(ctx, [cx - 78, top + 2], [cx + 78, top + 2], [cx, top - 52], FACET.ember);
  fillTri(ctx, [cx - 36, top + 2], [cx + 36, top + 2], [cx, top - 34], FACET_STEPS.emberBone);
  fillDiamond(ctx, cx, top - 14, 9, FACET.bone);

  fillDiamond(ctx, left + 14, cy, 14, FACET.ember);
  fillDiamond(ctx, right - 14, cy, 14, FACET.ember);
  drawCrystal(ctx, left - 18, cy, 28, {
    top: FACET_STEPS.emberBone,
    topRight: FACET.ember,
    right: FACET.lilac,
    bottom: FACET_STEPS.emberInk,
    left: FACET.sky,
    topLeft: FACET_STEPS.skyInk,
  });
  drawCrystal(ctx, right + 18, cy, 28, {
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
  ctx.fillText(label, cx, cy - (view.subtitle ? 22 : 0));

  if (view.subtitle) {
    ctx.font = `600 ${Math.max(16, Math.round(size * 0.34))}px "DM Sans", "Segoe UI", sans-serif`;
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
  const band = Math.min(height * 0.28, 200);
  const y = height;

  fillTri(ctx, [0, y], [width * 0.16, y - band * 0.95], [width * 0.32, y], kit.mid);
  fillTri(ctx, [0, y], [width * 0.06, y - band * 0.48], [width * 0.16, y - band * 0.95], kit.lit);
  fillTri(ctx, [width * 0.13, y - band * 0.72], [width * 0.16, y - band * 0.95], [width * 0.2, y - band * 0.7], FACET.bone);

  fillTri(ctx, [width * 0.28, y], [width * 0.48, y - band * 0.82], [width * 0.64, y], kit.mid);
  fillTri(ctx, [width * 0.48, y - band * 0.82], [width * 0.58, y - band * 0.38], [width * 0.64, y], kit.shade);
  fillTri(ctx, [width * 0.45, y - band * 0.62], [width * 0.48, y - band * 0.82], [width * 0.52, y - band * 0.6], FACET.bone);

  fillTri(ctx, [width * 0.62, y], [width * 0.84, y - band], [width, y], kit.mid);
  fillTri(ctx, [width * 0.84, y - band], [width, y - band * 0.5], [width, y], kit.shade);
  fillTri(ctx, [width * 0.81, y - band * 0.76], [width * 0.84, y - band], [width * 0.88, y - band * 0.74], FACET.bone);

  fillTri(ctx, [0, y], [width * 0.2, y - band * 0.52], [width * 0.38, y], kit.deep);
  fillTri(ctx, [width * 0.2, y - band * 0.52], [width * 0.3, y - band * 0.22], [width * 0.38, y], kit.shade);
  fillTri(ctx, [width * 0.34, y], [width * 0.56, y - band * 0.46], [width * 0.76, y], kit.shade);
  fillTri(ctx, [width * 0.7, y], [width * 0.9, y - band * 0.5], [width, y], kit.deep);
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
    drawCrystal(ctx, width * 0.09, height * 0.76, 36, crystalPalette(kit));
    drawCrystal(ctx, width * 0.92, height * 0.72, 28, crystalPalette(kit));
    return;
  }
  if (motif === "beams") {
    fillTri(ctx, [0, 0], [width * 0.24, 0], [0, height * 0.48], kit.lit);
    fillTri(ctx, [width * 0.1, 0], [width * 0.36, 0], [width * 0.05, height * 0.4], kit.mid);
    fillTri(ctx, [width * 0.74, 0], [width, 0], [width, height * 0.32], kit.shade);
    return;
  }
  if (motif === "posts") {
    drawPost(ctx, width * 0.09, height * 0.36, height * 0.52, kit);
    drawPost(ctx, width * 0.91, height * 0.34, height * 0.54, kit);
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
  fillTri(ctx, [x - 28 * scale, y + 30 * scale], [x, y - 6 * scale], [x + 8 * scale, y + 32 * scale], kit.shade);
  fillTri(ctx, [x, y - 6 * scale], [x + 32 * scale, y + 22 * scale], [x + 8 * scale, y + 32 * scale], kit.mid);
  fillTri(ctx, [x - 16 * scale, y + 4 * scale], [x, y - 40 * scale], [x + 16 * scale, y + 4 * scale], kit.lit);
  fillTri(ctx, [x - 8 * scale, y - 8 * scale], [x, y - 40 * scale], [x + 4 * scale, y - 8 * scale], FACET.bone);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {StageKit} kit
 * @param {number} scale
 */
function drawTree(ctx, x, y, kit, scale) {
  fillTri(ctx, [x - 12 * scale, y + 48 * scale], [x, y + 10 * scale], [x + 12 * scale, y + 48 * scale], kit.deep);
  fillTri(ctx, [x - 40 * scale, y + 22 * scale], [x, y - 52 * scale], [x + 8 * scale, y + 22 * scale], kit.mid);
  fillTri(ctx, [x - 8 * scale, y + 22 * scale], [x, y - 52 * scale], [x + 40 * scale, y + 24 * scale], kit.shade);
  fillTri(ctx, [x - 16 * scale, y - 14 * scale], [x, y - 52 * scale], [x + 16 * scale, y - 14 * scale], kit.lit);
  fillTri(ctx, [x - 8 * scale, y - 28 * scale], [x, y - 52 * scale], [x + 8 * scale, y - 28 * scale], FACET.bone);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {StageKit} kit
 */
function drawLogStack(ctx, x, y, kit) {
  fillTri(ctx, [x - 48, y + 16], [x + 52, y - 4], [x + 42, y + 24], FACET.ink);
  fillTri(ctx, [x - 48, y + 16], [x - 38, y - 10], [x + 52, y - 4], kit.deep);
  fillTri(ctx, [x - 32, y + 2], [x + 34, y - 24], [x + 26, y + 8], kit.lit);
  fillTri(ctx, [x - 20, y - 6], [x + 8, y - 24], [x + 16, y], FACET.ink);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {StageKit} kit
 */
function drawFlameShard(ctx, x, y, kit) {
  fillTri(ctx, [x - 24, y + 28], [x, y - 48], [x + 8, y + 24], kit.lit);
  fillTri(ctx, [x, y - 48], [x + 26, y + 22], [x + 8, y + 24], kit.mid);
  fillTri(ctx, [x - 12, y + 8], [x, y - 22], [x + 12, y + 8], FACET.bone);
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
function crystalPalette(_kit) {
  return {
    top: FACET.ember,
    topRight: FACET.sky,
    right: FACET.lilac,
    bottom: FACET_STEPS.skyInk,
    left: FACET.moss,
    topLeft: FACET_STEPS.emberBone,
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
