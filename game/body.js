/**
 * Pose helpers for simple microgames. Every pose map on the sample can
 * score — one webcam, up to two bodies. Pointer / keyboard fill in
 * when the camera is off.
 */

import { posesFromSample } from "../input/poses.js";

/**
 * @typedef {import("../input/index.js").Joint} Joint
 * @typedef {import("../input/poses.js").PoseSample} PoseSample
 * @typedef {import("../input/poses.js").PoseMap} PoseMap
 */

/**
 * @param {Joint | null | undefined} joint
 */
export function usableJoint(joint) {
  return Boolean(joint && Number.isFinite(joint.x) && Number.isFinite(joint.y) && (joint.confidence ?? 1) >= 0.4);
}

/**
 * @param {PoseMap} pose
 * @param {string} name
 * @returns {Joint | null}
 */
export function jointOf(pose, name) {
  const joint = pose.joints?.[name];
  return usableJoint(joint) ? joint : null;
}

/**
 * @param {PoseSample | null | undefined} sample
 * @param {(pose: PoseMap) => boolean} fn
 */
export function somePose(sample, fn) {
  return posesFromSample(sample).some((pose) => fn(pose));
}

/**
 * Lowest on-screen y (largest y) among named joints — "below" a beam.
 *
 * @param {PoseMap} pose
 * @param {readonly string[]} names
 */
export function lowestY(pose, names) {
  let best = null;
  for (const name of names) {
    const joint = jointOf(pose, name);
    if (joint && (best == null || joint.y > best)) best = joint.y;
  }
  return best;
}

/**
 * Highest on-screen y (smallest y) among named joints — "above" a bar.
 *
 * @param {PoseMap} pose
 * @param {readonly string[]} names
 */
export function highestY(pose, names) {
  let best = null;
  for (const name of names) {
    const joint = jointOf(pose, name);
    if (joint && (best == null || joint.y < best)) best = joint.y;
  }
  return best;
}

/**
 * @param {PoseMap} pose
 * @param {string} a
 * @param {string} b
 */
export function pairDistance(pose, a, b) {
  const left = jointOf(pose, a);
  const right = jointOf(pose, b);
  if (!left || !right) return null;
  return Math.hypot(left.x - right.x, left.y - right.y);
}

/**
 * Midpoint of two named joints, or null if either is missing.
 *
 * @param {PoseMap} pose
 * @param {string} a
 * @param {string} b
 */
export function midpoint(pose, a, b) {
  const left = jointOf(pose, a);
  const right = jointOf(pose, b);
  if (!left || !right) return null;
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

/**
 * Torso x: shoulder mid, else hip mid, else nose, else pointer.
 *
 * @param {PoseMap} pose
 */
export function torsoX(pose) {
  const shoulders = midpoint(pose, "left_shoulder", "right_shoulder");
  if (shoulders) return shoulders.x;
  const hips = midpoint(pose, "left_hip", "right_hip");
  if (hips) return hips.x;
  const nose = jointOf(pose, "nose");
  if (nose) return nose.x;
  const pointer = jointOf(pose, "pointer");
  return pointer ? pointer.x : null;
}

/**
 * Head reference for "above the head" verbs.
 *
 * @param {PoseMap} pose
 */
export function headY(pose) {
  const nose = jointOf(pose, "nose");
  if (nose) return nose.y;
  const shoulders = midpoint(pose, "left_shoulder", "right_shoulder");
  if (shoulders) return shoulders.y - 0.08;
  return 0.22;
}

/**
 * Face / ear landmark. Pointer stand-in uses a packed high-center.
 *
 * @param {PoseMap} pose
 */
export function headPoint(pose) {
  const nose = jointOf(pose, "nose");
  if (nose) return { x: nose.x, y: nose.y };
  const shoulders = midpoint(pose, "left_shoulder", "right_shoulder");
  if (shoulders) return { x: shoulders.x, y: shoulders.y - 0.08 };
  const pointer = jointOf(pose, "pointer");
  if (pointer) return { x: pointer.x, y: pointer.y };
  return { x: 0.5, y: 0.22 };
}

/**
 * Forward fold: nose drops toward the hips. Pointer: move down.
 *
 * @param {PoseMap} pose
 * @param {number} [drop]
 */
export function torsoFolded(pose, drop = 0.16) {
  const pointer = jointOf(pose, "pointer");
  const hasBody = jointOf(pose, "nose") || jointOf(pose, "left_hip") || jointOf(pose, "right_hip");
  if (pointer && !hasBody) return pointer.y >= 0.62;
  const nose = jointOf(pose, "nose") ?? midpoint(pose, "left_shoulder", "right_shoulder");
  const hips = midpoint(pose, "left_hip", "right_hip");
  if (!nose) return false;
  if (hips) return nose.y >= hips.y - 0.06;
  return nose.y >= 0.22 + drop;
}

/**
 * Travel of named joints since the last snapshot. Mutates `last`.
 *
 * @param {PoseMap} pose
 * @param {readonly string[]} names
 * @param {Map<string, { x: number, y: number }>} last
 */
export function poseTravel(pose, names, last) {
  let travel = 0;
  for (const name of names) {
    const joint = jointOf(pose, name);
    if (!joint) continue;
    const key = `${pose.id}:${name}`;
    const prev = last.get(key);
    if (prev) travel += Math.hypot(joint.x - prev.x, joint.y - prev.y);
    last.set(key, { x: joint.x, y: joint.y });
  }
  return travel;
}

/**
 * Both wrists near a head landmark (ears or eyes). Pointer counts as both.
 *
 * @param {PoseMap} pose
 * @param {{ dx?: number, dy?: number, radius?: number }} [look]
 */
export function bothHandsAtHead(pose, { dx = 0.08, dy = 0, radius = 0.16 } = {}) {
  const pointer = jointOf(pose, "pointer");
  const left = jointOf(pose, "left_wrist");
  const right = jointOf(pose, "right_wrist");
  const head = headPoint(pose);
  if (pointer && !left && !right) {
    return Math.hypot(pointer.x - head.x, pointer.y - head.y) <= radius + 0.04;
  }
  if (!left || !right) return false;
  const earL = { x: head.x - dx, y: head.y + dy };
  const earR = { x: head.x + dx, y: head.y + dy };
  return Math.hypot(left.x - earL.x, left.y - earL.y) <= radius && Math.hypot(right.x - earR.x, right.y - earR.y) <= radius;
}
