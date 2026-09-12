/**
 * Shared strike helpers. Later microgames reuse the same wrists / pointer.
 * Every pose map on the sample can score — one webcam, up to two bodies.
 */

import { posesFromSample } from "../input/poses.js";

/**
 * @typedef {import("../input/index.js").Joint} Joint
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 */

export const HIT_RADIUS = 0.13;
export const STRIKER_NAMES = ["left_wrist", "right_wrist", "pointer"];

/**
 * @param {Record<string, Joint> | undefined} joints
 * @returns {Joint[]}
 */
export function listStrikers(joints) {
  if (!joints) return [];
  /** @type {Joint[]} */
  const strikers = [];
  for (const name of STRIKER_NAMES) {
    const joint = joints[name];
    if (usable(joint) && (joint.confidence ?? 1) >= 0.4) {
      strikers.push(joint);
    }
  }
  return strikers;
}

/**
 * Hands from every pose map on the sample.
 *
 * @param {PoseSample | null | undefined} sample
 * @returns {Joint[]}
 */
export function listSampleStrikers(sample) {
  return posesFromSample(sample).flatMap((pose) => listStrikers(pose.joints));
}

/**
 * @param {Joint[]} strikers
 * @param {{ x: number, y: number }} target
 */
export function hitsTarget(strikers, target) {
  return strikers.some((joint) => Math.hypot(joint.x - target.x, joint.y - target.y) <= HIT_RADIUS);
}

/**
 * @param {Joint | null | undefined} joint
 */
function usable(joint) {
  return Boolean(joint && Number.isFinite(joint.x) && Number.isFinite(joint.y));
}
