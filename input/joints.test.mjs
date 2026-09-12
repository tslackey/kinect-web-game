import { landmarksToJoints, POSE_LANDMARK_NAMES } from "./joints.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const empty = landmarksToJoints(null);
assert(Object.keys(empty).length === 0, "null landmarks should yield no joints");

const noseOnly = new Array(POSE_LANDMARK_NAMES.length);
noseOnly[0] = { x: 0.25, y: 0.4, visibility: 0.95 };
const joints = landmarksToJoints(noseOnly);
assert(joints.nose, "nose should be mapped from landmark 0");
assert(Math.abs(joints.nose.x - 0.75) < 1e-9, "webcam x should be mirrored");
assert(joints.nose.y === 0.4, "y should stay as-is");
assert(joints.nose.confidence === 0.95, "visibility should become confidence");

const unmirrored = landmarksToJoints(noseOnly, { mirrorX: false });
assert(unmirrored.nose.x === 0.25, "mirrorX false should keep image x");

const dim = landmarksToJoints([{ x: 0.1, y: 0.2, visibility: 0.1 }]);
assert(!dim.nose, "low-confidence landmarks should be dropped");

const shoulders = new Array(POSE_LANDMARK_NAMES.length);
shoulders[11] = { x: 0.2, y: 0.3, visibility: 0.8 };
shoulders[12] = { x: 0.8, y: 0.31, visibility: 0.8 };
const body = landmarksToJoints(shoulders);
assert(body.left_shoulder.x > 0.7, "left shoulder should flip to the right side of the canvas");
assert(body.right_shoulder.x < 0.3, "right shoulder should flip to the left side of the canvas");

console.log("input/joints.test.mjs passed");
