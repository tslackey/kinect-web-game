import { createGame } from "../game/index.js";
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
assert(input.getStatus().message === CAMERA_COPY.prompt, "camera copy is the default status");
assert(input.getStatus().camera === "prompt", "camera starts at the allow prompt");
assert(!("kinect" in input.getStatus()), "status should not advertise a Kinect adapter");

const pointerEvent = new Event("pointermove");
Object.defineProperty(pointerEvent, "clientX", { value: 0.82 });
Object.defineProperty(pointerEvent, "clientY", { value: 0.31 });
target.dispatchEvent(pointerEvent);

const mouse = input.sample();
assert(mouse.source === "mouse", "a pointer event should become the mouse stand-in");
assert(Math.abs(mouse.joints.pointer.x - 0.82) < 1e-9, "pointer x should map onto the joint");
assert(Math.abs(mouse.joints.pointer.y - 0.31) < 1e-9, "pointer y should map onto the joint");
input.dispose();

const keysTarget = new EventTarget();
const keysInput = createInput({ target: keysTarget });
dispatchKey(keysTarget, "ArrowRight");
dispatchKey(keysTarget, "ArrowDown");
const steered = keysInput.sample();
assert(steered.source === "keyboard", "arrow keys should become the keyboard stand-in");
assert(steered.joints.pointer.x > 0.5, "ArrowRight should nudge the pointer right");
assert(steered.joints.pointer.y > 0.5, "ArrowDown should nudge the pointer down");

const verb = createGame({ random: () => 0.55 });
verb.start();
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
