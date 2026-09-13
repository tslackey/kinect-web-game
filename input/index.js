/**
 * Input facade: one webcam (up to two bodies in frame), else pointer /
 * keyboard stand-ins. A live camera pose suppresses mouse and keyboard.
 * game/ and render/ only see PoseSample.poses — one map per person.
 */

import { classifyCameraError, peekCameraPermission, CAMERA_COPY } from "./camera-status.js";
import { landmarksToJoints } from "./joints.js";
import { assembleSample, pickSecondDeviceId } from "./poses.js";

export { assembleSample, pickSecondDeviceId, pointerToPose, posesFromSample } from "./poses.js";

const KEY_STEP = 0.05;

const TASKS_VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

/**
 * @typedef {object} Joint
 * @property {number} x Normalized horizontal position in [0, 1].
 * @property {number} y Normalized vertical position in [0, 1].
 * @property {number} confidence
 */

/**
 * @typedef {import("./poses.js").PoseSample} PoseSample
 * @typedef {import("./poses.js").PoseMap} PoseMap
 */

/**
 * @param {{
 *   target?: EventTarget,
 *   video?: HTMLVideoElement | null,
 *   video2?: HTMLVideoElement | null,
 *   peekPermission?: (() => Promise<"granted" | "denied" | "prompt" | "unknown">) | null,
 * }} [options]
 */
export function createInput({
  target = typeof window !== "undefined" ? window : undefined,
  video = null,
  video2 = null,
  peekPermission,
} = {}) {
  if (!target) {
    throw new Error("createInput needs an EventTarget.");
  }

  /** @type {Map<number, Joint>} */
  const pointers = new Map();
  /** @type {Joint | null} */
  let keys = null;
  /** @type {"granted" | "denied" | "prompt" | "unknown"} */
  let permission = "unknown";
  let videoDeviceCount = 0;
  let starting = false;

  /** @type {ReturnType<typeof makeSlot>[]} */
  const slots = [makeSlot(video), makeSlot(video2)];

  /**
   * @param {PointerEvent} event
   */
  function onPointer(event) {
    const view = typeof window !== "undefined" ? window : null;
    const width = view?.innerWidth || 1;
    const height = view?.innerHeight || 1;
    const pointerId = typeof event.pointerId === "number" ? event.pointerId : 0;
    pointers.set(pointerId, {
      x: Math.min(1, Math.max(0, event.clientX / width)),
      y: Math.min(1, Math.max(0, event.clientY / height)),
      confidence: 1,
    });
  }

  /**
   * @param {KeyboardEvent} event
   */
  function onKeyDown(event) {
    const delta = keyDelta(event.key);
    if (!delta) return;

    const origin = keys ?? { x: 0.5, y: 0.5, confidence: 1 };
    keys = {
      x: clampKey(origin.x + delta.x),
      y: clampKey(origin.y + delta.y),
      confidence: 1,
    };
  }

  target.addEventListener("pointermove", onPointer);
  target.addEventListener("pointerdown", onPointer);
  target.addEventListener("keydown", onKeyDown);

  const peek = peekPermission === undefined ? peekCameraPermission : peekPermission;
  if (peek) {
    void Promise.resolve()
      .then(() => peek())
      .then((state) => {
        if (slots[0].status !== "prompt") return;
        permission = state;
        if (state === "denied") {
          slots[0].status = "denied";
        } else if (state === "granted") {
          slots[0].grantedPeek = true;
        }
      })
      .catch(() => {
        // A failed peek must not change the allow-camera prompt.
      });
  }

  /**
   * Start a camera slot. Play uses one webcam. Extra slots stay in the
   * input module for later tracking work — they are not a second player.
   *
   * @param {number} [slotIndex]
   */
  async function startCamera(slotIndex) {
    const index = Number.isInteger(slotIndex) ? slotIndex : 0;
    if (index < 0 || index > 1) return;
    if (starting) return;

    starting = true;
    try {
      await startSlot(index);
    } finally {
      starting = false;
    }
  }

  /** @returns {PoseSample} */
  function sample() {
    const timestamp = performance.now();
    refreshWebcamJoints(timestamp);
    return assembleSample({
      webcamPoses: webcamPosesFromPrimary(),
      pointers: [...pointers.values()],
      keys,
      timestamp,
    });
  }

  /**
   * Play reads pose maps from the first live webcam only.
   * Two people share that stream when the landmarker returns two maps.
   */
  function webcamPosesFromPrimary() {
    const primary = slots[0];
    if (primary.status !== "ready") return [];
    if (primary.poseMaps.length > 0) return primary.poseMaps;
    return primary.joints ? [primary.joints] : [];
  }

  function getStatus() {
    const readyCount = slots.filter((slot) => slot.status === "ready").length;
    const message = statusMessage();
    return {
      camera: slots[0].status,
      camera2: slots[1].status,
      camerasReady: readyCount,
      deviceCount: videoDeviceCount,
      message,
      cameraMessage: message,
      permission,
      jointCount: slots[0].joints ? Object.keys(slots[0].joints).length : 0,
      poseCount: readyCount,
      starting,
    };
  }

  function dispose() {
    target.removeEventListener("pointermove", onPointer);
    target.removeEventListener("pointerdown", onPointer);
    target.removeEventListener("keydown", onKeyDown);
    for (const slot of slots) {
      stopSlot(slot);
    }
  }

  /**
   * @param {number} now
   */
  function refreshWebcamJoints(now) {
    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      if (slot.status !== "ready" || !slot.landmarker || !slot.video) continue;
      if (slot.video.readyState < 2 || slot.video.videoWidth < 16) continue;
      if (now - slot.lastDetectAt < 33) continue;

      try {
        const result = slot.landmarker.detectForVideo(slot.video, Math.floor(now) + i);
        slot.lastDetectAt = now;
        const poses = result?.landmarks;
        if (Array.isArray(poses) && poses.length) {
          /** @type {Record<string, import("./index.js").Joint>[]} */
          const maps = [];
          for (let p = 0; p < Math.min(2, poses.length); p += 1) {
            if (poses[p]?.length) maps.push(landmarksToJoints(poses[p]));
          }
          if (maps.length) {
            slot.poseMaps = maps;
            slot.joints = maps[0];
          }
        }
      } catch {
        // A bad frame must not tear down the tick loop.
      }
    }
  }

  /**
   * @param {number} index
   */
  async function startSlot(index) {
    const slot = slots[index];
    if (slot.status === "pending" || slot.status === "loading" || slot.status === "ready") {
      return;
    }

    slot.status = "pending";

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        slot.status = "unavailable";
        return;
      }

      const constraints = await videoConstraintsFor(index);
      if (!constraints) {
        slot.status = "unavailable";
        return;
      }

      slot.stream = await navigator.mediaDevices.getUserMedia({
        video: constraints,
        audio: false,
      });

      const el = ensureVideo(slot, index);
      el.srcObject = slot.stream;
      el.muted = true;
      el.playsInline = true;
      el.classList.add("is-live");
      await el.play();

      slot.status = "loading";

      try {
        slot.landmarker = await loadPoseLandmarker();
        slot.lastDetectAt = 0;
        slot.status = "ready";
        permission = "granted";
        await refreshDeviceCount();
      } catch {
        slot.status = "error";
        slot.modelError = true;
      }
    } catch (error) {
      stopSlot(slot);
      const classified = classifyCameraError(error);
      slot.status = classified.status;
      slot.errorMessage = classified.message;
      if (classified.status === "denied") permission = "denied";
    }
  }

  /**
   * @param {number} index
   */
  async function videoConstraintsFor(index) {
    const size = { width: { ideal: 640 }, height: { ideal: 480 } };
    if (index === 0) {
      return { facingMode: "user", ...size };
    }

    await refreshDeviceCount();
    const firstId = slots[0].stream?.getVideoTracks?.()[0]?.getSettings?.()?.deviceId;
    const deviceId = pickSecondId(firstId);
    if (!deviceId) return null;
    return { deviceId: { exact: deviceId }, ...size };
  }

  /**
   * @param {string | undefined} firstId
   */
  function pickSecondId(firstId) {
    const fromStream = firstId ?? slots[0].stream?.getVideoTracks?.()[0]?.getSettings?.()?.deviceId;
    return pickSecondDeviceId(lastDevices, fromStream);
  }

  /** @type {Array<{ kind?: string, deviceId?: string }>} */
  let lastDevices = [];

  async function refreshDeviceCount() {
    try {
      const devices = await navigator.mediaDevices?.enumerateDevices?.();
      if (!Array.isArray(devices)) return;
      lastDevices = devices;
      videoDeviceCount = devices.filter((device) => device.kind === "videoinput").length;
    } catch {
      // Device lists are best-effort. Solo play still works.
    }
  }

  function nextSlotIndex() {
    if (slots[0].status !== "ready" && slots[0].status !== "loading" && slots[0].status !== "pending") {
      return 0;
    }
    if (slots[1].status !== "ready" && slots[1].status !== "loading" && slots[1].status !== "pending") {
      return 1;
    }
    return -1;
  }

  function statusMessage() {
    const [first] = slots;
    if (first.status === "ready") return CAMERA_COPY.ready;
    if (first.modelError) {
      return "Camera is on, but the pose model failed to load. The pointer still works.";
    }
    if (first.status === "pending") return CAMERA_COPY.pending;
    if (first.status === "loading") return CAMERA_COPY.loading;
    if (first.status === "denied") return first.errorMessage ?? CAMERA_COPY.denied;
    if (first.status === "unavailable") {
      return first.errorMessage ?? CAMERA_COPY.unavailable;
    }
    if (first.status === "error") return first.errorMessage ?? CAMERA_COPY.error;
    if (first.grantedPeek || permission === "granted") return CAMERA_COPY.granted;
    return CAMERA_COPY.prompt;
  }

  return { sample, startCamera, getStatus, dispose };
}

/**
 * @param {HTMLVideoElement | null} video
 */
function makeSlot(video) {
  return {
    video: isVideo(video) ? video : null,
    stream: /** @type {MediaStream | null} */ (null),
    landmarker: /** @type {{ detectForVideo: Function, close?: Function } | null} */ (null),
    joints: /** @type {Record<string, import("./index.js").Joint> | null} */ (null),
    poseMaps: /** @type {Record<string, import("./index.js").Joint>[]} */ ([]),
    status: /** @type {import("./camera-status.js").CameraStatus} */ ("prompt"),
    lastDetectAt: 0,
    grantedPeek: false,
    modelError: false,
    errorMessage: /** @type {string | null} */ (null),
  };
}

/**
 * @param {ReturnType<typeof makeSlot>} slot
 * @param {number} index
 */
function ensureVideo(slot, index) {
  if (slot.video) return slot.video;
  const el = document.createElement("video");
  el.setAttribute("playsinline", "");
  el.muted = true;
  el.autoplay = true;
  el.className = index === 1 ? "camera-feed camera-feed-b" : "camera-feed";
  document.body.appendChild(el);
  slot.video = el;
  return el;
}

/**
 * @param {ReturnType<typeof makeSlot>} slot
 */
function stopSlot(slot) {
  if (slot.stream) {
    for (const track of slot.stream.getTracks()) {
      track.stop();
    }
    slot.stream = null;
  }
  if (slot.video) {
    slot.video.srcObject = null;
    slot.video.classList.remove("is-live");
  }
  try {
    slot.landmarker?.close?.();
  } catch {
    // ignore
  }
  slot.landmarker = null;
  slot.joints = null;
  slot.poseMaps = [];
}

/**
 * @param {unknown} video
 */
function isVideo(video) {
  return typeof HTMLVideoElement !== "undefined" && video instanceof HTMLVideoElement;
}

/**
 * @param {string} key
 * @returns {{ x: number, y: number } | null}
 */
function keyDelta(key) {
  if (key === "ArrowLeft" || key === "a" || key === "A") return { x: -KEY_STEP, y: 0 };
  if (key === "ArrowRight" || key === "d" || key === "D") return { x: KEY_STEP, y: 0 };
  if (key === "ArrowUp" || key === "w" || key === "W") return { x: 0, y: -KEY_STEP };
  if (key === "ArrowDown" || key === "s" || key === "S") return { x: 0, y: KEY_STEP };
  return null;
}

/**
 * @param {number} value
 */
function clampKey(value) {
  return Math.min(1, Math.max(0, value));
}

/** @type {Promise<unknown> | null} */
let visionPromise = null;

async function loadVision() {
  if (!visionPromise) {
    visionPromise = (async () => {
      const module = await import(`${TASKS_VISION}/vision_bundle.mjs`);
      const FilesetResolver = module.FilesetResolver;
      const PoseLandmarker = module.PoseLandmarker;
      if (!FilesetResolver || !PoseLandmarker) {
        throw new Error("MediaPipe PoseLandmarker export was missing.");
      }
      const vision = await FilesetResolver.forVisionTasks(`${TASKS_VISION}/wasm`);
      return { PoseLandmarker, vision };
    })();
  }
  return visionPromise;
}

async function loadPoseLandmarker() {
  const { PoseLandmarker, vision } = await loadVision();
  const options = {
    runningMode: "VIDEO",
    numPoses: 2,
    baseOptions: {
      modelAssetPath: POSE_MODEL,
      delegate: "GPU",
    },
  };

  try {
    return await PoseLandmarker.createFromOptions(vision, options);
  } catch {
    options.baseOptions.delegate = "CPU";
    return await PoseLandmarker.createFromOptions(vision, options);
  }
}
