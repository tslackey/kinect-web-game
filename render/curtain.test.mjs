import { readFileSync } from "node:fs";
import { createTransition } from "../game/transition.js";
import { FACET, FACET_STEPS, mixHex } from "../theme/facet.js";
import {
  CURTAIN_MIXES,
  drawCurtain,
  drawPlacard,
  drawStageWash,
  stageKitFor,
} from "./curtain.js";
import { drawSimpleScene } from "./simple.js";

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
    globalAlpha: 1,
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    fillRect(...args) {
      calls.push(["fillRect", ...args]);
    },
    beginPath() {
      calls.push(["beginPath"]);
    },
    moveTo(...args) {
      calls.push(["moveTo", ...args]);
    },
    lineTo(...args) {
      calls.push(["lineTo", ...args]);
    },
    closePath() {
      calls.push(["closePath"]);
    },
    fill() {
      calls.push(["fill", this.fillStyle]);
    },
    stroke() {
      calls.push(["stroke", this.strokeStyle]);
    },
    fillText(...args) {
      calls.push(["fillText", ...args]);
    },
    measureText(text) {
      calls.push(["measureText", text]);
      return { width: String(text).length * 22 };
    },
    save() {
      calls.push(["save"]);
    },
    restore() {
      calls.push(["restore"]);
    },
    translate(...args) {
      calls.push(["translate", ...args]);
    },
    scale(...args) {
      calls.push(["scale", ...args]);
    },
  };
}

const allowedHex = new Set([
  ...Object.values(FACET),
  ...Object.values(FACET_STEPS),
  ...Object.values(CURTAIN_MIXES),
  mixHex(FACET.moss, FACET.ink, 0.55),
]);

/**
 * @param {unknown[]} calls
 */
function hexFills(calls) {
  return calls
    .filter((call) => Array.isArray(call) && call[0] === "fill")
    .map((call) => call[1])
    .filter((fill) => typeof fill === "string" && fill.startsWith("#"));
}

const garden = mockCtx();
drawStageWash(garden, 800, 600, "garden");
assert(garden.calls.some((call) => call[0] === "fillRect"), "stage wash paints a Facet panel");
assert(garden.calls.filter((call) => call[0] === "fill").length > 8, "garden stage set uses many hard faces");
assert(hexFills(garden.calls).includes(FACET.moss), "garden floor uses Moss");

const crystal = mockCtx();
drawStageWash(crystal, 800, 600, "crystal");
assert(hexFills(crystal.calls).includes(FACET.lilac), "crystal stage set uses Lilac shards");

const hearth = mockCtx();
drawStageWash(hearth, 800, 600, "hearth");
assert(hexFills(hearth.calls).includes(FACET.ember), "hearth stage set uses Ember logs");

assert(stageKitFor("beam").motif === "beams", "duck stage is sky beams");
assert(stageKitFor("bar").motif === "hurdle", "jump stage is a moss hurdle");
assert(stageKitFor("pitch").motif === "goals", "kick stage is moss goals");
assert(stageKitFor("span").motif === "span", "stretch stage is sky reach arms");
assert(stageKitFor("high").motif === "high", "high-five stage is a lilac stand");
assert(stageKitFor("hello").motif === "waves", "wave stage is sky chevrons");
assert(stageKitFor("press").motif === "press", "squash stage is an ember press plate");
assert(stageKitFor("cue").motif === "hands", "clap stage is coral hands");
assert(stageKitFor("unknown").hue === "lilac", "unknown stages fall back to crystal");

const pitch = mockCtx();
drawStageWash(pitch, 800, 600, "pitch");
assert(hexFills(pitch.calls).includes(FACET.moss), "kick pitch uses Moss goals");

const hello = mockCtx();
drawStageWash(hello, 800, 600, "hello");
assert(hexFills(hello.calls).includes(FACET.sky), "wave stage uses Sky chevrons");

const ctx = mockCtx();
const curtain = createTransition();
const down = curtain.toNext({ title: "Duck beam", backgroundId: "beam" });
drawCurtain(ctx, 800, 600, { ...down, cover: 1, placard: false, phase: "covered" });
const closedFills = hexFills(ctx.calls);
assert(closedFills.includes(FACET.ember), "closed curtain is Ember cloth");
assert(closedFills.includes(FACET_STEPS.emberBone), "closed curtain has upper-left lit folds");
assert(closedFills.includes(FACET.lilac) || closedFills.includes(FACET_STEPS.lilacInk), "closed curtain shows Lilac lining");
assert(ctx.calls.filter((call) => call[0] === "fill").length > 20, "closed curtain is folded theater drapes");

const openCalls = ctx.calls.length;
drawCurtain(ctx, 800, 600, { ...down, cover: 0, placard: false, phase: "hold", title: "" });
assert(ctx.calls.length === openCalls, "fully open curtain with no title draws nothing");

const up = { ...down, cover: 0.2, placard: true, phase: "up", title: "Duck beam" };
drawCurtain(ctx, 800, 600, up);
assert(
  ctx.calls.some((call) => call[0] === "fillText" && String(call[1]).includes("DUCK")),
  "curtain up paints the big title placard",
);

const card = mockCtx();
drawPlacard(card, 800, 600, { ...up, cover: 0, phase: "hold", subtitle: "Get ready", placardScale: 1.04 }, false);
assert(
  card.calls.some((call) => call[0] === "scale"),
  "reveal can apply a modest placard scale",
);
assert(hexFills(card.calls).includes(FACET.bone), "placard has a Bone title plate");
assert(hexFills(card.calls).includes(FACET.ink), "placard frame casts a hard Ink plate");
assert(
  card.calls.some((call) => call[0] === "fillText" && call[1] === "DUCK BEAM"),
  "placard title stays uppercase and centered",
);
assert(
  card.calls.some((call) => call[0] === "fillText" && call[1] === "Get ready"),
  "placard keeps the subtitle readable",
);

drawSimpleScene(ctx, 800, 600, {
  phase: "playing",
  result: null,
  transition: null,
  scene: { kind: "duck-beam", beam: { y: 0.46 }, ducked: false },
});
assert(ctx.calls.length > 4, "simple-pack scenes draw Facet marks");

for (const fill of [...hexFills(garden.calls), ...hexFills(ctx.calls), ...hexFills(card.calls)]) {
  assert(allowedHex.has(fill), `unexpected fill ${fill}`);
}

const source = readFileSync(new URL("./curtain.js", import.meta.url), "utf8");
for (const banned of ["quadraticCurveTo", "bezierCurveTo", "ellipse(", "arc(", "createLinearGradient", "createRadialGradient", "shadowBlur"]) {
  assert(!source.includes(banned), `curtain skins must not use ${banned}`);
}

console.log("render/curtain.test.mjs passed");
