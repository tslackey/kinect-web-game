import {
  DEFAULT_PACK,
  DUCK_BEAM,
  ORB_HIT,
  PLAYLIST_KEY,
  PROMPT_DURATION,
  clipSampleForMode,
  createGame,
  defaultPlaylist,
  loadPlaylist,
  movePlaylistGame,
  normalizePlaylist,
  packFromPlaylist,
  playlistIsCustom,
  savePlaylist,
  sessionOptionsFromPlaylist,
  setPlayerMode,
  setPlaylistEnabled,
} from "./index.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function memoryStorage(seed = {}) {
  const data = { ...seed };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    data,
  };
}

function cyclingRandom(values) {
  let i = 0;
  return () => {
    const value = values[i % values.length];
    i += 1;
    return value;
  };
}

function twoPoses(p1Joints, p2Joints) {
  return {
    source: "webcam",
    poses: [
      { id: "p1", source: "webcam", joints: p1Joints },
      { id: "p2", source: "webcam", joints: p2Joints },
    ],
    timestamp: 0,
  };
}

function drain(game, seconds, sample) {
  const idle = { source: "idle", poses: [], timestamp: 0 };
  const steps = Math.ceil(seconds / (1 / 60)) + 2;
  for (let i = 0; i < steps; i += 1) {
    game.tick(1 / 60, sample ?? idle);
  }
}

const fresh = defaultPlaylist(DEFAULT_PACK);
assert(fresh.playerMode === "2p", "default mode is two bodies in one frame");
assert(fresh.games.length === DEFAULT_PACK.length, "the editor lists every shipped game");
assert(fresh.games.every((entry) => entry.enabled), "a first visit enables the whole pack");
assert(playlistIsCustom(fresh, DEFAULT_PACK) === false, "the shipped order is not custom");

const moved = movePlaylistGame(fresh, "water-plant", 1);
assert(moved.games[0].id === "feed-pet", "down moves a game later in the list");
assert(moved.games[1].id === "water-plant", "the swapped neighbor takes its place");
assert(playlistIsCustom(moved, DEFAULT_PACK) === true, "reorder is a saved playlist");

const trimmed = setPlaylistEnabled(fresh, "orb-hit", false);
const pack = packFromPlaylist(trimmed, DEFAULT_PACK);
assert(!pack.some((def) => def.id === "orb-hit"), "disabled games drop out of the session pack");
assert(pack[0].id === "water-plant", "enabled games keep playlist order");

const onesie = setPlayerMode(fresh, "1p");
assert(onesie.playerMode === "1p", "the same menu stores 1P");
assert(playlistIsCustom(onesie, DEFAULT_PACK) === false, "1P alone does not rewrite the pack");

const storage = memoryStorage();
const saved = savePlaylist(storage, { ...moved, playerMode: "1p" }, DEFAULT_PACK);
assert(storage.data[PLAYLIST_KEY], "playlist writes localStorage");
assert(saved.playerMode === "1p", "save keeps the 1P flag");
const loaded = loadPlaylist(storage, DEFAULT_PACK);
assert(loaded.playerMode === "1p", "the next session reads the 1P flag");
assert(loaded.games[1].id === "water-plant", "the next session reads the saved order");
const nextPack = packFromPlaylist(loaded, DEFAULT_PACK);
assert(nextPack[0].id === "feed-pet", "the next session uses the saved playlist");

const junk = loadPlaylist(memoryStorage({ [PLAYLIST_KEY]: "{not-json" }), DEFAULT_PACK);
assert(junk.games.length === DEFAULT_PACK.length, "corrupt storage falls back to the shipped pack");
assert(junk.playerMode === "2p", "corrupt storage falls back to 2P");

const extra = normalizePlaylist(
  { playerMode: "2p", games: [{ id: "ghost-game", enabled: true }, { id: "duck-beam", enabled: true }] },
  DEFAULT_PACK,
);
assert(!extra.games.some((entry) => entry.id === "ghost-game"), "unknown ids are dropped");
assert(extra.games.some((entry) => entry.id === "duck-beam"), "known ids stay");
assert(extra.games.length === DEFAULT_PACK.length, "new shipped games append onto an old save");

const noneOn = normalizePlaylist(
  { playerMode: "2p", games: DEFAULT_PACK.map((def) => ({ id: def.id, enabled: false })) },
  DEFAULT_PACK,
);
assert(noneOn.games.every((entry) => entry.enabled), "an empty enable-set turns everything back on");

const options = sessionOptionsFromPlaylist(loaded, DEFAULT_PACK);
assert(options.shuffle === false, "a custom playlist keeps the saved order");
assert(options.playerMode === "1p", "session options carry the 1P flag");
assert(options.pack[0].id === "feed-pet", "session options use the saved pack");

const two = clipSampleForMode(
  twoPoses(
    { left_wrist: { x: 0.2, y: 0.2, confidence: 1 } },
    { right_wrist: { x: 0.8, y: 0.2, confidence: 1 } },
  ),
  "2p",
);
assert(two.poses.length === 2, "2P keeps both bodies from one webcam");
const one = clipSampleForMode(two, "1p");
assert(one.poses.length === 1, "1P keeps only the first body");
assert(one.poses[0].id === "p1", "1P is the first map, not a second camera");

const solo = createGame({
  random: cyclingRandom([0.2, 0.4, 0.1, 0.2, 0.7, 0.6]),
  pack: [ORB_HIT],
  playerMode: "1p",
});
assert(solo.getState().playerMode === "1p", "createGame stores the 1P flag");
solo.start();
drain(solo, PROMPT_DURATION);
const orb = solo.getState().target;
solo.tick(
  1 / 60,
  twoPoses(
    { left_wrist: { x: 0.05, y: 0.05, confidence: 1 } },
    { right_wrist: { x: orb.x, y: orb.y, confidence: 1 } },
  ),
);
assert(solo.getState().score === 0, "1P ignores a second body over the shared orb");
assert(solo.getState().markers.length === 1, "1P draws one marker");

const duo = createGame({
  random: cyclingRandom([0.2, 0.4, 0.1, 0.2, 0.7, 0.6]),
  pack: [ORB_HIT],
  playerMode: "2p",
});
duo.start();
drain(duo, PROMPT_DURATION);
const duoOrb = duo.getState().target;
duo.tick(
  1 / 60,
  twoPoses(
    { left_wrist: { x: 0.05, y: 0.05, confidence: 1 } },
    { right_wrist: { x: duoOrb.x, y: duoOrb.y, confidence: 1 } },
  ),
);
assert(duo.getState().score === 1, "2P still lets the second body score");

const gate = createGame({ pack: [ORB_HIT], games: 1, shuffle: false });
gate.configure({ pack: [DUCK_BEAM], playerMode: "1p", shuffle: false, games: 1 });
assert(gate.getState().playerMode === "1p", "configure stores 1P on the start gate");
assert(gate.getState().prompt === DUCK_BEAM.prompt, "configure applies the saved playlist");
gate.start();
assert(gate.getState().gameId === "duck-beam", "Play uses the configured playlist");
gate.configure({ pack: [ORB_HIT], playerMode: "2p" });
assert(gate.getState().gameId === "duck-beam", "configure is a no-op once play has started");
assert(gate.getState().playerMode === "1p", "live play keeps the session mode");

console.log("game/playlist.test.mjs passed");
