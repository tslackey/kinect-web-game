import { kinectronConstructorArg, parseKinectConfig } from "./kinect-config.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const local = parseKinectConfig("", { protocol: "http:" });
assert(local.host === "127.0.0.1", "default host is loopback");
assert(local.port === 9001, "default Kinectron port is 9001");
assert(local.auto === true, "local HTTP should auto-probe Kinectron");
assert(local.disabled === false, "local HTTP should allow Kinect");
assert(local.secure === false, "loopback is not secure");

const pages = parseKinectConfig("", { protocol: "https:" });
assert(pages.auto === false, "GitHub Pages should not probe a local HTTP host");
assert(pages.disabled === false, "Connect Kinect should still be available on Pages");

const forced = parseKinectConfig("?kinect", { protocol: "https:" });
assert(forced.auto === true, "?kinect on HTTPS should try the default host");

const lan = parseKinectConfig("?kinect=192.168.1.20", { protocol: "https:" });
assert(lan.host === "192.168.1.20", "kinect=IP should set the host");
assert(lan.auto === true, "an explicit host should auto-connect");

const ported = parseKinectConfig("?kinect=10.0.0.5:9100");
assert(ported.host === "10.0.0.5", "host:port should split the host");
assert(ported.port === 9100, "host:port should split the port");

const ngrok = parseKinectConfig("?kinect=demo.ngrok-free.app", { protocol: "https:" });
assert(ngrok.host === "demo.ngrok-free.app", "ngrok host should pass through");
assert(ngrok.secure === true, "ngrok hosts must use a secure peer connection");

const url = parseKinectConfig("?kinect=https://tunnel.example.com:8443");
assert(url.host === "tunnel.example.com", "full URLs should parse the hostname");
assert(url.secure === true, "https URLs should set secure");
assert(url.port === 8443, "https URLs should keep a non-default port");

const ngrokArg = kinectronConstructorArg(ngrok);
assert(ngrokArg === "demo.ngrok-free.app", "ngrok should be passed as a host string");

const localArg = kinectronConstructorArg(local);
assert(localArg.host === "127.0.0.1", "loopback should stay a config object");
assert(localArg.port === 9001, "loopback should keep the Kinectron port");
assert(localArg.secure === false, "loopback should not force TLS");

const webcamOnly = parseKinectConfig("?input=webcam", { protocol: "http:" });
assert(webcamOnly.disabled === true, "input=webcam should skip Kinect");
assert(webcamOnly.auto === false, "input=webcam should not auto-connect");

const off = parseKinectConfig("?kinect=0", { protocol: "http:" });
assert(off.disabled === true, "kinect=0 should skip the adapter");

console.log("input/kinect-config.test.mjs passed");
