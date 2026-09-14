import { readFileSync } from "node:fs";
import { FACET, FACET_STEPS } from "../theme/facet.js";
import { drawSplitChrome, isSplitLayout } from "./split.js";

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
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
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
    fillText(text, x, y) {
      calls.push(["fillText", text, x, y, this.fillStyle]);
    },
    save() {
      calls.push("save");
    },
    restore() {
      calls.push("restore");
    },
  };
}

function hexFills(calls) {
  return calls
    .filter((call) => Array.isArray(call) && call[0] === "fill")
    .map((call) => call[1])
    .filter((fill) => typeof fill === "string" && fill.startsWith("#"));
}

assert(isSplitLayout({ layout: "split" }) === true, "live split layout is chrome");
assert(isSplitLayout({ layout: "coop", scene: { layout: "coop" } }) === false, "coop is not split chrome");
assert(isSplitLayout({ layout: "solo" }) === false, "1P solo is not split chrome");
assert(isSplitLayout({ layout: "coop", scene: { layout: "split" } }) === true, "scene.layout split still gates chrome");
assert(isSplitLayout(null) === false, "missing state draws nothing");

const coop = mockCtx();
drawSplitChrome(coop, 800, 600, { layout: "coop", scene: { kind: "hot-potato", layout: "coop" } });
assert(coop.calls.length === 0, "coop Hot potato draws no divider or side cues");

const solo = mockCtx();
drawSplitChrome(solo, 800, 600, { layout: "solo", scene: { kind: "feed-pet" } });
assert(solo.calls.length === 0, "1P draws no split chrome");

const split = mockCtx();
drawSplitChrome(split, 960, 540, { layout: "split", scene: { kind: "feed-pet", layout: "split" } });
assert(split.calls.includes("save") && split.calls.includes("restore"), "split chrome isolates canvas state");
assert(split.calls.filter((call) => Array.isArray(call) && call[0] === "fill").length > 20, "seam and side cues are many hard faces");
assert(!split.calls.some((call) => Array.isArray(call) && call[0] === "stroke"), "seam is a panel fold, not a stroked rule");

const fills = hexFills(split.calls);
assert(fills.includes(FACET.mist), "center seam uses Mist");
assert(fills.includes(FACET.ink), "seam has Ink shade faces");
assert(fills.includes(FACET.bone), "upper pin is Bone-lit");
assert(fills.includes(FACET.moss) || fills.includes(FACET_STEPS.mossBone), "P1 cue uses Moss steps");
assert(fills.includes(FACET.sky) || fills.includes(FACET_STEPS.skyBone), "P2 cue uses Sky steps");

const labels = split.calls.filter((call) => Array.isArray(call) && call[0] === "fillText");
assert(
  labels.some((call) => call[1] === "P1" && (call[4] === FACET.moss || call[4] === FACET_STEPS.mossBone)),
  "P1 plate reads Moss",
);
assert(
  labels.some((call) => call[1] === "P2" && (call[4] === FACET.sky || call[4] === FACET_STEPS.skyBone)),
  "P2 plate reads Sky",
);

const p1 = labels.find((call) => call[1] === "P1");
const p2 = labels.find((call) => call[1] === "P2");
assert(p1 && p2 && p1[2] < 480 && p2[2] > 480, "P1 sits in the left lane, P2 in the right");

const allowedHex = new Set([...Object.values(FACET), ...Object.values(FACET_STEPS)]);
for (const fill of fills) {
  assert(allowedHex.has(fill), `unexpected fill ${fill}`);
}

const source = readFileSync(new URL("./split.js", import.meta.url), "utf8");
for (const banned of ["quadraticCurveTo", "bezierCurveTo", "ellipse(", "arc(", "createLinearGradient", "createRadialGradient", "shadowBlur"]) {
  assert(!source.includes(banned), `split chrome must not use ${banned}`);
}

const renderer = readFileSync(new URL("./index.js", import.meta.url), "utf8");
assert(renderer.includes('from "./split.js"'), "renderer paints split chrome from the Facet module");
assert(!renderer.includes("Placeholder lane chrome"), "placeholder split stroke is gone");

console.log("render/split.test.mjs passed");
