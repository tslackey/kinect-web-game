import { readFileSync } from "node:fs";
import { FACET, FACET_STEPS } from "../theme/facet.js";
import { facetShade } from "./facet.js";
import {
  ballFaces,
  beamPylonFaces,
  clapHandFaces,
  drawSimpleScene,
  fruitFaces,
  highFiveHandFaces,
  hurdlePostFaces,
  leanChevronFaces,
  poseStarFaces,
  simpleShade,
  squashPadFaces,
  stretchPostFaces,
  trayFaces,
  trayGoalFaces,
  potatoFaces,
  ghostMarkFaces,
  waveChevronFaces,
  waveHandFaces,
  goalMouthFaces,
  hoopFaces,
  doughPinFaces,
} from "./simple.js";

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

assert(simpleShade().mid === FACET.sky, "idle simple marks default to Sky");
assert(simpleShade({ ready: true }).mid === FACET.moss, "success marks go Moss");
assert(simpleShade({ missed: true }).mid === FACET.coral, "missed marks go Coral");
assert(simpleShade({ missed: true, ready: true }).mid === FACET.coral, "missed wins over ready");
assert(simpleShade({ hue: "ember" }).mid === FACET.ember, "duck beam idles Ember");

const ember = facetShade("ember");
const sky = facetShade("sky");
const lilac = facetShade("lilac");

const builders = [
  ["beam pylons", beamPylonFaces(ember, 1, false)],
  ["hurdle posts", hurdlePostFaces(facetShade("moss"), 1, false)],
  ["pose stars", poseStarFaces(lilac, false)],
  ["lean chevrons", leanChevronFaces(ember, 1, false)],
  ["clap hands", clapHandFaces(ember, 1, false)],
  ["game ball", ballFaces(sky, false)],
  ["goal mouth", goalMouthFaces(facetShade("moss"), false)],
  ["hoop", hoopFaces(ember, false)],
  ["stretch posts", stretchPostFaces(sky, 1, false)],
  ["high-five hand", highFiveHandFaces(lilac, false)],
  ["fruit", fruitFaces(ember, false)],
  ["wave hand", waveHandFaces(sky, false)],
  ["wave chevrons", waveChevronFaces(sky, false)],
  ["squash pad", squashPadFaces(ember, false, 1)],
  ["dough pin", doughPinFaces(sky, false)],
  ["tray", trayFaces(lilac, false)],
  ["tray goal", trayGoalFaces(facetShade("moss"), false)],
  ["potato", potatoFaces(ember, false)],
  ["ghost mark", ghostMarkFaces(lilac, false)],
];

for (const [name, faces] of builders) {
  assert(faces.length >= 5, `${name} has several hard faces`);
  assert(
    faces.every((face) => face.pts.length === 3),
    `${name} faces are triangles`,
  );
}

const flipped = beamPylonFaces(ember, -1, false);
const live = beamPylonFaces(ember, 1, false);
assert(flipped[0].pts[0][0] === -live[0].pts[0][0], "beam pylons flip on the x axis");

const flat = squashPadFaces(ember, false, 0.72);
const tall = squashPadFaces(ember, false, 1);
assert(Math.abs(flat[0].pts[0][1]) < Math.abs(tall[0].pts[0][1]), "squash pad flattens when pressed");

const scenes = [
  { kind: "duck-beam", beam: { y: 0.46 }, ducked: false },
  { kind: "duck-beam", beam: { y: 0.46 }, ducked: true },
  { kind: "jump-bar", bar: { y: 0.2 }, cleared: false },
  { kind: "strike-pose", left: { x: 0.24, y: 0.38, held: false }, right: { x: 0.76, y: 0.38, held: true } },
  { kind: "lean-away", side: "right", leaned: false },
  { kind: "clap-now", cue: true, clapped: false },
  { kind: "score-goal", ball: { x: 0.5, y: 0.6, stage: 0 }, goal: { x0: 0.8, y0: 0.44, x1: 0.96, y1: 0.72 }, kicking: true },
  { kind: "shoot-hoops", ball: { x: 0.36, y: 0.66, stage: 0 }, hoop: { x: 0.72, y: 0.22 }, shooting: true },
  { kind: "stretch-wide", left: { x: 0.16, y: 0.42, held: true }, right: { x: 0.84, y: 0.42, held: false }, wide: false },
  { kind: "high-five", zone: { x: 0.72, y: 0.18 }, slapped: true },
  { kind: "catch-fruit", fruit: { x: 0.4, y: 0.3, stage: 0 }, caught: false },
  { kind: "wave-hello", waving: true, held: 0.2 },
  { kind: "squash-it", zone: { x: 0.5, y: 0.4 }, hands: 2, squashing: true },
  {
    kind: "roll-dough",
    pin: { x: 0.5, y: 0.5, held: true },
    left: { x: 0.36, y: 0.5, held: true },
    right: { x: 0.64, y: 0.5, held: true },
    dough: { x: 0.5, y: 0.52, flatten: 0.6 },
    strokes: 2,
    rolling: true,
  },
  {
    kind: "balance-tray",
    tray: { x: 0.24, y: 0.62, held: true, offered: false, heldBy: "p1:left_wrist", tipped: false },
    goal: { x: 0.76, y: 0.56 },
    tilt: 0.02,
    arriving: true,
  },
  {
    kind: "mirror-me",
    mode: "solo",
    left: { x: 0.24, y: 0.38, held: true },
    right: { x: 0.76, y: 0.38, held: false },
    matched: false,
  },
  {
    kind: "hot-potato",
    potato: { x: 0.4, y: 0.5, held: true, offered: true, heldBy: "p1:left_wrist" },
    passes: 0,
  },
];

const scene = mockCtx();
for (const next of scenes) {
  drawSimpleScene(scene, 800, 600, {
    phase: "playing",
    result: null,
    transition: null,
    elapsed: 0.4,
    scene: next,
  });
}
drawSimpleScene(scene, 800, 600, {
  phase: "result",
  result: "fail",
  transition: null,
  elapsed: 0.2,
  scene: { kind: "duck-beam", beam: { y: 0.46 }, ducked: false },
});

const fills = scene.calls.filter((call) => Array.isArray(call) && call[0] === "fill").map((call) => call[1]);
assert(fills.length > 80, "simple-pack sprites fill many hard faces");
assert(
  fills.every((fill) => typeof fill === "string" && (fill.startsWith("#") || fill.startsWith("rgba("))),
  "every fill is a flat hex or token rgba — no gradients",
);

const allowedHex = new Set([...Object.values(FACET), ...Object.values(FACET_STEPS)]);
const hexFills = fills.filter((fill) => fill.startsWith("#"));
for (const fill of hexFills) {
  assert(allowedHex.has(fill), `unexpected fill ${fill}`);
}

const idlePotato = mockCtx();
drawSimpleScene(idlePotato, 800, 600, {
  phase: "playing",
  result: null,
  transition: null,
  elapsed: 0.4,
  scene: {
    kind: "hot-potato",
    potato: { x: 0.4, y: 0.5, held: true, offered: false, heldBy: "p1:left_wrist" },
    passes: 0,
  },
});
const offeredPotato = mockCtx();
drawSimpleScene(offeredPotato, 800, 600, {
  phase: "playing",
  result: null,
  transition: null,
  elapsed: 0.4,
  scene: {
    kind: "hot-potato",
    potato: { x: 0.4, y: 0.5, held: true, offered: true, heldBy: "p1:left_wrist" },
    passes: 0,
  },
});
const idlePotatoFills = idlePotato.calls.filter((call) => Array.isArray(call) && call[0] === "fill").length;
const offeredPotatoFills = offeredPotato.calls.filter((call) => Array.isArray(call) && call[0] === "fill").length;
assert(offeredPotatoFills > idlePotatoFills, "offered potato adds Facet sky shards");

const source = readFileSync(new URL("./simple.js", import.meta.url), "utf8");
for (const banned of ["quadraticCurveTo", "bezierCurveTo", "ellipse(", "arc(", "createLinearGradient", "createRadialGradient", "shadowBlur", "fillRect"]) {
  assert(!source.includes(banned), `simple-pack marks must not use ${banned}`);
}

const marks = [
  "beam.svg",
  "bar.svg",
  "pose.svg",
  "lean.svg",
  "clap.svg",
  "ball.svg",
  "stretch.svg",
  "hand.svg",
  "fruit.svg",
  "wave.svg",
  "squash.svg",
  "tray.svg",
  "potato.svg",
  "ghost.svg",
];
const svgHex = /#[0-9a-fA-F]{6}/g;
for (const name of marks) {
  const svg = readFileSync(new URL(`../assets/facet/${name}`, import.meta.url), "utf8");
  assert(svg.includes("polygon"), `${name} is triangle faces`);
  assert(!/gradient|filter|opacity=/i.test(svg), `${name} stays flat fills`);
  for (const hex of svg.match(svgHex) ?? []) {
    assert(allowedHex.has(hex.toLowerCase()) || allowedHex.has(hex), `${name} uses unknown ${hex}`);
  }
}

console.log("render/simple.test.mjs passed");
