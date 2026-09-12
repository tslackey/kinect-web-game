import { PROMPT_DURATION, createGame } from "../game/index.js";
import { createInput } from "./index.js";
import { CAMERA_COPY } from "./camera-status.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * @param {EventTarget} target
 * @param {string} key
 */
function dispatchKey(target, key) {
  const event = new Event("keydown");
  Object.defineProperty(event, "key", { value: key });
  target.dispatchEvent(event);
}

const target = new EventTarget();
const input = createInput({ target });

assert(input.sample().source === "idle", "without pointer or pose the source stays idle");
assert(input.sample().poses.length === 0, "idle sample has no pose maps");
assert(input.getStatus().message === CAMERA_COPY.prompt, "camera copy is the default status");
assert(input.getStatus().camera === "prompt", "camera starts at the allow prompt");
assert(!("kinect" in input.getStatus()), "status should not advertise a Kinect adapter");
assert(input.getStatus().camera2 === "prompt", "the second camera starts unstarted");
assert(input.getStatus().camerasReady === 0, "no webcam is live until Allow camera");

const pointerEvent = new Event("pointermove");
Object.defineProperty(pointerEvent, "clientX", { value: 0.82 });
Object.defineProperty(pointerEvent, "clientY", { value: 0.31 });
target.dispatchEvent(pointerEvent);

const mouse = input.sample();
assert(mouse.source === "mouse", "a pointer event should become the mouse stand-in");
assert(mouse.poses.length === 1, "one pointer is still solo");
assert(Math.abs(mouse.poses[0].joints.pointer.x - 0.82) < 1e-9, "pointer x should map onto the pose map");
assert(Math.abs(mouse.poses[0].joints.pointer.y - 0.31) < 1e-9, "pointer y should map onto the pose map");
assert(mouse.poses[0].joints.right_wrist, "the mouse stand-in should grow a skeleton");
input.dispose();

const keysTarget = new EventTarget();
const keysInput = createInput({ target: keysTarget });
dispatchKey(keysTarget, "ArrowRight");
dispatchKey(keysTarget, "ArrowDown");
const steered = keysInput.sample();
assert(steered.source === "keyboard", "arrow keys should become the keyboard stand-in");
assert(steered.poses.length === 1, "keyboard alone is still solo");
assert(steered.poses[0].joints.pointer.x > 0.5, "ArrowRight should nudge the pointer right");
assert(steered.poses[0].joints.pointer.y > 0.5, "ArrowDown should nudge the pointer down");

const verb = createGame({ random: () => 0.55 });
verb.start();
const promptSteps = Math.ceil(PROMPT_DURATION / (1 / 60)) + 2;
for (let i = 0; i < promptSteps; i += 1) {
  verb.tick(1 / 60, { source: "idle", poses: [], timestamp: 0 });
}
const orb = verb.getState().target;
const hitTarget = new EventTarget();
const hitInput = createInput({ target: hitTarget });
const hitEvent = new Event("pointerdown");
Object.defineProperty(hitEvent, "clientX", { value: orb.x });
Object.defineProperty(hitEvent, "clientY", { value: orb.y });
hitTarget.dispatchEvent(hitEvent);
verb.tick(1 / 60, hitInput.sample());
assert(verb.getState().score === 1, "the existing verb should score from the pointer stand-in");
assert(verb.getState().inputSource === "mouse", "game should see the mouse source without code changes");

hitInput.dispose();
keysInput.dispose();

const duoTarget = new EventTarget();
const duo = createInput({ target: duoTarget });
const first = new Event("pointermove");
Object.defineProperty(first, "clientX", { value: 0.2 });
Object.defineProperty(first, "clientY", { value: 0.25 });
Object.defineProperty(first, "pointerId", { value: 1 });
duoTarget.dispatchEvent(first);
const second = new Event("pointermove");
Object.defineProperty(second, "clientX", { value: 0.8 });
Object.defineProperty(second, "clientY", { value: 0.7 });
Object.defineProperty(second, "pointerId", { value: 2 });
duoTarget.dispatchEvent(second);
const duoSample = duo.sample();
assert(duoSample.poses.length === 2, "two pointers should emit two pose maps");
assert(duoSample.poses[0].id === "p1", "first pointer is player 1");
assert(duoSample.poses[1].id === "p2", "second pointer is player 2");
assert(Math.abs(duoSample.poses[0].joints.pointer.x - 0.2) < 1e-9, "player 1 keeps the first pointer");
assert(Math.abs(duoSample.poses[1].joints.pointer.x - 0.8) < 1e-9, "player 2 keeps the second pointer");
duo.dispose();

const mixTarget = new EventTarget();
const mix = createInput({ target: mixTarget });
const mixPointer = new Event("pointermove");
Object.defineProperty(mixPointer, "clientX", { value: 0.15 });
Object.defineProperty(mixPointer, "clientY", { value: 0.2 });
mixTarget.dispatchEvent(mixPointer);
dispatchKey(mixTarget, "ArrowLeft");
const mixed = mix.sample();
assert(mixed.source === "mixed", "mouse plus keyboard should be two independent stand-ins");
assert(mixed.poses.length === 2, "a missing second camera can use the keyboard");
assert(mixed.poses[0].source === "mouse", "the pointer stays player 1");
assert(mixed.poses[1].source === "keyboard", "the keyboard is player 2");
mix.dispose();

const peekTarget = new EventTarget();
const peeked = createInput({
  target: peekTarget,
  peekPermission: async () => "denied",
});
await new Promise((resolve) => setTimeout(resolve, 0));
assert(peeked.getStatus().camera === "denied", "a denied peek should surface before getUserMedia");
assert(peeked.getStatus().permission === "denied", "status should remember the denied peek");
assert(/keyboard/i.test(peeked.getStatus().message), "denied peek copy should mention the keyboard");
peeked.dispose();

const grantedTarget = new EventTarget();
const granted = createInput({
  target: grantedTarget,
  peekPermission: async () => "granted",
});
await new Promise((resolve) => setTimeout(resolve, 0));
assert(granted.getStatus().camera === "prompt", "a granted peek still waits for a click to start the camera");
assert(granted.getStatus().permission === "granted", "status should remember the granted peek");
assert(granted.getStatus().message === CAMERA_COPY.granted, "granted peek should use the start-camera copy");
granted.dispose();

console.log("input/sample.test.mjs passed");
