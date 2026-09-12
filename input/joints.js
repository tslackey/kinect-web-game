/**
 * Shared pose joint names and MediaPipe landmark mapping.
 * A later Kinect adapter should emit this same joint dictionary.
 */

export const POSE_LANDMARK_NAMES = [
  "nose",
  "left_eye_inner",
  "left_eye",
  "left_eye_outer",
  "right_eye_inner",
  "right_eye",
  "right_eye_outer",
  "left_ear",
  "right_ear",
  "mouth_left",
  "mouth_right",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_pinky",
  "right_pinky",
  "left_index",
  "right_index",
  "left_thumb",
  "right_thumb",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_heel",
  "right_heel",
  "left_foot_index",
  "right_foot_index",
];

/** Bones drawn by the renderer. Names match POSE_LANDMARK_NAMES. */
export const STICK_BONES = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

/**
 * @typedef {object} Landmark
 * @property {number} x
 * @property {number} y
 * @property {number} [visibility]
 * @property {number} [presence]
 */

/**
 * @typedef {import("./index.js").Joint} Joint
 */

/**
 * Convert MediaPipe-style landmarks into the spine's joint map.
 * Webcam x is mirrored so raising your right hand moves the figure right.
 *
 * @param {Landmark[] | undefined | null} landmarks
 * @param {{ mirrorX?: boolean, minConfidence?: number }} [options]
 * @returns {Record<string, Joint>}
 */
export function landmarksToJoints(landmarks, { mirrorX = true, minConfidence = 0.35 } = {}) {
  /** @type {Record<string, Joint>} */
  const joints = {};
  if (!Array.isArray(landmarks)) return joints;

  const count = Math.min(landmarks.length, POSE_LANDMARK_NAMES.length);
  for (let i = 0; i < count; i += 1) {
    const landmark = landmarks[i];
    if (!landmark || !Number.isFinite(landmark.x) || !Number.isFinite(landmark.y)) {
      continue;
    }

    const confidence = pickConfidence(landmark);
    if (confidence < minConfidence) continue;

    const x = mirrorX ? 1 - landmark.x : landmark.x;
    joints[POSE_LANDMARK_NAMES[i]] = {
      x: clamp01(x),
      y: clamp01(landmark.y),
      confidence,
    };
  }

  return joints;
}

/**
 * @param {Landmark} landmark
 */
function pickConfidence(landmark) {
  if (Number.isFinite(landmark.visibility)) return landmark.visibility;
  if (Number.isFinite(landmark.presence)) return landmark.presence;
  return 1;
}

/**
 * @param {number} value
 */
export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}
