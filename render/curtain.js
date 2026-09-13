/**
 * Placeholder Facet curtain + title placard. Shine can skin later.
 * Cover 0 is open; 1 is closed. Panels drop from the top.
 */

import { FACET, FACET_RGB, FACET_STEPS } from "../theme/facet.js";
import { fillDiamond, fillPoly } from "./facet.js";

/**
 * @typedef {import("../game/transition.js").CurtainView} CurtainView
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {string | null | undefined} backgroundId
 */
export function drawStageWash(ctx, width, height, backgroundId) {
  const wash = STAGE_WASH[backgroundId ?? ""] ?? STAGE_WASH.crystal;
  ctx.fillStyle = `rgba(${wash.rgb}, ${wash.alpha})`;
  ctx.fillRect(0, 0, width, height);

  const band = Math.min(height * 0.22, 160);
  ctx.fillStyle = `rgba(${wash.rgb}, ${wash.alpha + 0.05})`;
  fillPoly(
    ctx,
    [
      [0, height - band],
      [width * 0.35, height - band * 0.55],
      [width, height - band * 0.8],
      [width, height],
      [0, height],
    ],
    `rgba(${wash.rgb}, ${wash.alpha + 0.06})`,
  );
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
  if (cover <= 0.001) {
    if (view.placard) drawPlacard(ctx, width, height, view, reducedMotion);
    return;
  }

  const drop = height * cover;
  ctx.fillStyle = `rgba(${FACET_RGB.ink}, ${0.72 * cover})`;
  ctx.fillRect(0, 0, width, Math.max(drop, height * cover));
  const panels = [
    { x0: 0, x1: width * 0.42, fill: FACET.lilac, extra: 0 },
    { x0: width * 0.3, x1: width * 0.72, fill: FACET.ember, extra: height * 0.05 * cover },
    { x0: width * 0.58, x1: width, fill: FACET.sky, extra: height * 0.03 * cover },
  ];

  for (const panel of panels) {
    fillPoly(
      ctx,
      [
        [panel.x0, 0],
        [panel.x1, 0],
        [panel.x1, drop + panel.extra],
        [(panel.x0 + panel.x1) / 2, drop + panel.extra + 18 * cover],
        [panel.x0, drop + panel.extra * 0.6],
      ],
      panel.fill,
    );
  }

  ctx.fillStyle = `rgba(${FACET_RGB.ember}, ${0.16 * cover})`;
  ctx.fillRect(0, Math.max(0, drop - 10), width, 10);

  if (view.placard) drawPlacard(ctx, width, height, view, reducedMotion);
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
  const cardW = Math.min(width * 0.72, 640);
  const cardH = Math.min(height * 0.28, 220);

  ctx.globalAlpha = 0.22 + reveal * 0.7;
  fillPoly(
    ctx,
    [
      [cx - cardW / 2, cy - cardH / 2 + 16],
      [cx - cardW / 2 + 22, cy - cardH / 2],
      [cx + cardW / 2, cy - cardH / 2],
      [cx + cardW / 2, cy + cardH / 2 - 18],
      [cx + cardW / 2 - 26, cy + cardH / 2],
      [cx - cardW / 2, cy + cardH / 2],
    ],
    FACET_STEPS.emberInk,
  );
  fillDiamond(ctx, cx - cardW / 2 + 8, cy, 14, FACET.ember);
  fillDiamond(ctx, cx + cardW / 2 - 8, cy, 14, FACET.ember);

  const size = Math.round(Math.min(width, height) * (reducedMotion ? 0.11 : 0.16));
  ctx.font = `700 ${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = FACET.bone;
  ctx.fillText(title.toUpperCase(), cx, cy - (view.subtitle ? 14 : 0));

  if (view.subtitle) {
    ctx.font = `600 ${Math.round(size * 0.28)}px "DM Sans", "Segoe UI", sans-serif`;
    ctx.fillStyle = FACET.mist;
    ctx.fillText(view.subtitle, cx, cy + size * 0.42);
  }
  ctx.globalAlpha = 1;
}

const STAGE_WASH = {
  garden: { rgb: FACET_RGB.moss, alpha: 0.1 },
  hearth: { rgb: FACET_RGB.ember, alpha: 0.1 },
  ash: { rgb: FACET_RGB.coral, alpha: 0.09 },
  dirt: { rgb: FACET_RGB.mist, alpha: 0.08 },
  crystal: { rgb: FACET_RGB.lilac, alpha: 0.08 },
  beam: { rgb: FACET_RGB.sky, alpha: 0.1 },
  bar: { rgb: FACET_RGB.moss, alpha: 0.09 },
  stage: { rgb: FACET_RGB.lilac, alpha: 0.1 },
  tilt: { rgb: FACET_RGB.ember, alpha: 0.09 },
  cue: { rgb: FACET_RGB.coral, alpha: 0.1 },
  pitch: { rgb: FACET_RGB.moss, alpha: 0.1 },
  span: { rgb: FACET_RGB.sky, alpha: 0.1 },
  high: { rgb: FACET_RGB.lilac, alpha: 0.1 },
  grove: { rgb: FACET_RGB.moss, alpha: 0.11 },
  hello: { rgb: FACET_RGB.sky, alpha: 0.09 },
  press: { rgb: FACET_RGB.ember, alpha: 0.1 },
};

/**
 * @param {number} value
 */
function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
