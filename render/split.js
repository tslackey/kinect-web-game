/**
 * Facet 2P split-lane chrome. Visual-only.
 *
 * Competitive split: a slim mist panel seam down the center, plus Moss (P1)
 * / Sky (P2) side ticks that match the skeleton hues. Coop and 1P draw
 * nothing so Hot potato / Mirror keep a clean center field.
 *
 * Triangles, flat fills, upper-left light. No gradients or soft edges.
 */

import { FACET } from "../theme/facet.js";
import { facetShade, fillDiamond, fillPoly, fillTri } from "./facet.js";

/**
 * Live split chrome only. Coop-center and 1P solo stay undivided.
 *
 * @param {{ layout?: string | null, scene?: { layout?: string | null } | null } | null | undefined} state
 */
export function isSplitLayout(state) {
  return state?.layout === "split" || state?.scene?.layout === "split";
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {{ layout?: string | null, scene?: { layout?: string | null } | null } | null | undefined} state
 */
export function drawSplitChrome(ctx, width, height, state) {
  if (!isSplitLayout(state)) return;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 8 || height < 8) return;
  ctx.save();
  drawLaneSeam(ctx, width, height);
  drawSideCue(ctx, width, height, "p1");
  drawSideCue(ctx, width, height, "p2");
  ctx.restore();
}

/**
 * Quiet fold where the two panels meet — a zigzag of mist triangles, not a
 * stroked rule. Upper-left faces stay Bone-lit; lower-right faces go Ink.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 */
function drawLaneSeam(ctx, width, height) {
  const mid = width * 0.5;
  const top = height * 0.12;
  const bot = height * 0.92;
  const half = Math.max(6, Math.min(11, width * 0.009));
  const folds = 8;
  const span = bot - top;

  for (let i = 0; i < folds; i += 1) {
    const y0 = top + (i / folds) * span;
    const y1 = top + ((i + 1) / folds) * span;
    const slash = i % 2 === 0;
    const leftW = slash ? half : half * 0.58;
    const rightW = slash ? half * 0.58 : half;
    const leftLit = slash ? FACET.mist : FACET.bone;
    const leftShade = FACET.ink;
    const rightMid = slash ? FACET.ink : FACET.mist;

    fillTri(ctx, [mid - leftW, y0], [mid, y0], [mid, y1], leftLit);
    fillTri(ctx, [mid - leftW, y0], [mid, y1], [mid - leftW * 0.42, y1], leftShade);
    fillTri(ctx, [mid, y0], [mid + rightW, y0], [mid, y1], rightMid);
    fillTri(ctx, [mid, y1], [mid + rightW * 0.42, y1], [mid + rightW, y0], FACET.ink);
  }

  fillDiamond(ctx, mid, top - 1, 5, FACET.bone);
  fillDiamond(ctx, mid, top - 1, 2, FACET.mist);
  fillDiamond(ctx, mid, bot + 1, 4, FACET.mist);
}

/**
 * Outer-edge lane identity. P1 Moss on the left, P2 Sky on the right.
 * Kept at mid-height so HUD (top-left) and camera feeds (bottom-right)
 * stay clear, and the playfield center stays open for props.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {"p1" | "p2"} player
 */
function drawSideCue(ctx, width, height, player) {
  const p1 = player === "p1";
  const body = facetShade(p1 ? "moss" : "sky");
  const edge = p1 ? 0 : width;
  const dir = p1 ? 1 : -1;
  const cy = height * 0.5;
  const tickW = Math.max(11, Math.min(18, width * 0.015));
  const tickH = Math.max(20, height * 0.036);
  const ticks = 4;
  const total = tickH * ticks;
  const y0 = cy - total / 2;

  for (let i = 0; i < ticks; i += 1) {
    const top = y0 + i * tickH;
    const bot = top + tickH;
    const midY = (top + bot) / 2;
    const depth = i % 2 === 0 ? tickW : tickW * 0.64;
    const fill = i === 0 ? body.lit : i === ticks - 1 ? body.shade : body.mid;
    fillTri(ctx, [edge, top], [edge + dir * depth, midY], [edge, bot], fill);
  }

  const plateH = Math.max(22, Math.min(28, height * 0.04));
  const plateW = plateH * 1.7;
  const plateX = edge + dir * (tickW + 6);
  const plateY = y0 - plateH - 6;
  drawNamePlate(ctx, plateX, plateY, plateW, plateH, p1 ? "P1" : "P2", body, dir);
}

/**
 * Hard-cut name plate. Upper-left triangle is the lit face.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x Inner edge of the plate (toward the field).
 * @param {number} y Top of the plate.
 * @param {number} w
 * @param {number} h
 * @param {string} label
 * @param {ReturnType<typeof facetShade>} body
 * @param {number} dir +1 left lane, -1 right lane
 */
function drawNamePlate(ctx, x, y, w, h, label, body, dir) {
  const left = dir > 0 ? x : x - w;
  const right = left + w;
  const cut = Math.min(10, w * 0.22);
  fillPoly(
    ctx,
    [
      [left, y + cut],
      [left + cut, y],
      [right, y],
      [right, y + h - cut],
      [right - cut, y + h],
      [left, y + h],
    ],
    FACET.ink,
  );
  fillTri(ctx, [left, y + cut], [left + cut, y], [left + w * 0.55, y], body.lit);
  fillTri(ctx, [left, y + cut], [left + w * 0.55, y], [left, y + h * 0.55], body.mid);

  ctx.font = `700 ${Math.round(h * 0.72)}px "Bebas Neue", "Arial Narrow", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = body.mid;
  ctx.fillText(label, left + w * 0.52, y + h * 0.54);
}
