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
      message: "Camera blocked. Allow it in the browser settings, or use the pointer to hit orbs.",
    };
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
    return {
      status: "unavailable",
      message: "No camera found. The pointer can still hit the orbs.",
    };
  }

  if (name === "SecurityError") {
    return {
      status: "unavailable",
      message: "Camera needs a secure context (HTTPS or localhost). The pointer still works.",
    };
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      status: "error",
      message: "The camera is busy in another app. Close it, or use the pointer.",
    };
  }

  return {
    status: "error",
      message: "Camera failed to start. The pointer can still hit the orbs.",
  };
}

export const CAMERA_COPY = {
  prompt: "Allow the camera to track your joints on-device. Nothing is uploaded.",
  pending: "Asking for the camera…",
  loading: "Camera on. Loading the pose model…",
  ready: "Camera live. Reach for the glowing orb with either hand.",
};
