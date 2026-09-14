/**
 * 2P layouts (#96 / #97).
 *
 * Split: each body gets their own props on their side of one webcam
 * frame, independent pass/fail, and a private score. Coop: one shared
 * interaction stays in the middle; a shared win credits both scores.
 * 1P is always a single full-field instance and a single score.
 *
 * Playlist 1P/2P still chooses the mode. This module only says how a
 * live 2P game is laid out.
 */

import { posesFromSample } from "../input/poses.js";

/** Solo verbs. 2P mirrors a copy of the props into left / right lanes. */
export const LAYOUT_SPLIT = "split";
/** True shared verbs. The interaction stays in the center of the field. */
export const LAYOUT_COOP = "coop";
/** 1P, or a 2P coop game played as one instance. */
export const LAYOUT_SOLO = "solo";

/**
 * @typedef {"split" | "coop"} MicrogameLayout
 * @typedef {"split" | "coop" | "solo"} LiveLayout
 * @typedef {"playing" | "win" | "fail" | "idle"} PlayerOutcome
 * @typedef {import("../input/poses.js").PoseSample} PoseSample
 * @typedef {import("../input/poses.js").PoseMap} PoseMap
 * @typedef {import("./microgame.js").MicrogameDef} MicrogameDef
 * @typedef {import("./microgame.js").MicrogamePlay} MicrogamePlay
 * @typedef {import("./microgame.js").MicrogameCreateContext} MicrogameCreateContext
 */

/**
 * @typedef {object} Lane
 * @property {"full" | "left" | "right" | "center"} id
 * @property {"p1" | "p2" | "both"} player
 * @property {number} x0
 * @property {number} x1
 */

/**
 * @typedef {object} PlayerResults
 * @property {PlayerOutcome} p1
 * @property {PlayerOutcome} p2
 */

export const FULL_LANE = Object.freeze({ id: "full", player: "p1", x0: 0, x1: 1 });
export const LEFT_LANE = Object.freeze({ id: "left", player: "p1", x0: 0, x1: 0.5 });
export const RIGHT_LANE = Object.freeze({ id: "right", player: "p2", x0: 0.5, x1: 1 });
export const CENTER_LANE = Object.freeze({ id: "center", player: "both", x0: 0.25, x1: 0.75 });

/**
 * @param {unknown} layout
 * @returns {MicrogameLayout}
 */
export function normalizeLayout(layout) {
  return layout === LAYOUT_COOP ? LAYOUT_COOP : LAYOUT_SPLIT;
}

/**
 * Live layout for this session. 1P never splits.
 *
 * @param {unknown} layout
 * @param {"1p" | "2p" | string} playerMode
 * @returns {LiveLayout}
 */
export function liveLayoutFor(layout, playerMode) {
  if (playerMode !== "2p") return LAYOUT_SOLO;
  return normalizeLayout(layout) === LAYOUT_COOP ? LAYOUT_COOP : LAYOUT_SPLIT;
}

/**
 * Map a 0–1 design x into a lane. Full-field keeps the packed coordinates
 * used by 1P tests (0.24 / 0.76 stay 0.24 / 0.76).
 *
 * @param {Lane | null | undefined} lane
 * @param {number} x
 */
export function placeX(lane, x) {
  if (!lane || lane.id === "full") return x;
  const t = Number.isFinite(x) ? x : 0.5;
  return lane.x0 + t * (lane.x1 - lane.x0);
}

/**
 * Horizontal field used by drifting / rolling verbs. 1P keeps the packed
 * template. Split compresses that template into the lane.
 *
 * @param {Lane | null | undefined} lane
 * @param {{ x0: number, x1: number, y0: number, y1: number }} template
 */
export function fieldInLane(lane, template) {
  if (!lane || lane.id === "full") return { ...template };
  const span = lane.x1 - lane.x0;
  const width = template.x1 - template.x0;
  const inset = Math.min(0.06, span * 0.12);
  return {
    x0: lane.x0 + inset,
    x1: lane.x1 - inset,
    y0: template.y0,
    y1: template.y1,
    span,
    width,
  };
}

/**
 * @param {PoseMap | null | undefined} pose
 */
export function poseAnchorX(pose) {
  const joints = pose?.joints;
  if (!joints) return 0.5;
  if (usable(joints.nose)) return joints.nose.x;
  if (usable(joints.left_shoulder) && usable(joints.right_shoulder)) {
    return (joints.left_shoulder.x + joints.right_shoulder.x) / 2;
  }
  if (usable(joints.left_hip) && usable(joints.right_hip)) {
    return (joints.left_hip.x + joints.right_hip.x) / 2;
  }
  let sum = 0;
  let count = 0;
  for (const joint of Object.values(joints)) {
    if (!usable(joint)) continue;
    sum += joint.x;
    count += 1;
  }
  return count > 0 ? sum / count : 0.5;
}

/**
 * Leftmost body is P1 (left lane). Rightmost is P2 (right lane). A single
 * body plays the lane they are standing in.
 *
 * @param {PoseSample | { poses?: unknown, joints?: unknown, source?: string } | null | undefined} sample
 * @returns {{ p1: PoseMap | null, p2: PoseMap | null }}
 */
export function assignLanePoses(sample) {
  const poses = posesFromSample(sample);
  if (poses.length === 0) return { p1: null, p2: null };
  if (poses.length === 1) {
    const x = poseAnchorX(poses[0]);
    return x < 0.5 ? { p1: poses[0], p2: null } : { p1: null, p2: poses[0] };
  }
  const sorted = poses.slice().sort((a, b) => poseAnchorX(a) - poseAnchorX(b));
  return { p1: sorted[0] ?? null, p2: sorted[sorted.length - 1] ?? null };
}

/**
 * @param {PoseSample | { poses?: unknown, joints?: unknown, source?: string } | null | undefined} sample
 * @param {PoseMap | null | undefined} pose
 */
export function clipSampleToPose(sample, pose) {
  if (!sample) return sample;
  if (!pose) return { ...sample, poses: [] };
  return { ...sample, poses: [pose] };
}

/**
 * Two independent instances, one per side. The round stays live until every
 * body that has appeared this play has finished, or the timer runs out.
 * An empty lane does not block — 2P with one body in frame still resolves
 * when that body wins, so a missing sibling does not pad the clock.
 *
 * @param {MicrogameDef} def
 * @param {MicrogameCreateContext} ctx
 * @returns {MicrogamePlay}
 */
export function createSplitPlay(def, ctx) {
  const left = def.create({ ...ctx, playerMode: "2p", layout: LAYOUT_SPLIT, lane: LEFT_LANE });
  const right = def.create({ ...ctx, playerMode: "2p", layout: LAYOUT_SPLIT, lane: RIGHT_LANE });
  /** @type {PlayerOutcome} */
  let p1 = "playing";
  /** @type {PlayerOutcome} */
  let p2 = "playing";
  let seenP1 = false;
  let seenP2 = false;

  return {
    start() {
      p1 = "playing";
      p2 = "playing";
      seenP1 = false;
      seenP2 = false;
      left.start();
      right.start();
    },
    /**
     * @param {number} dt
     * @param {PoseSample} sample
     */
    tick(dt, sample) {
      const assigned = assignLanePoses(sample);
      if (assigned.p1) seenP1 = true;
      if (assigned.p2) seenP2 = true;
      if (p1 === "playing") {
        p1 = asPlayerOutcome(left.tick(dt, clipSampleToPose(sample, assigned.p1)));
      }
      if (p2 === "playing") {
        p2 = asPlayerOutcome(right.tick(dt, clipSampleToPose(sample, assigned.p2)));
      }
      return combineSplitOutcomes(p1, p2, seenP1, seenP2);
    },
    getView() {
      const leftView = left.getView();
      const rightView = right.getView();
      return mergeSplitViews(leftView, rightView, p1, p2, seenP1, seenP2);
    },
  };
}

/**
 * @param {PlayerOutcome} p1
 * @param {PlayerOutcome} p2
 * @param {boolean} seenP1
 * @param {boolean} seenP2
 * @returns {import("./microgame.js").MicrogameOutcome}
 */
export function combineSplitOutcomes(p1, p2, seenP1, seenP2) {
  if (!seenP1 && !seenP2) {
    if (p1 === "playing" || p2 === "playing") return "playing";
    return roundResultFor(p1, p2);
  }
  const left = seenP1 ? p1 : "idle";
  const right = seenP2 ? p2 : "idle";
  if (left === "playing" || right === "playing") return "playing";
  const wins = Number(left === "win") + Number(right === "win");
  const fails = Number(left === "fail") + Number(right === "fail");
  if (wins > 0 && fails > 0) return "split";
  if (wins > 0) return "win";
  return "fail";
}

/**
 * @param {unknown} outcome
 * @returns {PlayerOutcome}
 */
function asPlayerOutcome(outcome) {
  if (outcome === "win" || outcome === "fail") return outcome;
  return "playing";
}

/**
 * @param {import("./microgame.js").MicrogameView} leftView
 * @param {import("./microgame.js").MicrogameView} rightView
 * @param {PlayerOutcome} p1
 * @param {PlayerOutcome} p2
 * @param {boolean} seenP1
 * @param {boolean} seenP2
 */
function mergeSplitViews(leftView, rightView, p1, p2, seenP1, seenP2) {
  const leftScene = leftView.scene ?? { kind: "orb-hit", target: leftView.target };
  const rightScene = rightView.scene ?? { kind: "orb-hit", target: rightView.target };
  const kind = leftScene.kind ?? rightScene.kind ?? "orb-hit";
  const timeLeft = remainingTime(p1, leftView.timeLeft, p2, rightView.timeLeft);
  const target =
    (p1 === "playing" ? leftView.target : null) ??
    (p2 === "playing" ? rightView.target : null) ??
    leftView.target ??
    rightView.target ??
    null;

  return {
    target,
    timeLeft,
    lifetime: leftView.lifetime ?? rightView.lifetime,
    driftScale: leftView.driftScale ?? rightView.driftScale,
    layout: LAYOUT_SPLIT,
    playerResults: {
      p1: seenP1 ? p1 : "idle",
      p2: seenP2 ? p2 : "idle",
    },
    scene: {
      ...leftScene,
      kind,
      layout: LAYOUT_SPLIT,
      lanes: [
        { player: "p1", result: p1, seen: seenP1, target: leftView.target, ...leftScene },
        { player: "p2", result: p2, seen: seenP2, target: rightView.target, ...rightScene },
      ],
    },
  };
}

/**
 * @param {PlayerOutcome} p1
 * @param {number | null | undefined} t1
 * @param {PlayerOutcome} p2
 * @param {number | null | undefined} t2
 */
function remainingTime(p1, t1, p2, t2) {
  const a = p1 === "playing" && t1 != null ? t1 : null;
  const b = p2 === "playing" && t2 != null ? t2 : null;
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

/**
 * Round result from two finished player outcomes.
 *
 * @param {PlayerOutcome} p1
 * @param {PlayerOutcome} p2
 * @returns {"win" | "fail" | "split"}
 */
export function roundResultFor(p1, p2) {
  const left = p1 === "win" || p1 === "fail" ? p1 : "idle";
  const right = p2 === "win" || p2 === "fail" ? p2 : "idle";
  const wins = Number(left === "win") + Number(right === "win");
  const fails = Number(left === "fail") + Number(right === "fail");
  if (wins > 0 && fails > 0) return "split";
  if (wins > 0) return "win";
  return "fail";
}

/**
 * @param {JointLike | null | undefined} joint
 */
function usable(joint) {
  return Boolean(joint && Number.isFinite(joint.x) && Number.isFinite(joint.y));
}

/**
 * @typedef {{ x: number, y: number }} JointLike
 */
