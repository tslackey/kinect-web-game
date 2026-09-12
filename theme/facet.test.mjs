import { FACET, FACET_RGB, PLAYER_RGB, hexToRgb, mixHex } from "./facet.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(FACET.ink === "#1a1b26", "Ink token");
assert(FACET.bone === "#f4efe6", "Bone token");
assert(FACET.ember === "#ff9e64", "Ember token");
assert(FACET.moss === "#9ece6a", "Moss token");
assert(FACET.sky === "#7aa2f7", "Sky token");
assert(FACET.lilac === "#bb9af7", "Lilac token");
assert(FACET.coral === "#f7768e", "Coral token");
assert(FACET.mist === "#a9b1d6", "Mist token");

assert(Object.keys(FACET).length === 8, "Facet Core is eight named tokens");
assert(FACET_RGB.moss === "158, 206, 106", "Moss rgb for canvas");
assert(PLAYER_RGB[0] === FACET_RGB.moss, "P1 is Moss");
assert(PLAYER_RGB[1] === FACET_RGB.sky, "P2 is Sky");

const mid = mixHex(FACET.moss, FACET.ink, 0);
assert(mid === FACET.moss, "mix t=0 is the source hue");
const inked = mixHex(FACET.moss, FACET.ink, 1);
assert(inked === FACET.ink, "mix t=1 is Ink");
assert(hexToRgb(FACET.coral).css === "247, 118, 142", "Coral rgb");

console.log("theme/facet.test.mjs passed");
