import { readFileSync } from "node:fs";
import { FACET, FACET_STEPS } from "../theme/facet.js";
import { facetShade } from "./facet.js";
import {
  bugFaces,
  drawStompBug,
  impactFaces,
  squashFaces,
  stompFootFaces,
  stompShade,
} from "./stomp.js";

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

assert(stompShade().mid === FACET.lilac, "idle bug is Lilac");
assert(stompShade({ squashed: true }).mid === FACET.lilac, "crushed bug stays Lilac so it reads on the moss terrain");
assert(stompShade({ missed: true }).mid === FACET.coral, "missed marks go Coral");
assert(stompShade({ missed: true, squashed: true }).mid === FACET.coral, "missed wins over squash");

const lilac = facetShade("lilac");
const ember = facetShade("ember");
const live = bugFaces(lilac, lilac, ember, 1, false);
assert(live.length >= 16, "live bug has many hard faces");
assert(
  live.every((face) => face.pts.length === 3),
  "live bug faces are triangles",
);

const flipped = bugFaces(lilac, lilac, ember, -1, false);
assert(flipped[0].pts[0][0] === -live[0].pts[0][0], "heading flips on the x axis");

const splat = squashFaces(facetShade("moss"), ember, false);
assert(splat.length >= 8, "squash splat is several triangles");
assert(
  splat.every((face) => face.pts.length === 3),
  "squash faces are triangles",
);

const foot = stompFootFaces(false);
assert(foot.length >= 6, "stomp foot is a faceted boot");
assert(
  foot.some((face) => face.pts.every(([, y]) => y < 0)),
  "boot sits above the hit center",
);

const zone = 40;
const scene = mockCtx();
drawStompBug(scene, 80, 80, { squashed: false, squashing: false, missed: false, gated: false, elapsed: 0.2 }, zone);
drawStompBug(scene, 80, 80, { squashed: false, squashing: true, missed: false, gated: false, elapsed: 0.4 }, zone);
drawStompBug(scene, 80, 80, { squashed: true, squashing: true, missed: false, gated: false, elapsed: 0.6 }, zone);
drawStompBug(scene, 80, 80, { squashed: false, squashing: false, missed: true, gated: false, elapsed: 0.2 }, zone);
drawStompBug(scene, 80, 80, { squashed: false, squashing: false, missed: false, gated: true, elapsed: 0.2 }, zone);

const fills = scene.calls.filter((call) => Array.isArray(call) && call[0] === "fill").map((call) => call[1]);
assert(fills.length > 40, "stomp sprites fill many hard faces");
assert(
  fills.every((fill) => typeof fill === "string" && (fill.startsWith("#") || fill.startsWith("rgba("))),
  "every fill is a flat hex or token rgba — no gradients",
);

const allowedHex = new Set([...Object.values(FACET), ...Object.values(FACET_STEPS)]);
const hexFills = fills.filter((fill) => fill.startsWith("#"));
for (const fill of hexFills) {
  assert(allowedHex.has(fill), `unexpected fill ${fill}`);
}

assert(
  scene.calls.some((call) => Array.isArray(call) && call[0] === "stroke" && String(call[1]).includes(FACET_RGB_LILAC())),
  "live ring uses Lilac",
);

const shards = impactFaces(false, 0);
assert(shards.length === 6, "impact cue is six shards");
const kicked = impactFaces(false, Math.PI / 2 / 14);
const still = impactFaces(false, 0);
assert(Math.hypot(...kicked[0].pts[0]) > Math.hypot(...still[0].pts[0]), "impact shards pulse outward");

const liveExtent = extent(live);
assert(liveExtent.x <= 36 && liveExtent.y <= 28, "live silhouette stays inside the hit ring");
const splatExtent = extent(splat);
assert(splatExtent.x <= 36 && splatExtent.y <= 20, "splat silhouette stays inside the hit ring");

const stompSource = readFileSync(new URL("./stomp.js", import.meta.url), "utf8");
for (const banned of ["quadraticCurveTo", "bezierCurveTo", "ellipse(", "arc(", "createLinearGradient", "createRadialGradient"]) {
  assert(!stompSource.includes(banned), `stomp sprites must not use ${banned}`);
}

const marks = ["bug.svg", "stomp.svg"];
const svgHex = /#[0-9a-fA-F]{6}/g;
for (const name of marks) {
  const svg = readFileSync(new URL(`../assets/facet/${name}`, import.meta.url), "utf8");
  assert(svg.includes("polygon"), `${name} is triangle faces`);
  assert(!/gradient|filter|opacity=/i.test(svg), `${name} stays flat fills`);
  for (const hex of svg.match(svgHex) ?? []) {
    assert(allowedHex.has(hex.toLowerCase()) || allowedHex.has(hex), `${name} uses unknown ${hex}`);
  }
}

console.log("render/stomp.test.mjs passed");

function FACET_RGB_LILAC() {
  return "187, 154, 247";
}

/**
 * @param {{ pts: [number, number][] }[]} faces
 */
function extent(faces) {
  let x = 0;
  let y = 0;
  for (const face of faces) {
    for (const [px, py] of face.pts) {
      x = Math.max(x, Math.abs(px));
      y = Math.max(y, Math.abs(py));
    }
  }
  return { x, y };
}
