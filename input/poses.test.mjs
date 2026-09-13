import {
  assembleSample,
  pickSecondDeviceId,
  pointerToPose,
  posesFromSample,
} from "./poses.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const empty = assembleSample();
assert(empty.source === "idle", "no inputs should stay idle");
assert(empty.poses.length === 0, "idle sample has no pose maps");

const soloCam = assembleSample({
  webcamPoses: [
    { nose: { x: 0.4, y: 0.3, confidence: 0.9 }, left_wrist: { x: 0.2, y: 0.4, confidence: 0.9 } },
  ],
  timestamp: 12,
});
assert(soloCam.source === "webcam", "one webcam is still a webcam sample");
assert(soloCam.poses.length === 1, "one webcam emits one pose map");
assert(soloCam.poses[0].id === "p1", "the first camera is player 1");
assert(soloCam.poses[0].joints.nose.x === 0.4, "webcam joints stay on their own map");
assert(!("joints" in soloCam) || soloCam.joints === undefined, "sample is not a flattened joint dict");

const twoCams = assembleSample({
  webcamPoses: [
    { nose: { x: 0.2, y: 0.3, confidence: 1 } },
    { nose: { x: 0.8, y: 0.35, confidence: 1 } },
  ],
});
assert(twoCams.source === "webcam", "two webcams still report webcam");
assert(twoCams.poses.length === 2, "two webcams emit two pose maps");
assert(twoCams.poses[0].joints.nose.x === 0.2, "player 1 keeps camera 1");
assert(twoCams.poses[1].id === "p2", "the second camera is player 2");
assert(twoCams.poses[1].joints.nose.x === 0.8, "player 2 keeps camera 2");

const pointer = assembleSample({
  pointers: [{ x: 0.82, y: 0.31, confidence: 1 }],
});
assert(pointer.source === "mouse", "one pointer is the mouse stand-in");
assert(pointer.poses.length === 1, "one pointer is solo");
assert(Math.abs(pointer.poses[0].joints.pointer.x - 0.82) < 1e-9, "pointer x stays on the pose map");
assert(Math.abs(pointer.poses[0].joints.right_wrist.x - 0.82) < 1e-9, "stand-in skeleton reaches with the pointer");

const twoPointers = assembleSample({
  pointers: [
    { x: 0.2, y: 0.3, confidence: 1 },
    { x: 0.8, y: 0.7, confidence: 1 },
  ],
});
assert(twoPointers.poses.length === 2, "two pointers emit two pose maps");
assert(twoPointers.poses[0].joints.pointer.x === 0.2, "first pointer is player 1");
assert(twoPointers.poses[1].joints.pointer.x === 0.8, "second pointer is player 2");
assert(
  twoPointers.poses[0].joints.nose.x !== twoPointers.poses[1].joints.nose.x,
  "stand-in skeletons stay independent",
);

const cameraPlusPointer = assembleSample({
  webcamPoses: [{ nose: { x: 0.25, y: 0.4, confidence: 1 } }],
  pointers: [{ x: 0.82, y: 0.31, confidence: 1 }],
  keys: { x: 0.7, y: 0.6, confidence: 1 },
});
assert(cameraPlusPointer.source === "webcam", "a live camera body is webcam-only");
assert(cameraPlusPointer.poses.length === 1, "mouse and keyboard stay off when a camera body is live");
assert(cameraPlusPointer.poses[0].source === "webcam", "the camera skeleton is the only player");
assert(!cameraPlusPointer.poses.some((pose) => pose.source === "mouse"), "pointer is not injected as a second body");
assert(!cameraPlusPointer.poses.some((pose) => pose.source === "keyboard"), "keyboard is not injected beside a camera body");

const twoCamsPlusMouse = assembleSample({
  webcamPoses: [
    { nose: { x: 0.2, y: 0.3, confidence: 1 } },
    { nose: { x: 0.8, y: 0.35, confidence: 1 } },
  ],
  pointers: [{ x: 0.5, y: 0.5, confidence: 1 }],
});
assert(twoCamsPlusMouse.poses.length === 2, "two people in one frame stay two camera bodies");
assert(
  twoCamsPlusMouse.poses.every((pose) => pose.source === "webcam"),
  "mouse is not player 2 when two camera bodies are present",
);

const onlySecondCam = assembleSample({
  webcamPoses: [null, { nose: { x: 0.9, y: 0.2, confidence: 1 } }],
  pointers: [{ x: 0.1, y: 0.2, confidence: 1 }],
});
assert(onlySecondCam.poses.length === 1, "one usable camera pose still suppresses the pointer");
assert(onlySecondCam.poses[0].source === "webcam", "the live camera body stays the only player");
assert(onlySecondCam.poses[0].id === "p2", "camera 2 keeps its slot");

const cameraGone = assembleSample({
  webcamPoses: [{}],
  pointers: [{ x: 0.4, y: 0.5, confidence: 1 }],
});
assert(cameraGone.source === "mouse", "an empty camera pose is not usable; pointer returns");
assert(cameraGone.poses.length === 1, "camera-absent still plays with the pointer");
assert(cameraGone.poses[0].source === "mouse", "pointer stand-in returns immediately");

const fromLegacy = posesFromSample({
  source: "webcam",
  joints: { nose: { x: 0.3, y: 0.3, confidence: 1 } },
});
assert(fromLegacy.length === 1, "legacy joint dict becomes one pose map");
assert(fromLegacy[0].joints.nose.x === 0.3, "legacy joints pass through");

const fromPoses = posesFromSample(twoCams);
assert(fromPoses.length === 2, "posesFromSample keeps two maps");

const figure = pointerToPose({ x: 0.5, y: 0.4, confidence: 1 });
assert(figure.pointer.x === 0.5, "pointer joint is the contact point");
assert(figure.right_wrist.y === 0.4, "right wrist sits on the contact point");
assert(figure.right_ankle.x === 0.5 && figure.right_ankle.y === 0.4, "right ankle sits on the contact point as a foot stand-in");
assert(figure.left_shoulder && figure.right_hip, "stand-in has a body");

assert(pickSecondDeviceId(null, "a") === null, "missing device lists yield no second camera");
assert(
  pickSecondDeviceId(
    [
      { kind: "audioinput", deviceId: "mic" },
      { kind: "videoinput", deviceId: "cam-a" },
      { kind: "videoinput", deviceId: "cam-b" },
    ],
    "cam-a",
  ) === "cam-b",
  "the second webcam is a different device, not a second pose on the first",
);
assert(
  pickSecondDeviceId([{ kind: "videoinput", deviceId: "only" }], "only") === null,
  "one device stays solo",
);

console.log("input/poses.test.mjs passed");
