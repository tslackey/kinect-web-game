import { CAMERA_COPY, classifyCameraError, peekCameraPermission } from "./camera-status.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const denied = classifyCameraError({ name: "NotAllowedError" });
assert(denied.status === "denied", "permission denial should be denied");
assert(denied.message === CAMERA_COPY.denied, "denied copy should be the shared first-visit line");
assert(/pointer/i.test(denied.message), "denied copy should mention the pointer");
assert(/keyboard/i.test(denied.message), "denied copy should mention the keyboard");

const missing = classifyCameraError({ name: "NotFoundError" });
assert(missing.status === "unavailable", "missing device should be unavailable");
assert(/keyboard/i.test(missing.message), "missing-camera copy should mention the keyboard");

const insecure = classifyCameraError({ name: "SecurityError" });
assert(insecure.status === "unavailable", "insecure context should be unavailable");
assert(/https/i.test(insecure.message), "insecure copy should mention HTTPS");

const busy = classifyCameraError({ name: "NotReadableError" });
assert(busy.status === "error", "busy camera should be an error");

const unknown = classifyCameraError(new Error("nope"));
assert(unknown.status === "error", "unknown errors should not crash");
assert(unknown.message.length > 0, "unknown errors still need a readable message");

const peekedDenied = await peekCameraPermission(async () => ({ state: "denied" }));
assert(peekedDenied === "denied", "peek should pass through a denied permission");

const peekedGranted = await peekCameraPermission(async () => ({ state: "granted" }));
assert(peekedGranted === "granted", "peek should pass through a granted permission");

const peekedUnknown = await peekCameraPermission(async () => {
  throw new Error("permissions query unsupported");
});
assert(peekedUnknown === "unknown", "a throwing peek should be unknown, not a crash");

const peekedMissing = await peekCameraPermission();
assert(peekedMissing === "unknown" || peekedMissing === "prompt" || peekedMissing === "denied" || peekedMissing === "granted", "a missing query still resolves");

console.log("input/camera-status.test.mjs passed");
