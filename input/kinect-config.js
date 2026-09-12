/**
 * Resolve which Kinectron host to talk to from the page URL.
 * Webcam stays the default; Kinect is opt-in on HTTPS Pages and
 * auto-probed on local HTTP so a running host is picked up.
 */

export const DEFAULT_KINECT_HOST = "127.0.0.1";
export const DEFAULT_KINECT_PORT = 9001;

/**
 * @typedef {object} KinectConfig
 * @property {string} host
 * @property {number} port
 * @property {boolean} secure
 * @property {boolean} auto Connect on load when a host is likely reachable.
 * @property {boolean} disabled Force the webcam / pointer path only.
 */

/**
 * @param {string} [search] location.search
 * @param {{ protocol?: string }} [options]
 * @returns {KinectConfig}
 */
export function parseKinectConfig(search = "", { protocol = "http:" } = {}) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const input = (params.get("input") || "").toLowerCase();
  const raw = params.has("kinect") ? params.get("kinect") ?? "" : null;
  const kinectRequested = raw !== null && raw !== "0" && raw !== "false";

  /** @type {KinectConfig} */
  const config = {
    host: DEFAULT_KINECT_HOST,
    port: DEFAULT_KINECT_PORT,
    secure: false,
    auto: protocol === "http:" || kinectRequested || input === "kinect",
    disabled: input === "webcam" || input === "mouse" || raw === "0" || raw === "false",
  };

  if (input === "kinect") {
    config.auto = true;
    config.disabled = false;
  }

  if (raw && raw !== "1" && raw !== "true" && raw !== "0" && raw !== "false") {
    applyHostSpec(config, raw);
    config.auto = true;
    config.disabled = false;
  }

  if (params.get("secure") === "1" || params.get("secure") === "true") {
    config.secure = true;
  }

  if (looksSecureHost(config.host)) {
    config.secure = true;
  }

  if (config.disabled) {
    config.auto = false;
  }

  return config;
}

/**
 * @param {KinectConfig} config
 * @param {string} spec
 */
function applyHostSpec(config, spec) {
  const trimmed = spec.trim();
  if (!trimmed) return;

  if (trimmed.includes("://")) {
    try {
      const url = new URL(trimmed);
      config.host = url.hostname;
      if (url.port) config.port = Number(url.port) || config.port;
      config.secure = url.protocol === "https:";
      return;
    } catch {
      // fall through and treat as a bare host
    }
  }

  const ipv6 = trimmed.match(/^\[([^\]]+)\](?::(\d+))?$/);
  if (ipv6) {
    config.host = ipv6[1];
    if (ipv6[2]) config.port = Number(ipv6[2]) || config.port;
    return;
  }

  const colon = trimmed.lastIndexOf(":");
  if (colon > 0 && /^\d+$/.test(trimmed.slice(colon + 1)) && !trimmed.includes("::")) {
    config.host = trimmed.slice(0, colon);
    config.port = Number(trimmed.slice(colon + 1)) || config.port;
    return;
  }

  config.host = trimmed.replace(/\/$/, "");
}

/**
 * @param {string} host
 */
function looksSecureHost(host) {
  return /ngrok/i.test(host) || /\.app$/i.test(host);
}

/**
 * Kinectron's processPeerConfig treats an ngrok string specially
 * (port 443, secure). Local IPs stay a config object.
 *
 * @param {KinectConfig} config
 */
export function kinectronConstructorArg(config) {
  if (/ngrok/i.test(config.host)) {
    return config.host;
  }

  return {
    host: config.host,
    port: config.secure && config.port === DEFAULT_KINECT_PORT ? 443 : config.port,
    path: "/",
    secure: config.secure,
  };
}

export const KINECT_COPY = {
  idle: "A Kinectron host on this machine can drive the same joints as the camera.",
  connecting: "Looking for Kinectron…",
  ready: "Kinectron connected. Waiting for a tracked body…",
  live: "Kinect live. Reach for the glowing orb — same joints as the camera.",
  missing:
    "No Kinectron host at this address. Webcam and pointer still work. See the README to run the host app.",
  mixed:
    "A local Kinectron host is HTTP. Open this game at http://localhost:8080, or pass an https ngrok host as ?kinect=.",
  error: "Kinectron failed to connect. Webcam and pointer still work.",
};
