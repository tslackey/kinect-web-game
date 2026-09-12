import { createGame } from "../game/index.js";
import { createInput } from "./index.js";
import { createKinectAdapter } from "./kinect.js";
import { CAMERA_COPY } from "./camera-status.js";
import { KINECT_COPY } from "./kinect-config.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class SilentTarget {
  addEventListener() {}
  removeEventListener() {}
}

function azureFrame(x = 0.2, y = 0.4) {
  return {
    bodies: [
      {
        skeleton: {
          joints: [
            { index: 27, colorX: 0.5, colorY: 0.2, confidence: 2 },
            { index: 7, colorX: x, colorY: y, confidence: 3 },
            { index: 14, colorX: 0.8, colorY: 0.41, confidence: 3 },
          ],
        },
      },
    ],
  };
}

function createFakeLoader(bucket) {
  return async function loadFake() {
    return class FakeKinectron {
      constructor(config) {
        bucket.instance = this;
        this.config = config;
        this.handlers = {};
        this.peer = {
          connect: () => {
            this.handlers.ready?.();
          },
        };
      }

      on(event, callback) {
        this.handlers[event] = callback;
      }

      startBodies(callback) {
        this.bodyCallback = callback;
      }

      initKinect() {
        return Promise.resolve({ success: true, alreadyInitialized: true });
      }

      close() {
        bucket.closed = true;
      }

      stopAll() {}
    };
  };
}

function createTimeoutLoader() {
  return async function loadHang() {
    return class HangKinectron {
      constructor() {
        this.peer = { connect() {} };
      }

      on() {}

      startBodies() {}
    };
  };
}

const target = new SilentTarget();

const webcamOnly = createInput({
  target,
  search: "?input=webcam",
  protocol: "http:",
  autoKinect: false,
});
webcamOnly.ingestKinectFrame(azureFrame());
const afterIngest = webcamOnly.sample();
assert(afterIngest.source === "kinect", "ingested Kinect joints should win over idle");
assert(afterIngest.joints.left_wrist, "ingested frame should use the webcam joint names");
assert(afterIngest.joints.right_wrist, "both wrists should be present for the one verb");
webcamOnly.dispose();

const mouseStillWorks = createInput({
  target,
  search: "?input=webcam",
  protocol: "https:",
  autoKinect: false,
});
assert(mouseStillWorks.sample().source === "idle", "without pointer or pose the source stays idle");
assert(mouseStillWorks.getStatus().message === CAMERA_COPY.prompt, "webcam copy stays put when Kinect is idle");
assert(mouseStillWorks.getStatus().camera === "prompt", "camera status is unchanged by the Kinect adapter");
mouseStillWorks.dispose();

const mixed = createKinectAdapter({
  search: "",
  protocol: "https:",
  loadClient: async () => {
    throw new Error("should not load on mixed-content loopback");
  },
});
await mixed.start();
assert(mixed.getStatus().kinect === "error", "HTTPS → local HTTP Kinectron should be refused");
assert(/localhost:8080|ngrok/i.test(mixed.getStatus().message), "mixed-content copy should mention the workaround");

const fake = { instance: null, closed: false };
const live = createKinectAdapter({
  search: "?kinect=10.0.0.8",
  protocol: "http:",
  loadClient: createFakeLoader(fake),
  probe: false,
});
await live.start();
assert(fake.instance, "a successful start should construct the Kinectron client");
assert(fake.instance.config.host === "10.0.0.8", "the adapter should pass the URL host through");
assert(fake.instance.config.port === 9001, "LAN hosts should keep the Kinectron port");
assert(live.getStatus().kinect === "ready", "ready without a body is not yet live");
fake.instance.bodyCallback(azureFrame(0.22, 0.51));
assert(live.isLive(), "a body frame should mark the adapter live");
assert(live.getJoints().left_wrist, "live joints should be the mapped webcam shape");
assert(live.getStatus().message === KINECT_COPY.live, "live copy should mention Kinect");

const routed = createInput({
  target,
  search: "?kinect=10.0.0.8",
  protocol: "http:",
  autoKinect: false,
  loadKinectron: createFakeLoader({ instance: null }),
});
routed.ingestKinectFrame(azureFrame());
const sample = routed.sample();
assert(sample.source === "kinect", "createInput.sample should report the kinect source");
assert(routed.getStatus().kinect === "live", "getStatus should expose the kinect adapter");
assert(routed.getStatus().jointCount >= 2, "status joint count should include Kinect wrists");

const verb = createGame({ random: () => 0.55 });
verb.start();
const orb = verb.getState().target;
routed.ingestKinectFrame({
  bodies: [
    {
      joints: [{ index: 7, colorX: 1 - orb.x, colorY: orb.y, confidence: 3 }],
    },
  ],
});
verb.tick(1 / 60, routed.sample());
assert(verb.getState().score === 1, "the existing verb should score from mapped Kinect wrists");
assert(verb.getState().inputSource === "kinect", "game should see the kinect source without code changes");
routed.dispose();

const probed = createKinectAdapter({
  search: "?kinect=127.0.0.1",
  protocol: "http:",
  loadClient: async () => {
    throw new Error("should not load Kinectron when the host probe fails");
  },
});
await probed.start();
assert(probed.getStatus().kinect === "missing", "an unreachable local host should fail the probe");

const missing = createKinectAdapter({
  search: "?kinect=127.0.0.1",
  protocol: "http:",
  loadClient: createTimeoutLoader(),
  connectMs: 30,
  probe: false,
});
await missing.start();
assert(missing.getStatus().kinect === "missing", "a hung client should time out as missing");
assert(/Kinectron/i.test(missing.getStatus().message), "missing copy should mention the host app");

console.log("input/kinect.test.mjs passed");
