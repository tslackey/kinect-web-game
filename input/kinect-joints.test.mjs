import { AZURE_INDEX_TO_NAME, kinectFrameToJoints, normalizeKinectXY } from "./kinect-joints.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function azureJoint(index, x, y, confidence = 2) {
  return { index, colorX: x, colorY: y, confidence };
}

function v2Joint(jointType, x, y, trackingState = 2) {
  return { jointType, depthX: x, depthY: y, trackingState };
}

assert(Object.keys(kinectFrameToJoints(null)).length === 0, "null frame should yield no joints");
assert(Object.keys(kinectFrameToJoints({ bodies: [] })).length === 0, "empty bodies should yield no joints");

const azure = kinectFrameToJoints({
  bodies: [
    {
      skeleton: {
        joints: [
          azureJoint(27, 0.4, 0.2),
          azureJoint(5, 0.3, 0.35),
          azureJoint(12, 0.7, 0.36),
          azureJoint(7, 0.15, 0.55),
          azureJoint(14, 0.85, 0.54),
        ],
      },
    },
  ],
});

assert(azure.nose, "Azure nose (27) should map to nose");
assert(Math.abs(azure.nose.x - 0.6) < 1e-9, "Kinect x should be mirrored like the webcam");
assert(azure.nose.y === 0.2, "y should stay as-is when already normalized");
assert(azure.left_wrist, "Azure wrist 7 should map to left_wrist");
assert(azure.right_wrist, "Azure wrist 14 should map to right_wrist");
assert(azure.left_wrist.x > 0.8, "left wrist should flip to the right side of the canvas");
assert(azure.right_wrist.x < 0.2, "right wrist should flip to the left side of the canvas");
assert(azure.left_wrist.confidence > 0.6, "Azure medium confidence should pass the floor");

const pixels = kinectFrameToJoints({
  bodies: [
    {
      joints: [azureJoint(7, 192, 324, 3)],
    },
  ],
});
assert(pixels.left_wrist, "pixel colorX/Y should still produce a wrist");
assert(Math.abs(pixels.left_wrist.y - 0.3) < 1e-9, "1080p colorY 324 should normalize to 0.3");

const unmirrored = kinectFrameToJoints(
  { bodies: [{ joints: [azureJoint(27, 0.25, 0.4)] }] },
  { mirrorX: false },
);
assert(unmirrored.nose.x === 0.25, "mirrorX false should keep sensor x");

const dim = kinectFrameToJoints({
  bodies: [{ joints: [azureJoint(7, 0.2, 0.2, 0)] }],
});
assert(!dim.left_wrist, "zero-confidence Azure joints should be dropped");

const v2 = kinectFrameToJoints({
  bodies: [
    {
      joints: [
        v2Joint(3, 0.5, 0.15),
        v2Joint(6, 0.2, 0.5),
        v2Joint(10, 0.8, 0.48),
      ],
    },
  ],
});
assert(v2.nose, "Kinect v2 head (3) should stand in for nose");
assert(v2.left_wrist && v2.right_wrist, "v2 wrists should map to the webcam striker names");
assert(v2.left_wrist.x > 0.7, "v2 left wrist should be mirrored");

const named = kinectFrameToJoints({
  body: {
    joints: [{ name: "WristLeft", colorX: 0.1, colorY: 0.4, confidence: 1 }],
  },
});
assert(named.left_wrist, "string joint names should alias onto the webcam dictionary");

const single = kinectFrameToJoints({
  joints: [v2Joint(6, 0.33, 0.66)],
});
assert(single.left_wrist, "a bare body (Kinectron v0 callback) should map");

assert(AZURE_INDEX_TO_NAME[7] === "left_wrist", "Azure 7 is the gameplay striker");
assert(normalizeKinectXY(0.25, 0.5).x === 0.25, "already-normalized points stay put");
assert(Math.abs(normalizeKinectXY(960, 540).x - 0.5) < 1e-9, "1920x1080 pixels should normalize");

console.log("input/kinect-joints.test.mjs passed");
