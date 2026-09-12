/**
 * Map Kinectron body frames (Azure Kinect or Kinect v2) onto the same
 * joint dictionary the webcam adapter emits.
 */

import { clamp01 } from "./joints.js";

/** Azure Kinect body-tracking indices → MediaPipe-style names. */
export const AZURE_INDEX_TO_NAME = {
  5: "left_shoulder",
  6: "left_elbow",
  7: "left_wrist",
  9: "left_index",
  10: "left_thumb",
  12: "right_shoulder",
  13: "right_elbow",
  14: "right_wrist",
  16: "right_index",
  17: "right_thumb",
  18: "left_hip",
  19: "left_knee",
  20: "left_ankle",
  21: "left_foot_index",
  22: "right_hip",
  23: "right_knee",
  24: "right_ankle",
  25: "right_foot_index",
  26: "nose",
  27: "nose",
  28: "left_eye",
  29: "left_ear",
  30: "right_eye",
  31: "right_ear",
};

/** Kinect v2 / Kinectron 0 indices → MediaPipe-style names. */
export const V2_INDEX_TO_NAME = {
  3: "nose",
  4: "left_shoulder",
  5: "left_elbow",
  6: "left_wrist",
  7: "left_wrist",
  8: "right_shoulder",
  9: "right_elbow",
  10: "right_wrist",
  11: "right_wrist",
  12: "left_hip",
  13: "left_knee",
  14: "left_ankle",
  15: "left_foot_index",
  16: "right_hip",
  17: "right_knee",
  18: "right_ankle",
  19: "right_foot_index",
  21: "left_index",
  22: "left_thumb",
  23: "right_index",
  24: "right_thumb",
};

const NAME_ALIASES = {
  nose: "nose",
  head: "nose",
  eye_left: "left_eye",
  eyeleft: "left_eye",
  left_eye: "left_eye",
  eye_right: "right_eye",
  eyeright: "right_eye",
  right_eye: "right_eye",
  ear_left: "left_ear",
  earleft: "left_ear",
  left_ear: "left_ear",
  ear_right: "right_ear",
  earright: "right_ear",
  right_ear: "right_ear",
  shoulder_left: "left_shoulder",
  shoulderleft: "left_shoulder",
  left_shoulder: "left_shoulder",
  shoulder_right: "right_shoulder",
  shoulderright: "right_shoulder",
  right_shoulder: "right_shoulder",
  elbow_left: "left_elbow",
  elbowleft: "left_elbow",
  left_elbow: "left_elbow",
  elbow_right: "right_elbow",
  elbowright: "right_elbow",
  right_elbow: "right_elbow",
  wrist_left: "left_wrist",
  wristleft: "left_wrist",
  left_wrist: "left_wrist",
  wrist_right: "right_wrist",
  wristright: "right_wrist",
  right_wrist: "right_wrist",
  hand_left: "left_wrist",
  handleft: "left_wrist",
  left_hand: "left_wrist",
  hand_right: "right_wrist",
  handright: "right_wrist",
  right_hand: "right_wrist",
  handtip_left: "left_index",
  handtipleft: "left_index",
  left_hand_tip: "left_index",
  handtip_right: "right_index",
  handtipright: "right_index",
  right_hand_tip: "right_index",
  thumb_left: "left_thumb",
  thumbleft: "left_thumb",
  left_thumb: "left_thumb",
  thumb_right: "right_thumb",
  thumbright: "right_thumb",
  right_thumb: "right_thumb",
  hip_left: "left_hip",
  hipleft: "left_hip",
  left_hip: "left_hip",
  hip_right: "right_hip",
  hipright: "right_hip",
  right_hip: "right_hip",
  knee_left: "left_knee",
  kneeleft: "left_knee",
  left_knee: "left_knee",
  knee_right: "right_knee",
  kneeright: "right_knee",
  right_knee: "right_knee",
  ankle_left: "left_ankle",
  ankleleft: "left_ankle",
  left_ankle: "left_ankle",
  ankle_right: "right_ankle",
  ankleright: "right_ankle",
  right_ankle: "right_ankle",
  foot_left: "left_foot_index",
  footleft: "left_foot_index",
  left_foot: "left_foot_index",
  foot_right: "right_foot_index",
  footright: "right_foot_index",
  right_foot: "right_foot_index",
};

const PIXEL_FRAMES = [
  [1920, 1080],
  [1280, 720],
  [640, 576],
  [512, 424],
];

/**
 * @typedef {import("./index.js").Joint} Joint
 */

/**
 * Convert a Kinectron body frame (or a single body) into the spine joint map.
 * X is mirrored by default so a raised right hand moves the figure right,
 * matching the webcam adapter.
 *
 * @param {unknown} frame
 * @param {{ mirrorX?: boolean, minConfidence?: number }} [options]
 * @returns {Record<string, Joint>}
 */
export function kinectFrameToJoints(frame, { mirrorX = true, minConfidence = 0.35 } = {}) {
  for (const body of listBodies(frame)) {
    const joints = bodyToJoints(body, { mirrorX, minConfidence });
    if (Object.keys(joints).length > 0) return joints;
  }
  return {};
}

/**
 * @param {unknown} frame
 * @returns {object[]}
 */
export function listBodies(frame) {
  if (!frame || typeof frame !== "object") return [];
  const record = /** @type {Record<string, unknown>} */ (frame);
  if (Array.isArray(record.bodies)) return record.bodies.filter((body) => body && typeof body === "object");
  if (record.body && typeof record.body === "object") return [record.body];
  if (record.skeleton || record.joints) return [record];
  return [];
}

/**
 * @param {object} body
 * @param {{ mirrorX: boolean, minConfidence: number }} options
 * @returns {Record<string, Joint>}
 */
function bodyToJoints(body, { mirrorX, minConfidence }) {
  /** @type {Record<string, Joint>} */
  const joints = {};
  const raw = listRawJoints(body);
  if (raw.length === 0) return joints;

  const byIndex = pickIndexMap(raw);

  for (let i = 0; i < raw.length; i += 1) {
    const joint = raw[i];
    if (!joint || typeof joint !== "object") continue;

    const xy = readJointXY(joint);
    if (!xy) continue;

    const confidence = readJointConfidence(joint);
    if (confidence < minConfidence) continue;

    const name = nameForJoint(joint, i, byIndex);
    if (!name || joints[name]) continue;

    const x = mirrorX ? 1 - xy.x : xy.x;
    joints[name] = {
      x: clamp01(x),
      y: clamp01(xy.y),
      confidence,
    };
  }

  return joints;
}

/**
 * @param {object} body
 * @returns {object[]}
 */
function listRawJoints(body) {
  const record = /** @type {Record<string, unknown>} */ (body);
  const raw = record.skeleton && typeof record.skeleton === "object"
    ? /** @type {Record<string, unknown>} */ (record.skeleton).joints ?? record.skeleton
    : record.joints;

  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return Object.values(raw);
  return [];
}

/**
 * @param {object[]} raw
 */
function pickIndexMap(raw) {
  if (raw.length >= 32) return AZURE_INDEX_TO_NAME;
  if (raw.some((joint) => Number(joint?.index) >= 26 || Number(joint?.jointType) >= 26)) {
    return AZURE_INDEX_TO_NAME;
  }
  if (raw.some((joint) => Number.isFinite(joint?.index))) return AZURE_INDEX_TO_NAME;
  return V2_INDEX_TO_NAME;
}

/**
 * @param {object} joint
 * @param {number} fallbackIndex
 * @param {Record<number, string>} byIndex
 */
function nameForJoint(joint, fallbackIndex, byIndex) {
  const named = normalizeJointName(joint.name ?? joint.jointName);
  if (named) return named;

  const index = Number.isFinite(joint.index)
    ? joint.index
    : Number.isFinite(joint.jointType)
      ? joint.jointType
      : fallbackIndex;

  return byIndex[index] ?? null;
}

/**
 * @param {unknown} name
 */
function normalizeJointName(name) {
  if (typeof name !== "string" || name.length === 0) return null;
  const key = name.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return NAME_ALIASES[key] ?? null;
}

/**
 * @param {object} joint
 * @returns {{ x: number, y: number } | null}
 */
export function readJointXY(joint) {
  const pairs = [
    [joint.colorX, joint.colorY],
    [joint.depthX, joint.depthY],
    [joint.x, joint.y],
    [joint.position?.x, joint.position?.y],
  ];

  for (const [x, y] of pairs) {
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return normalizeKinectXY(x, y);
    }
  }
  return null;
}

/**
 * Kinectron v2 color/depth points are 0–1. Azure colorX/Y are often pixels.
 *
 * @param {number} x
 * @param {number} y
 */
export function normalizeKinectXY(x, y) {
  if (x >= 0 && x <= 1 && y >= 0 && y <= 1) return { x, y };

  for (const [width, height] of PIXEL_FRAMES) {
    if (x <= width && y <= height) {
      return { x: x / width, y: y / height };
    }
  }

  return { x: clamp01(x / 1920), y: clamp01(y / 1080) };
}

/**
 * Azure confidence is 0–3. Kinect v2 uses trackingState 0/1/2.
 * Values already in 0–1 pass through.
 *
 * @param {object} joint
 */
export function readJointConfidence(joint) {
  if (Number.isFinite(joint.confidence)) {
    const value = joint.confidence;
    // Azure body-tracking uses 0–3. 2 and 3 are unambiguous.
    // 0/1 stay on the 0–1 scale unless this joint also has an Azure index.
    if (Number.isInteger(value) && (value === 2 || value === 3)) return value / 3;
    if (Number.isInteger(value) && value === 1 && Number.isFinite(joint.index)) return 1 / 3;
    return value;
  }

  if (Number.isFinite(joint.trackingState)) {
    if (joint.trackingState >= 2) return 1;
    if (joint.trackingState === 1) return 0.5;
    return 0;
  }

  if (joint.tracked === true) return 1;
  if (joint.tracked === false) return 0;
  return 1;
}
