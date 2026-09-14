import { readFileSync } from "node:fs";
import { FACET, FACET_RGB, FACET_STEPS, mixHex } from "../theme/facet.js";
import {
  coralCrystal,
  drawCrystal,
  drawFaces,
  drawOfferedCue,
  emberCrystal,
  facetShade,
  fillDiamond,
  fillPoly,
  hexVertices,
  lilacCrystal,
  mossCrystal,
  offerShardFaces,
  strokeHex,
} from "./facet.js";
import {
  bucketLipOffset,
  canSpoutOffset,
  carryShade,
  drawCarryBowl,
  drawCarryBucket,
  drawCarryCan,
  drawCarryFlame,
  drawCarryPet,
  drawCarryPlant,
  drawCarryStream,
} from "./carry.js";

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

assert(carryShade({ missed: true }).mid === FACET.coral, "missed marks go Coral");
assert(carryShade({ offered: true }).mid === FACET.sky, "offered marks go Sky");
assert(carryShade({ held: true }).mid === FACET.ember, "held marks go Ember");
assert(carryShade({ happy: true }).mid === FACET.moss, "happy pet goes Moss");
assert(carryShade({ hue: "lilac" }).mid === FACET.lilac, "idle carry marks stay Lilac");

const shards = offerShardFaces(false);
assert(shards.length >= 6, "offered cue is several sky shards");
assert(
  shards.every((face) => face.pts.length === 3),
  "offered cue faces are triangles",
);
assert(
  shards.some((face) => face.fill === FACET.sky || face.fill === FACET_STEPS.skyBone),
  "offered cue uses Sky steps",
);

const idleCue = mockCtx();
drawOfferedCue(idleCue, 40, 40, 32, { offered: false, held: true });
const offeredCue = mockCtx();
drawOfferedCue(offeredCue, 40, 40, 32, { offered: true, held: true });
const idleFills = idleCue.calls.filter((call) => Array.isArray(call) && call[0] === "fill").length;
const offeredFills = offeredCue.calls.filter((call) => Array.isArray(call) && call[0] === "fill").length;
assert(offeredFills > idleFills, "offered cue paints extra Facet shards");
assert(
  offeredCue.calls.some((call) => Array.isArray(call) && call[0] === "stroke" && String(call[1]).includes(FACET_RGB.sky)),
  "offered hit hex stays Sky",
);

const scene = mockCtx();
drawCarryPlant(scene, 80, 80, { grown: false, missed: false, gated: false }, 40);
drawCarryPlant(scene, 80, 80, { grown: true, missed: false, gated: false }, 40);
drawCarryCan(scene, 80, 80, { held: false, gated: false, missed: false, face: 1 }, 40);
drawCarryCan(scene, 80, 80, { held: true, offered: true, gated: false, missed: false, face: -1 }, 40);
drawCarryPet(scene, 80, 80, { happy: false, missed: false, gated: false }, 40);
drawCarryPet(scene, 80, 80, { happy: true, missed: true, gated: false }, 40);
drawCarryBowl(scene, 80, 80, { held: true, gated: false, missed: false }, 40);
drawCarryFlame(scene, 80, 80, { out: false, missed: false, gated: false, elapsed: 0.4 }, 40);
drawCarryFlame(scene, 80, 80, { out: true, missed: false, gated: false, elapsed: 0.4 }, 40);
drawCarryBucket(scene, 80, 80, { held: false, gated: true, missed: false, face: -1 }, 40);
drawCarryStream(scene, {
  x0: 10,
  y0: 10,
  x1: 80,
  y1: 40,
  elapsed: 0.3,
  rgb: "122, 162, 247",
  count: 4,
});

const fills = scene.calls.filter((call) => Array.isArray(call) && call[0] === "fill").map((call) => call[1]);
assert(fills.length > 40, "carry sprites fill many hard faces");
assert(
  fills.every((fill) => typeof fill === "string" && (fill.startsWith("#") || fill.startsWith("rgba("))),
  "every fill is a flat hex or token rgba — no gradients",
);

const allowedHex = new Set([
  ...Object.values(FACET),
  ...Object.values(FACET_STEPS),
  mixHex(FACET.moss, FACET.ink, 0.55),
  mixHex(FACET.ember, FACET.ink, 0.58),
]);
const hexFills = fills.filter((fill) => fill.startsWith("#"));
for (const fill of hexFills) {
  assert(allowedHex.has(fill), `unexpected fill ${fill}`);
}

const leftSpout = canSpoutOffset(-1);
const rightSpout = canSpoutOffset(1);
assert(rightSpout.x > 0 && leftSpout.x < 0, "watering can spout faces the plant");
assert(bucketLipOffset(1).y < 0, "bucket stream starts at the lip");

const carrySource = readFileSync(new URL("./carry.js", import.meta.url), "utf8");
for (const banned of ["quadraticCurveTo", "bezierCurveTo", "ellipse(", "arc(", "createLinearGradient", "createRadialGradient"]) {
  assert(!carrySource.includes(banned), `carry sprites must not use ${banned}`);
}

const marks = ["plant.svg", "can.svg", "pet.svg", "bowl.svg", "flame.svg", "bucket.svg"];
const svgHex = /#[0-9a-fA-F]{6}/g;
const svgAllowed = new Set([
  ...allowedHex,
  mixHex(FACET.ember, FACET.ink, 0.5),
  mixHex(FACET.moss, FACET.ink, 0.5),
]);
for (const name of marks) {
  const svg = readFileSync(new URL(`../assets/facet/${name}`, import.meta.url), "utf8");
  assert(svg.includes("polygon"), `${name} is triangle faces`);
  assert(!/gradient|filter|opacity=/i.test(svg), `${name} stays flat fills`);
  for (const hex of svg.match(svgHex) ?? []) {
    assert(svgAllowed.has(hex.toLowerCase()) || svgAllowed.has(hex), `${name} uses unknown ${hex}`);
  }
}

console.log("render/facet.test.mjs passed");
