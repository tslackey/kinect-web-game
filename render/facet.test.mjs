import { FACET, FACET_STEPS } from "../theme/facet.js";
import {
  coralCrystal,
  drawCrystal,
  drawFaces,
  emberCrystal,
  facetShade,
  fillDiamond,
  fillPoly,
  hexVertices,
  lilacCrystal,
  mossCrystal,
  strokeHex,
} from "./facet.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function mockCtx() {
  /** @type {unknown[]} */
  const calls = [];
  return {
    calls,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    globalAlpha: 1,
    beginPath() {
      calls.push("beginPath");
    },
    moveTo(x, y) {
      calls.push(["moveTo", x, y]);
    },
    lineTo(x, y) {
      calls.push(["lineTo", x, y]);
    },
    closePath() {
      calls.push("closePath");
    },
    fill() {
      calls.push(["fill", this.fillStyle]);
    },
    stroke() {
      calls.push(["stroke", this.strokeStyle, this.lineWidth]);
    },
    save() {
      calls.push("save");
    },
    restore() {
      calls.push("restore");
    },
  };
}

const verts = hexVertices(10, 20, 8);
assert(verts.length === 6, "hex has six points");
assert(verts[0][0] === 10 && verts[0][1] === 12, "hex starts at the top");

const moss = mossCrystal();
assert(moss.top === FACET_STEPS.mossBone, "orb crystal uses moss-bone");
assert(emberCrystal().stroke === FACET.ember, "ember crystal stroke");
assert(coralCrystal().stroke === FACET.coral, "coral crystal stroke");
assert(lilacCrystal().top === FACET_STEPS.lilacBone, "lilac crystal uses lilac-bone");

const ctx = mockCtx();
fillPoly(ctx, [[0, 0], [4, 0], [2, 3]], FACET.moss);
assert(ctx.calls.includes("beginPath"), "fillPoly opens a path");
assert(ctx.fillStyle === FACET.moss, "fillPoly uses the given token");

fillDiamond(ctx, 0, 0, 5, FACET.sky);
drawFaces(ctx, 0, 0, 2, [{ pts: [[1, 1], [2, 1], [1, 2]], fill: FACET.lilac }]);
drawCrystal(ctx, 0, 0, 10, moss);
strokeHex(ctx, 0, 0, 12, FACET.moss, 2);
assert(ctx.lineCap === "butt", "hex strokes stay hard-edged");
assert(ctx.lineJoin === "miter", "hex strokes stay mitered");

const shade = facetShade("moss");
assert(shade.lit === FACET_STEPS.mossBone, "lit step is hue toward Bone");
assert(shade.mid === FACET.moss, "mid step is the named hue");
assert(shade.shade === FACET_STEPS.mossInk, "shade step is hue toward Ink");

console.log("render/facet.test.mjs passed");
