/**
 * Shared strike helpers. Wrist games reuse wrists / pointer.
 * The feet verb passes its own names — ankles stay off the global list.
 * Every pose map on the sample can score — one webcam, up to two bodies.
 */

import { posesFromSample } from "../input/poses.js";

/**
 * @typedef {import("../input/index.js").Joint} Joint
 * @typedef {import("../input/index.js").PoseSample} PoseSample
 */

export const HIT_RADIUS = 0.13;
export const STRIKER_NAMES = ["left_wrist", "right_wrist", "pointer"];
/** Ankles plus the pointer/keyboard foot stand-in. Used by stomp and kick. */
export const FOOT_STRIKER_NAMES = ["left_ankle", "right_ankle", "pointer"];

/**
 * @param {Record<string, Joint> | undefined} joints
 * @param {readonly string[]} [names]
 * @returns {Joint[]}
 */
export function listStrikers(joints, names = STRIKER_NAMES) {
  if (!joints) return [];
  /** @type {Joint[]} */
  const strikers = [];
  for (const name of names) {
    const joint = joints[name];
    if (usable(joint) && (joint.confidence ?? 1) >= 0.4) {
      strikers.push(joint);
    }
  }
  return strikers;
}

/**
 * Hands (or named strikers) from every pose map on the sample.
 *
 * @param {PoseSample | null | undefined} sample
 * @param {readonly string[]} [names]
 * @returns {Joint[]}
 */
export function listSampleStrikers(sample, names = STRIKER_NAMES) {
  return posesFromSample(sample).flatMap((pose) => listStrikers(pose.joints, names));
}

/**
 * Same strikers, tagged so a sticky carry can follow one hand.
 * Either body in the sample can pick / pour. Pass foot names for ankles.
 *
 * @typedef {object} IdentifiedStriker
 * @property {string} id
 * @property {string} poseId
 * @property {string} name
 * @property {number} x
 * @property {number} y
 * @property {number} confidence
 */

/**
 * @param {PoseSample | null | undefined} sample
 * @param {readonly string[]} [names]
 * @returns {IdentifiedStriker[]}
 */
export function listIdentifiedStrikers(sample, names = STRIKER_NAMES) {
  /** @type {IdentifiedStriker[]} */
  const strikers = [];
  for (const pose of posesFromSample(sample)) {
    for (const name of names) {
      const joint = pose.joints[name];
      if (usable(joint) && (joint.confidence ?? 1) >= 0.4) {
        strikers.push({
          id: `${pose.id}:${name}`,
          poseId: pose.id,
          name,
          x: joint.x,
          y: joint.y,
          confidence: joint.confidence ?? 1,
        });
      }
    }
  }
  return strikers;
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
