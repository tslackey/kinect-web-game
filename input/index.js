/**
 * Input facade: webcam pose, else pointer / keyboard stand-ins.
 * game/ and render/ only see the PoseSample — they do not care which adapter
 * produced it.
 */

import { classifyCameraError, peekCameraPermission, CAMERA_COPY } from "./camera-status.js";
import { clamp01, landmarksToJoints } from "./joints.js";

const IDLE_SOURCE = "idle";
const MOUSE_SOURCE = "mouse";
const KEYBOARD_SOURCE = "keyboard";
const WEBCAM_SOURCE = "webcam";
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
 * @typedef {object} PoseSample
 * @property {"idle" | "mouse" | "keyboard" | "webcam"} source
 * @property {Record<string, Joint>} joints
 * @property {number} timestamp
 */

/**
 * @param {{
 *   target?: EventTarget,
 *   video?: HTMLVideoElement | null,
 *   peekPermission?: (() => Promise<"granted" | "denied" | "prompt" | "unknown">) | null,
 * }} [options]
 */
export function createInput({
  target = typeof window !== "undefined" ? window : undefined,
  video = null,
  peekPermission,
} = {}) {
  if (!target) {
    throw new Error("createInput needs an EventTarget.");
  }

  /** @type {Joint | null} */
  let pointer = null;
  /** @type {Joint | null} */
  let keys = null;
  /** @type {Record<string, Joint> | null} */
  let webcamJoints = null;
  /** @type {import("./camera-status.js").CameraStatus} */
  let cameraStatus = "prompt";
  let cameraMessage = CAMERA_COPY.prompt;
  /** @type {"granted" | "denied" | "prompt" | "unknown"} */
  let permission = "unknown";
  /** @type {MediaStream | null} */
  let stream = null;
  /** @type {{ detectForVideo: Function, close?: Function } | null} */
  let landmarker = null;
  let lastDetectAt = 0;
  /** @type {HTMLVideoElement | null} */
  let videoEl =
    typeof HTMLVideoElement !== "undefined" && video instanceof HTMLVideoElement ? video : null;

  /**
   * @param {PointerEvent} event
   */
  function onPointer(event) {
    const view = typeof window !== "undefined" ? window : null;
    const width = view?.innerWidth || 1;
    const height = view?.innerHeight || 1;
    pointer = {
      x: Math.min(1, Math.max(0, event.clientX / width)),
      y: Math.min(1, Math.max(0, event.clientY / height)),
      confidence: 1,
    };
  }

  /**
   * @param {KeyboardEvent} event
   */
  function onKeyDown(event) {
    const delta = keyDelta(event.key);
    if (!delta) return;

    const origin = keys ?? pointer ?? { x: 0.5, y: 0.5, confidence: 1 };
    keys = {
      x: clamp01(origin.x + delta.x),
      y: clamp01(origin.y + delta.y),
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
        if (cameraStatus !== "prompt") return;
        permission = state;
        if (state === "denied") {
          cameraStatus = "denied";
          cameraMessage = CAMERA_COPY.denied;
        } else if (state === "granted") {
          cameraMessage = CAMERA_COPY.granted;
        }
      })
      .catch(() => {
        // A failed peek must not change the allow-camera prompt.
      });
  }

  async function startCamera() {
    if (cameraStatus === "pending" || cameraStatus === "loading" || cameraStatus === "ready") {
      return;
    }

    cameraStatus = "pending";
    cameraMessage = CAMERA_COPY.pending;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        cameraStatus = "unavailable";
        cameraMessage = "This browser context has no camera API. The pointer still steers.";
        return;
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      const el = ensureVideo();
      el.srcObject = stream;
      el.muted = true;
      el.playsInline = true;
      el.classList.add("is-live");
      await el.play();

      cameraStatus = "loading";
      cameraMessage = CAMERA_COPY.loading;

      try {
        landmarker = await loadPoseLandmarker();
        lastDetectAt = 0;
        cameraStatus = "ready";
        cameraMessage = CAMERA_COPY.ready;
        permission = "granted";
      } catch {
        cameraStatus = "error";
        cameraMessage = "Camera is on, but the pose model failed to load. The pointer still works.";
      }
    } catch (error) {
      stopStream();
      const classified = classifyCameraError(error);
      cameraStatus = classified.status;
      cameraMessage = classified.message;
      if (classified.status === "denied") permission = "denied";
    }
  }

  /** @returns {PoseSample} */
  function sample() {
    const timestamp = performance.now();
    refreshWebcamJoints(timestamp);

    if (webcamJoints && Object.keys(webcamJoints).length > 0) {
      return {
        source: WEBCAM_SOURCE,
        joints: webcamJoints,
        timestamp,
      };
    }

    if (pointer) {
      return {
        source: MOUSE_SOURCE,
        joints: { pointer: { ...pointer } },
        timestamp,
      };
    }

    if (keys) {
      return {
        source: KEYBOARD_SOURCE,
        joints: { pointer: { ...keys } },
        timestamp,
      };
    }

    return { source: IDLE_SOURCE, joints: {}, timestamp };
  }

  function getStatus() {
    return {
      camera: cameraStatus,
      message: cameraMessage,
      cameraMessage,
      permission,
      jointCount: webcamJoints ? Object.keys(webcamJoints).length : 0,
    };
  }

  function dispose() {
    target.removeEventListener("pointermove", onPointer);
    target.removeEventListener("pointerdown", onPointer);
    target.removeEventListener("keydown", onKeyDown);
    stopStream();
    try {
      landmarker?.close?.();
    } catch {
      // ignore
    }
    landmarker = null;
  }

  /**
   * @param {number} now
   */
  function refreshWebcamJoints(now) {
    if (cameraStatus !== "ready" || !landmarker || !videoEl) return;
    if (videoEl.readyState < 2 || videoEl.videoWidth < 16) return;
    if (now - lastDetectAt < 33) return;

    try {
      const result = landmarker.detectForVideo(videoEl, Math.floor(now));
      lastDetectAt = now;
      const pose = result?.landmarks?.[0];
      if (pose?.length) {
        webcamJoints = landmarksToJoints(pose);
      }
    } catch {
      // A bad frame must not tear down the tick loop.
    }
  }

  function ensureVideo() {
    if (videoEl) return videoEl;
    videoEl = document.createElement("video");
    videoEl.setAttribute("playsinline", "");
    videoEl.muted = true;
    videoEl.autoplay = true;
    videoEl.className = "camera-feed";
    document.body.appendChild(videoEl);
    return videoEl;
  }

  function stopStream() {
    if (!stream) return;
    for (const track of stream.getTracks()) {
      track.stop();
    }
    stream = null;
    if (videoEl) {
      videoEl.srcObject = null;
      videoEl.classList.remove("is-live");
    }
  }

  return { sample, startCamera, getStatus, dispose };
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

async function loadPoseLandmarker() {
  const module = await import(`${TASKS_VISION}/vision_bundle.mjs`);
  const FilesetResolver = module.FilesetResolver;
  const PoseLandmarker = module.PoseLandmarker;
  if (!FilesetResolver || !PoseLandmarker) {
    throw new Error("MediaPipe PoseLandmarker export was missing.");
  }

  const vision = await FilesetResolver.forVisionTasks(`${TASKS_VISION}/wasm`);
  const options = {
    runningMode: "VIDEO",
    numPoses: 1,
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
