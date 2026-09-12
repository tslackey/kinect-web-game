/**
 * Kinectron client adapter. Connects to a running host and stores the
 * latest body as the same joint map the webcam adapter emits.
 */

import { KINECT_COPY, kinectronConstructorArg, parseKinectConfig } from "./kinect-config.js";
import { kinectFrameToJoints } from "./kinect-joints.js";

const KINECTRON_ESM = "https://cdn.jsdelivr.net/npm/kinectron-client@1.0.1/dist/kinectron.esm.js";
const KINECTRON_V0 = "https://cdn.jsdelivr.net/gh/kinectron/kinectron@0.3.9/client/dist/kinectron-client.js";
const CONNECT_MS = 4000;
const STALE_MS = 1500;

/**
 * @typedef {"idle" | "connecting" | "ready" | "live" | "missing" | "error"} KinectStatus
 */

/**
 * @param {{
 *   search?: string,
 *   protocol?: string,
 *   loadClient?: (config: import("./kinect-config.js").KinectConfig) => Promise<unknown>,
 *   now?: () => number,
 *   connectMs?: number,
 *   probe?: boolean,
 * }} [options]
 */
export function createKinectAdapter({
  search = typeof window !== "undefined" ? window.location.search : "",
  protocol = typeof window !== "undefined" ? window.location.protocol : "https:",
  loadClient = defaultLoadKinectron,
  now = defaultNow,
  connectMs = CONNECT_MS,
  probe = true,
} = {}) {
  const config = parseKinectConfig(search, { protocol });

  /** @type {KinectStatus} */
  let status = "idle";
  let message = KINECT_COPY.idle;
  /** @type {Record<string, import("./index.js").Joint> | null} */
  let joints = null;
  let lastFrameAt = 0;
  /** @type {{ close?: Function, stopAll?: Function } | null} */
  let client = null;
  /** @type {Promise<void> | null} */
  let inflight = null;

  function isLive(at = now()) {
    return Boolean(joints && Object.keys(joints).length > 0 && at - lastFrameAt <= STALE_MS);
  }

  function getJoints(at = now()) {
    return isLive(at) ? joints : null;
  }

  function getStatus(at = now()) {
    const live = isLive(at);
    return {
      kinect: live ? "live" : status,
      message: live ? KINECT_COPY.live : message,
      host: `${config.host}:${config.port}`,
      jointCount: live && joints ? Object.keys(joints).length : 0,
    };
  }

  /**
   * Accept a Kinectron body frame (or a single body). Used by the live
   * client and by tests — same mapper either way.
   *
   * @param {unknown} frame
   */
  function ingest(frame) {
    const mapped = kinectFrameToJoints(frame);
    if (Object.keys(mapped).length === 0) return;
    joints = mapped;
    lastFrameAt = now();
    status = "live";
    message = KINECT_COPY.live;
  }

  async function start() {
    if (config.disabled) {
      status = "idle";
      message = KINECT_COPY.idle;
      return;
    }

    if (status === "connecting" && inflight) {
      return inflight;
    }

    if (status === "ready" || status === "live") {
      return;
    }

    if (protocol === "https:" && !config.secure && isLoopback(config.host)) {
      status = "error";
      message = KINECT_COPY.mixed;
      return;
    }

    if (probe && !(await hostLooksReachable(config))) {
      status = "missing";
      message = KINECT_COPY.missing;
      return;
    }

    status = "connecting";
    message = KINECT_COPY.connecting;
    inflight = connect().finally(() => {
      inflight = null;
    });
    return inflight;
  }

  async function connect() {
    try {
      const Kinectron = await loadClient(config);
      if (typeof Kinectron !== "function") {
        throw new Error("Kinectron client export was missing.");
      }

      const proto = Kinectron.prototype || {};
      const legacy = typeof proto.makeConnection === "function" && typeof proto.startBodies !== "function";
      const instance = new Kinectron(legacy ? config.host : kinectronConstructorArg(config));
      client = instance;
      await handshake(instance);
    } catch (error) {
      stopClient();
      const text = error instanceof Error ? error.message : "";
      if (text === "timeout" || /timeout|connect/i.test(text)) {
        status = "missing";
        message = KINECT_COPY.missing;
        return;
      }
      status = "error";
      message = KINECT_COPY.error;
    }
  }

  /**
   * @param {any} instance
   */
  function handshake(instance) {
    return new Promise((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        finish(() => reject(new Error("timeout")));
      }, connectMs);

      /**
       * @param {() => void} action
       */
      function finish(action) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        action();
      }

      function onReady() {
        startBodyFeed(instance);
        if (status !== "live") {
          status = "ready";
          message = KINECT_COPY.ready;
        }
        finish(resolve);
      }

      if (typeof instance.on === "function") {
        instance.on("ready", onReady);
        instance.on("error", () => finish(() => reject(new Error("connect"))));
      }

      if (instance.peer && typeof instance.peer.connect === "function") {
        instance.peer.connect();
      } else if (typeof instance.makeConnection === "function") {
        instance.makeConnection();
        startBodyFeed(instance);
        // Kinectron v0 has no ready event. The host is reachable once
        // makeConnection returns; bodies may arrive later.
        if (status !== "live") {
          status = "ready";
          message = KINECT_COPY.ready;
        }
        finish(resolve);
      } else if (typeof instance.on !== "function") {
        finish(() => reject(new Error("connect")));
        return;
      }

      tryInitKinect(instance);
    });
  }

  /**
   * @param {any} instance
   */
  function startBodyFeed(instance) {
    if (typeof instance.startBodies === "function") {
      instance.startBodies(ingest);
    } else if (typeof instance.startTrackedBodies === "function") {
      instance.startTrackedBodies((body) => ingest({ bodies: [body] }));
    }
  }

  /**
   * @param {any} instance
   */
  function tryInitKinect(instance) {
    if (typeof instance.initKinect !== "function") return;
    Promise.resolve()
      .then(() => instance.initKinect())
      .then(() => startBodyFeed(instance))
      .catch(() => {
        // Host may already have the sensor open; body frames can still arrive.
      });
  }

  function stop() {
    stopClient();
    joints = null;
    lastFrameAt = 0;
    status = "idle";
    message = KINECT_COPY.idle;
  }

  function stopClient() {
    try {
      client?.stopAll?.();
    } catch {
      // ignore
    }
    try {
      client?.close?.();
    } catch {
      // ignore
    }
    client = null;
  }

  return {
    config,
    start,
    stop,
    ingest,
    getJoints,
    getStatus,
    isLive,
  };
}

/**
 * @param {string} host
 */
function isLoopback(host) {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

/**
 * Cheap preflight so a missing local host does not load PeerJS.
 * Secure / ngrok hosts skip this and go through the Kinectron client.
 *
 * @param {import("./kinect-config.js").KinectConfig} config
 */
async function hostLooksReachable(config) {
  if (config.secure || typeof fetch !== "function") return true;
  const url = `http://${config.host}:${config.port}/`;
  try {
    await fetch(url, { mode: "no-cors", signal: AbortSignal.timeout(400) });
    return true;
  } catch {
    return false;
  }
}

function defaultNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * Prefer Kinectron 1.x (Azure). Fall back to the v0 script for Kinect v2 hosts.
 *
 * @param {import("./kinect-config.js").KinectConfig} config
 */
export async function defaultLoadKinectron(config) {
  try {
    const module = await import(/* @vite-ignore */ KINECTRON_ESM);
    return module.default || module.Kinectron;
  } catch {
    return loadKinectronV0(config);
  }
}

/**
 * @param {import("./kinect-config.js").KinectConfig} [_config]
 */
function loadKinectronV0(_config) {
  if (typeof document === "undefined") {
    throw new Error("Kinectron v0 client needs a browser.");
  }

  const existing = typeof window !== "undefined" ? window.Kinectron : null;
  if (typeof existing === "function") return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = KINECTRON_V0;
    script.async = true;
    script.onload = () => {
      const ctor = window.Kinectron;
      if (typeof ctor === "function") resolve(ctor);
      else reject(new Error("Kinectron v0 client export was missing."));
    };
    script.onerror = () => reject(new Error("connect"));
    document.head.appendChild(script);
  });
}
