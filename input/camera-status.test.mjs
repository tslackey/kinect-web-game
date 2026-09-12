import { classifyCameraError } from "./camera-status.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const denied = classifyCameraError({ name: "NotAllowedError" });
assert(denied.status === "denied", "permission denial should be denied");
assert(/blocked/i.test(denied.message), "denied copy should mention blocked");

const missing = classifyCameraError({ name: "NotFoundError" });
assert(missing.status === "unavailable", "missing device should be unavailable");

const insecure = classifyCameraError({ name: "SecurityError" });
assert(insecure.status === "unavailable", "insecure context should be unavailable");
assert(/https/i.test(insecure.message), "insecure copy should mention HTTPS");

const busy = classifyCameraError({ name: "NotReadableError" });
assert(busy.status === "error", "busy camera should be an error");

const unknown = classifyCameraError(new Error("nope"));
assert(unknown.status === "error", "unknown errors should not crash");
assert(unknown.message.length > 0, "unknown errors still need a readable message");

console.log("input/camera-status.test.mjs passed");
