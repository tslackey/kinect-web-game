/**
 * Facet Core — flat tokens only.
 * Named colors are the locked set. Depth is a mix toward Bone or Ink,
 * never a new named hue. One light direction: upper-left.
 */

export const FACET = {
  ink: "#1a1b26",
  bone: "#f4efe6",
  ember: "#ff9e64",
  moss: "#9ece6a",
  sky: "#7aa2f7",
  lilac: "#bb9af7",
  coral: "#f7768e",
  mist: "#a9b1d6",
};

/**
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number, css: string }}
 */
export function hexToRgb(hex) {
  const n = hex.replace("#", "");
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return { r, g, b, css: `${r}, ${g}, ${b}` };
}

/**
 * Mix `a` toward `b` by t in [0, 1]. Used for light / mid / dark steps.
 * @param {string} a
 * @param {string} b
 * @param {number} t
 */
export function mixHex(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const amount = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0;
  const hex = (value) => value.toString(16).padStart(2, "0");
  const r = Math.round(A.r + (B.r - A.r) * amount);
  const g = Math.round(A.g + (B.g - A.g) * amount);
  const bl = Math.round(A.b + (B.b - A.b) * amount);
  return `#${hex(r)}${hex(g)}${hex(bl)}`;
}

export const FACET_STEPS = {
  mossInk: mixHex(FACET.moss, FACET.ink, 0.32),
  mossBone: mixHex(FACET.moss, FACET.bone, 0.28),
  skyInk: mixHex(FACET.sky, FACET.ink, 0.32),
  skyBone: mixHex(FACET.sky, FACET.bone, 0.28),
  lilacInk: mixHex(FACET.lilac, FACET.ink, 0.32),
  lilacBone: mixHex(FACET.lilac, FACET.bone, 0.22),
  emberInk: mixHex(FACET.ember, FACET.ink, 0.32),
  emberBone: mixHex(FACET.ember, FACET.bone, 0.28),
  coralInk: mixHex(FACET.coral, FACET.ink, 0.32),
  coralBone: mixHex(FACET.coral, FACET.bone, 0.22),
};

export const FACET_RGB = {
  ink: hexToRgb(FACET.ink).css,
  bone: hexToRgb(FACET.bone).css,
  ember: hexToRgb(FACET.ember).css,
  moss: hexToRgb(FACET.moss).css,
  sky: hexToRgb(FACET.sky).css,
  lilac: hexToRgb(FACET.lilac).css,
  coral: hexToRgb(FACET.coral).css,
  mist: hexToRgb(FACET.mist).css,
};

/** Player 1 = Moss, player 2 = Sky. Fail reads as Coral. */
export const PLAYER_RGB = [FACET_RGB.moss, FACET_RGB.sky];
