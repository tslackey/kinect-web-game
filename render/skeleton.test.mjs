import { readFileSync } from "node:fs";
import { pointerToPose } from "../input/poses.js";
import { FACET, FACET_RGB, FACET_STEPS } from "../theme/facet.js";
import { facetShade } from "./facet.js";
import {
  STRIKER_HALO,
  STRIKER_RADIUS,
  discFaces,
  drawSkeleton,
  faceFaces,
  headFaces,
  limbFaces,
  playerAccent,
  playerHue,
  skeletonMood,
  torsoFaces,
} from "./skeleton.js";

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

assert(skeletonMood({ phase: "start" }) === "idle", "start is idle");
assert(skeletonMood({ phase: "prompt" }) === "idle", "prompt is idle");
assert(skeletonMood({ phase: "playing" }) === "effort", "play is effort");
assert(skeletonMood({ phase: "result", result: "win" }) === "win", "win beat is win");
assert(skeletonMood({ phase: "result", result: "fail" }) === "fail", "fail beat is fail");
assert(skeletonMood({ phase: "over" }) === "fail", "game-over is fail");
assert(
  skeletonMood({ phase: "result", result: "split", playerResults: { p1: "win", p2: "fail" } }, "p1") === "win",
  "split P1 win face",
);
assert(
  skeletonMood({ phase: "result", result: "split", playerResults: { p1: "win", p2: "fail" } }, "p2") === "fail",
  "split P2 miss face",
);
assert(playerHue(0) === "moss", "P1 is Moss");
assert(playerHue(1) === "sky", "P2 is Sky");
assert(playerAccent("moss") === FACET.ember, "P1 brow accent is Ember");
assert(playerAccent("sky") === FACET.lilac, "P2 brow accent is Lilac");

const moss = facetShade("moss");
const sky = facetShade("sky");

const builders = [
  ["idle head", headFaces(moss, "idle")],
  ["win head", headFaces(moss, "win")],
  ["fail head", headFaces(moss, "fail")],
  ["effort head", headFaces(moss, "effort")],
  ["idle face", faceFaces("idle", FACET.ember)],
  ["win face", faceFaces("win", FACET.ember)],
  ["fail face", faceFaces("fail", FACET.ember)],
  ["effort face", faceFaces("effort", FACET.ember)],
  ["p2 face", faceFaces("idle", FACET.lilac)],
  ["torso", torsoFaces([20, 20], [80, 22], [28, 90], [74, 92], moss)],
  ["limb", limbFaces(10, 10, 40, 50, 12, 4, moss)],
];

for (const [name, faces] of builders) {
  assert(faces.length >= 2, `${name} has several hard faces`);
  assert(
    faces.every((face) => face.pts.length === 3),
    `${name} faces are triangles`,
  );
}

const idleHead = headFaces(moss, "idle");
const idleFace = faceFaces("idle", FACET.ember);
const winFace = faceFaces("win", FACET.ember);
const failFace = faceFaces("fail", FACET.ember);
const effortFace = faceFaces("effort", FACET.ember);
const p2Face = faceFaces("idle", FACET.lilac);

assert(
  idleFace.some((face) => face.fill === FACET.bone) && idleFace.some((face) => face.fill === FACET.ink),
  "idle face has Bone whites and Ink pupils",
);
assert(
  winFace.some((face) => face.fill === FACET.ember) && !winFace.some((face) => face.fill === FACET.coral),
  "win keeps Ember brows, no Coral",
);
assert(
  failFace.some((face) => face.fill === FACET.coral),
  "fail expression uses Coral",
);
assert(
  effortFace.some((face) => face.fill === FACET.ink) && effortFace.some((face) => face.fill === FACET.ember),
  "effort has a grit mouth and Ember brows",
);
assert(
  p2Face.some((face) => face.fill === FACET.lilac) && !p2Face.some((face) => face.fill === FACET.ember),
  "P2 face uses Lilac, not Ember",
);

const disc = discFaces(0, 0, 4, 4, FACET.bone, 8);
assert(disc.length === 8 && disc.every((face) => face.pts.length === 3), "discFaces is a triangle fan");

/**
 * @param {import("./facet.js").Face[]} faces
 * @param {number} [cx]
 * @param {number} [cy]
 */
function outerRadii(faces, cx = 0, cy = 0) {
  return faces.flatMap((face) =>
    face.pts.map(([x, y]) => Math.hypot(x - cx, y - cy)).filter((r) => r > 2),
  );
}

const headWedges = idleHead.filter((face) => face.pts.some(([x, y]) => Math.hypot(x, y - 0.4) < 0.2));
const headRadii = outerRadii(headWedges, 0, 0.4);
const headMin = Math.min(...headRadii);
const headMax = Math.max(...headRadii);
assert(headWedges.length >= 8, "head is a faceted disc, not a diamond");
assert(headMax / headMin < 1.25, "head silhouette is circular");

const leftEyeWhite = idleFace.filter(
  (face) => face.fill === FACET.bone && face.pts.some(([x, y]) => Math.hypot(x + 6.6, y + 5.6) < 0.2),
);
const leftEyeRadii = outerRadii(leftEyeWhite, -6.6, -5.6);
assert(leftEyeWhite.length >= 6, "eyes are faceted discs, not diamonds");
assert(Math.max(...leftEyeRadii) / Math.min(...leftEyeRadii) < 1.2, "idle eyes are circular");

const idlePupils = idleFace.filter(
  (face) => face.fill === FACET.ink && face.pts.every(([, y]) => y < 2),
);
const pupilXs = idlePupils.flatMap((face) => face.pts.map(([x]) => x));
const pupilYs = idlePupils.flatMap((face) => face.pts.map(([, y]) => y));
assert(Math.max(...pupilXs) - Math.min(...pupilXs) > 4, "pupils are bigger discs");
assert(Math.max(...pupilYs) - Math.min(...pupilYs) > 3.5, "pupils are round, not a tiny triangle");

const winMouth = winFace.filter((face) => face.fill === FACET.bone && face.pts.every(([, y]) => y > 2.8));
const failMouth = failFace.filter((face) => face.fill === FACET.coral && face.pts.every(([, y]) => y > 3));
assert(winMouth.length >= 6, "win mouth is a round Bone laugh");
assert(failMouth.length >= 3, "fail mouth is a round Coral frown");
assert(
  Math.max(...winMouth.flatMap((face) => face.pts.map(([, y]) => y))) >
    Math.min(...failMouth.flatMap((face) => face.pts.map(([, y]) => y))),
  "win mouth drops, fail mouth lifts",
);

const limb = limbFaces(0, 0, 40, 0, 10, 3, moss);
const xs = limb.flatMap((face) => face.pts.map(([x]) => x));
assert(Math.max(...xs) - Math.min(...xs) > 30, "limb follows the bone");
const atStart = limb.flatMap((face) => face.pts.filter(([x]) => x < 8).map(([, y]) => y));
const atEnd = limb.flatMap((face) => face.pts.filter(([x]) => x > 32).map(([, y]) => y));
assert(Math.max(...atStart) - Math.min(...atStart) > Math.max(...atEnd) - Math.min(...atEnd), "limb tapers toward the striker");

/**
 * @param {number} [dx]
 */
function figure(dx = 0) {
  return {
    nose: { x: 0.32 + dx, y: 0.22, confidence: 1 },
    left_eye: { x: 0.3 + dx, y: 0.2, confidence: 1 },
    right_eye: { x: 0.34 + dx, y: 0.2, confidence: 1 },
    left_shoulder: { x: 0.27 + dx, y: 0.32, confidence: 1 },
    right_shoulder: { x: 0.37 + dx, y: 0.32, confidence: 1 },
    left_elbow: { x: 0.22 + dx, y: 0.42, confidence: 1 },
    right_elbow: { x: 0.42 + dx, y: 0.42, confidence: 1 },
    left_wrist: { x: 0.18 + dx, y: 0.52, confidence: 1 },
    right_wrist: { x: 0.46 + dx, y: 0.52, confidence: 1 },
    left_hip: { x: 0.28 + dx, y: 0.55, confidence: 1 },
    right_hip: { x: 0.36 + dx, y: 0.55, confidence: 1 },
    left_knee: { x: 0.27 + dx, y: 0.7, confidence: 1 },
    right_knee: { x: 0.37 + dx, y: 0.7, confidence: 1 },
    left_ankle: { x: 0.26 + dx, y: 0.84, confidence: 1 },
    right_ankle: { x: 0.38 + dx, y: 0.84, confidence: 1 },
  };
}

const p1 = mockCtx();
drawSkeleton(p1, 800, 600, figure(0), { playerIndex: 0, label: "p1", mood: "idle" });
const p2 = mockCtx();
drawSkeleton(p2, 800, 600, figure(0.28), { playerIndex: 1, label: "p2", mood: "win" });
const failDraw = mockCtx();
drawSkeleton(failDraw, 800, 600, figure(0), { playerIndex: 0, label: "p1", mood: "fail" });
const foot = mockCtx();
drawSkeleton(foot, 800, 600, figure(0), { playerIndex: 0, label: "p1", footGame: true, mood: "effort" });

const p1Fills = p1.calls.filter((call) => Array.isArray(call) && call[0] === "fill").map((call) => call[1]);
const p2Fills = p2.calls.filter((call) => Array.isArray(call) && call[0] === "fill").map((call) => call[1]);
const failFills = failDraw.calls.filter((call) => Array.isArray(call) && call[0] === "fill").map((call) => call[1]);
const footFills = foot.calls.filter((call) => Array.isArray(call) && call[0] === "fill").map((call) => call[1]);

assert(p1Fills.length > 20, "a full body paints many hard faces");
assert(
  p1Fills.some((fill) => fill === FACET.moss || fill === FACET_STEPS.mossBone || fill === FACET_STEPS.mossInk),
  "P1 skin uses Moss steps",
);
assert(
  p2Fills.some((fill) => fill === FACET.sky || fill === FACET_STEPS.skyBone || fill === FACET_STEPS.skyInk),
  "P2 skin uses Sky steps",
);
assert(!p1Fills.some((fill) => fill === FACET.sky), "P1 idle skin is not Sky");
assert(!p2Fills.some((fill) => fill === FACET.moss), "P2 skin is not Moss");
assert(
  p1Fills.some((fill) => fill === FACET.bone) && p1Fills.some((fill) => fill === FACET.ink),
  "eyes are Bone + Ink",
);
assert(failFills.some((fill) => fill === FACET.coral), "fail draw uses Coral on the face");
assert(!p1Fills.some((fill) => fill === FACET.coral), "idle P1 is not Coral");

const mossRgb = `rgb(${FACET_RGB.moss})`;
const skyRgb = `rgb(${FACET_RGB.sky})`;
assert(p1Fills.includes(mossRgb), "P1 strikers stay Moss");
assert(p2Fills.includes(skyRgb), "P2 strikers stay Sky");

const lastMoss = p1Fills.lastIndexOf(mossRgb);
assert(lastMoss > 8, "striker diamonds paint after the skin");
assert(p1Fills.slice(0, lastMoss).some((fill) => fill === FACET.moss || fill === FACET_STEPS.mossBone), "skin precedes strikers");

const wristX = 0.18 * 800;
const wristY = 0.52 * 600;
const wristCore = p1.calls.filter(
  (call) => Array.isArray(call) && call[0] === "moveTo" && Math.abs(call[1] - wristX) < 0.01 && Math.abs(call[2] - (wristY - STRIKER_RADIUS)) < 0.01,
);
const wristHalo = p1.calls.filter(
  (call) => Array.isArray(call) && call[0] === "moveTo" && Math.abs(call[1] - wristX) < 0.01 && Math.abs(call[2] - (wristY - STRIKER_HALO)) < 0.01,
);
const wristInk = p1.calls.filter(
  (call) => Array.isArray(call) && call[0] === "moveTo" && Math.abs(call[1] - wristX) < 0.01 && Math.abs(call[2] - (wristY - 2.4)) < 0.01,
);
assert(wristHalo.length >= 1, "wrist striker has a Bone halo");
assert(wristCore.length >= 1, "wrist striker keeps a player-color core");
assert(wristInk.length >= 1, "wrist striker has an Ink center");
assert(STRIKER_RADIUS === 7, "striker core matches the old stick-figure radius");
assert(STRIKER_HALO > STRIKER_RADIUS, "halo sits outside the core");

const ankleX = 0.26 * 800;
const ankleY = 0.84 * 600;
const idleAnkle = p1.calls.filter(
  (call) => Array.isArray(call) && call[0] === "moveTo" && Math.abs(call[1] - ankleX) < 0.01 && Math.abs(call[2] - (ankleY - STRIKER_RADIUS)) < 0.01,
);
const footAnkle = foot.calls.filter(
  (call) => Array.isArray(call) && call[0] === "moveTo" && Math.abs(call[1] - ankleX) < 0.01 && Math.abs(call[2] - (ankleY - STRIKER_RADIUS)) < 0.01,
);
assert(idleAnkle.length === 0, "ankles are not strikers on wrist games");
assert(footAnkle.length >= 1, "ankles stay readable strikers on foot games");
assert(footFills.filter((fill) => fill === mossRgb).length >= 4, "foot games mark both wrists and both ankles");

assert(
  p1.calls.some((call) => Array.isArray(call) && call[0] === "fillText" && call[1] === "P1"),
  "P1 label stays",
);
assert(
  p2.calls.some((call) => Array.isArray(call) && call[0] === "fillText" && call[1] === "P2" && call[4] === skyRgb),
  "P2 label is Sky",
);

const standin = mockCtx();
drawSkeleton(standin, 800, 600, pointerToPose({ x: 0.72, y: 0.4, confidence: 1 }), {
  playerIndex: 0,
  label: "p1",
  mood: "idle",
  simple: true,
});
const standinFills = standin.calls.filter((call) => Array.isArray(call) && call[0] === "fill").map((call) => call[1]);
assert(standinFills.some((fill) => fill === FACET.bone), "pointer stand-in still gets a face");
assert(standinFills.includes(mossRgb), "pointer stand-in keeps a Moss wrist striker");

const allowedHex = new Set([...Object.values(FACET), ...Object.values(FACET_STEPS)]);
for (const fill of [...p1Fills, ...p2Fills, ...failFills, ...footFills, ...standinFills]) {
  if (typeof fill === "string" && fill.startsWith("#")) {
    assert(allowedHex.has(fill), `unexpected fill ${fill}`);
  }
}

const source = readFileSync(new URL("./skeleton.js", import.meta.url), "utf8");
for (const banned of ["quadraticCurveTo", "bezierCurveTo", "ellipse(", "arc(", "createLinearGradient", "createRadialGradient"]) {
  assert(!source.includes(banned), `skeleton must not use ${banned}`);
}

console.log("render/skeleton.test.mjs passed");
