/**
 * Map getUserMedia / pose-loader failures into a readable camera status.
 * The tick loop must keep running when the camera is blocked.
 */

/**
 * @typedef {"prompt" | "pending" | "loading" | "ready" | "denied" | "unavailable" | "error"} CameraStatus
 */

/**
 * @typedef {object} CameraStatusInfo
 * @property {CameraStatus} status
 * @property {string} message
 */

/**
 * @param {unknown} error
 * @returns {CameraStatusInfo}
 */
export function classifyCameraError(error) {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return {
      status: "denied",
      message: CAMERA_COPY.denied,
    };
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
    return {
      status: "unavailable",
      message: CAMERA_COPY.unavailable,
    };
  }

  if (name === "SecurityError") {
    return {
      status: "unavailable",
      message: CAMERA_COPY.insecure,
    };
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      status: "error",
      message: CAMERA_COPY.busy,
    };
  }

  return {
    status: "error",
    message: CAMERA_COPY.error,
  };
}

export const CAMERA_COPY = {
  prompt:
    "Allow the camera to track your hands on-device. Nothing is uploaded. Pointer and keyboard still play if you skip.",
  granted: "Camera already allowed. Click Start camera to begin tracking, or Play to start the session.",
  pending: "Asking for the camera… look for the browser prompt at the top of the window.",
  loading: "Camera on. Loading the pose model…",
  ready: "Camera live. Reach for the glowing orb with either hand.",
  denied:
    "Camera blocked. Use the pointer or keyboard, or allow the camera in the browser settings and try again.",
  unavailable: "No camera found. The pointer and keyboard can still hit the orbs.",
  insecure: "Camera needs a secure context (HTTPS or localhost). The pointer and keyboard still work.",
  busy: "The camera is busy in another app. Close it, or use the pointer or keyboard.",
  error: "Camera failed to start. The pointer and keyboard can still hit the orbs.",
};

/**
 * Best-effort Permissions API peek so a returning visitor sees granted/denied
 * copy before they click. Unknown when the browser will not say.
 *
 * @param {(desc: { name: string }) => Promise<{ state?: string }>} [query]
 * @returns {Promise<"granted" | "denied" | "prompt" | "unknown">}
 */
export async function peekCameraPermission(query) {
  const run =
    query ??
    (typeof navigator !== "undefined"
      ? navigator.permissions?.query?.bind(navigator.permissions)
      : undefined);
  if (!run) return "unknown";

  try {
    const result = await run({ name: "camera" });
    const state = result?.state;
    if (state === "granted" || state === "denied" || state === "prompt") {
      return state;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}
