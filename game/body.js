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
