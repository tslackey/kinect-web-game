import { createTransition } from "../game/transition.js";
import { drawCurtain, drawPlacard, drawStageWash } from "./curtain.js";
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
  };
}

const ctx = mockCtx();
drawStageWash(ctx, 800, 600, "garden");
assert(ctx.calls.some((call) => call[0] === "fillRect"), "stage wash paints a Facet panel");

const curtain = createTransition();
const down = curtain.toNext({ title: "Duck beam", backgroundId: "beam" });
drawCurtain(ctx, 800, 600, { ...down, cover: 1, placard: false, phase: "covered" });
assert(ctx.calls.some((call) => call[0] === "fill"), "closed curtain draws Facet panels");

const up = { ...down, cover: 0.2, placard: true, phase: "up", title: "Duck beam" };
drawCurtain(ctx, 800, 600, up);
assert(
  ctx.calls.some((call) => call[0] === "fillText" && String(call[1]).includes("DUCK")),
  "curtain up paints the big title placard",
);

drawPlacard(ctx, 800, 600, { ...up, cover: 0, phase: "hold" }, false);

drawSimpleScene(ctx, 800, 600, {
  phase: "playing",
  result: null,
  transition: null,
  scene: { kind: "duck-beam", beam: { y: 0.46 }, ducked: false },
});
assert(ctx.calls.length > 4, "placeholder scenes draw something readable");

console.log("render/curtain.test.mjs passed");
