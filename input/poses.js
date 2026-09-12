/**
 * Pose sample contract: up to two independent pose maps.
 * A webcam slot is one person. Pointers and keyboard fill missing cameras.
 * Never flatten two bodies into one joint dict.
 */

import { clamp01 } from "./joints.js";

export const MAX_POSES = 2;
export const POSE_IDS = ["p1", "p2"];

const IDLE_SOURCE = "idle";
const MOUSE_SOURCE = "mouse";
const KEYBOARD_SOURCE = "keyboard";
const WEBCAM_SOURCE = "webcam";
const MIXED_SOURCE = "mixed";

/**
 * @typedef {import("./index.js").Joint} Joint
 */

/**
 * @typedef {object} PoseMap
 * @property {string} id
 * @property {"idle" | "mouse" | "keyboard" | "webcam"} source
 * @property {Record<string, Joint>} joints
 */

/**
 * @typedef {object} PoseSample
 * @property {"idle" | "mouse" | "keyboard" | "webcam" | "mixed"} source
 * @property {PoseMap[]} poses
 * @property {number} timestamp
 */

/**
 * Normalize any sample into pose maps. New samples carry `poses`.
 * A leftover `{ joints }` object is treated as a single solo pose.
 *
 * @param {{ poses?: PoseMap[] | null, joints?: Record<string, Joint>, source?: string } | null | undefined} sample
 * @returns {PoseMap[]}
 */
export function posesFromSample(sample) {
  if (!sample) return [];
  if (Array.isArray(sample.poses)) {
    return sample.poses.filter((pose) => pose && pose.joints && typeof pose.joints === "object");
  }
  if (sample.joints && typeof sample.joints === "object") {
    return [{ id: POSE_IDS[0], source: sample.source ?? IDLE_SOURCE, joints: sample.joints }];
  }
  return [];
}

/**
 * Build a PoseSample from webcam slots plus pointer / keyboard stand-ins.
 * Webcam index 0 is player 1, index 1 is player 2. Empty slots fill from
 * extra pointers, then the keyboard. Caps at two maps.
 *
 * @param {{
 *   webcamPoses?: (Record<string, Joint> | null | undefined)[],
 *   pointers?: Joint[],
 *   keys?: Joint | null,
 *   timestamp?: number,
 * }} [input]
 * @returns {PoseSample}
 */
export function assembleSample({
  webcamPoses = [],
  pointers = [],
  keys = null,
  timestamp = 0,
} = {}) {
  /** @type {(PoseMap | null)[]} */
  const slots = [null, null];

  for (let i = 0; i < MAX_POSES; i += 1) {
    const joints = webcamPoses[i];
    if (joints && Object.keys(joints).length > 0) {
      slots[i] = { id: POSE_IDS[i], source: WEBCAM_SOURCE, joints };
    }
  }

  const standins = [];
  for (const pointer of pointers) {
    if (usable(pointer)) standins.push({ source: MOUSE_SOURCE, joint: pointer });
  }
  if (usable(keys)) {
    standins.push({ source: KEYBOARD_SOURCE, joint: keys });
  }

  let standinIndex = 0;
  for (let i = 0; i < MAX_POSES; i += 1) {
    if (slots[i] || standinIndex >= standins.length) continue;
    const standin = standins[standinIndex];
    standinIndex += 1;
    slots[i] = {
      id: POSE_IDS[i],
      source: standin.source,
      joints: pointerToPose(standin.joint, { side: i }),
    };
  }

  const poses = slots.filter((pose) => pose !== null);
  return {
    source: sampleSource(poses),
    poses,
    timestamp,
  };
}

/**
 * Turn a pointer or key stand-in into a readable stick figure.
 * The contact point is both `pointer` and `right_wrist` so the existing
 * verb still scores.
 *
 * @param {Joint} pointer
 * @param {{ side?: number }} [options]
 * @returns {Record<string, Joint>}
 */
export function pointerToPose(pointer, { side = 0 } = {}) {
  const x = clamp01(pointer.x);
  const y = clamp01(pointer.y);
  const facing = side === 1 ? 1 : -1;
  const spineX = clamp01(x + facing * 0.1);
  const shoulderY = clamp01(y - 0.14);
  const noseY = clamp01(shoulderY - 0.09);
  const hipY = clamp01(y + 0.18);
  const kneeY = clamp01(hipY + 0.12);
  const ankleY = clamp01(hipY + 0.22);
  const confidence = Number.isFinite(pointer.confidence) ? pointer.confidence : 1;

  const joint = (jx, jy) => ({ x: clamp01(jx), y: clamp01(jy), confidence });

  return {
    nose: joint(spineX, noseY),
    left_shoulder: joint(spineX - 0.055, shoulderY),
    right_shoulder: joint(spineX + 0.055, shoulderY),
    left_elbow: joint(spineX - 0.09, shoulderY + 0.09),
    right_elbow: joint((spineX + 0.055 + x) / 2, (shoulderY + y) / 2),
    left_wrist: joint(spineX - 0.08, shoulderY + 0.16),
    right_wrist: joint(x, y),
    left_hip: joint(spineX - 0.035, hipY),
    right_hip: joint(spineX + 0.035, hipY),
    left_knee: joint(spineX - 0.04, kneeY),
    right_knee: joint(spineX + 0.04, kneeY),
    left_ankle: joint(spineX - 0.045, ankleY),
    right_ankle: joint(spineX + 0.045, ankleY),
    pointer: joint(x, y),
  };
}

/**
 * Second webcam is a different deviceId from the first stream, not a
 * second pose guessed from one picture.
 *
 * @param {Array<{ kind?: string, deviceId?: string }> | null | undefined} devices
 * @param {string | null | undefined} firstDeviceId
 * @returns {string | null}
 */
export function pickSecondDeviceId(devices, firstDeviceId) {
  if (!Array.isArray(devices)) return null;
  const videos = devices.filter((device) => device?.kind === "videoinput" && device.deviceId);
  if (firstDeviceId) {
    return videos.find((device) => device.deviceId !== firstDeviceId)?.deviceId ?? null;
  }
  return videos[1]?.deviceId ?? null;
}

/**
 * @param {PoseMap[]} poses
 */
function sampleSource(poses) {
  if (poses.length === 0) return IDLE_SOURCE;
  const sources = new Set(poses.map((pose) => pose.source));
  if (sources.size === 1) return poses[0].source;
  return MIXED_SOURCE;
}

/**
 * @param {Joint | null | undefined} joint
 */
function usable(joint) {
  return Boolean(joint && Number.isFinite(joint.x) && Number.isFinite(joint.y));
}
