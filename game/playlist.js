/**
 * Saved session playlist + 1P/2P mode.
 * localStorage is enough for v1. 2P is two bodies in one webcam frame.
 */

import { posesFromSample } from "../input/poses.js";
import { GAME_COUNT, isMicrogameDef } from "./microgame.js";

export const PLAYLIST_KEY = "kinect-web-game:playlist";
export const PLAYLIST_VERSION = 1;

/**
 * @typedef {import("./microgame.js").MicrogameDef} MicrogameDef
 * @typedef {import("../input/poses.js").PoseSample} PoseSample
 */

/**
 * @typedef {object} PlaylistEntry
 * @property {string} id
 * @property {boolean} enabled
 */

/**
 * @typedef {object} PlaylistSettings
 * @property {number} version
 * @property {PlaylistEntry[]} games
 * @property {"1p" | "2p"} playerMode
 */

/**
 * @param {unknown} catalog
 * @returns {PlaylistSettings}
 */
export function defaultPlaylist(catalog) {
  return normalizePlaylist(null, catalog);
}

/**
 * Coerce a stored or in-progress playlist onto the shipped catalog.
 * Unknown ids drop. New shipped games append enabled. If every game is
 * off, all turn back on so a session can still start.
 *
 * @param {unknown} raw
 * @param {unknown} catalog
 * @returns {PlaylistSettings}
 */
export function normalizePlaylist(raw, catalog) {
  const defs = catalogDefs(catalog);
  const known = new Map(defs.map((def) => [def.id, def]));
  const saved = raw && typeof raw === "object" ? /** @type {Record<string, unknown>} */ (raw) : {};
  const listed = Array.isArray(saved.games) ? saved.games : [];
  /** @type {PlaylistEntry[]} */
  const games = [];
  const seen = new Set();

  for (const item of listed) {
    if (!item || typeof item !== "object") continue;
    const id = typeof item.id === "string" ? item.id : "";
    if (!id || !known.has(id) || seen.has(id)) continue;
    seen.add(id);
    games.push({ id, enabled: item.enabled !== false });
  }

  for (const def of defs) {
    if (seen.has(def.id)) continue;
    games.push({ id: def.id, enabled: true });
  }

  if (games.length > 0 && !games.some((entry) => entry.enabled)) {
    for (const entry of games) entry.enabled = true;
  }

  return {
    version: PLAYLIST_VERSION,
    games,
    playerMode: saved.playerMode === "1p" ? "1p" : "2p",
  };
}

/**
 * True when the game list differs from the shipped catalog order / enables.
 * Player mode is stored beside the list; it does not by itself count as a
 * custom playlist.
 *
 * @param {unknown} settings
 * @param {unknown} catalog
 */
export function playlistIsCustom(settings, catalog) {
  const normalized = normalizePlaylist(settings, catalog);
  const defs = catalogDefs(catalog);
  if (normalized.games.length !== defs.length) return true;
  return normalized.games.some((entry, index) => entry.id !== defs[index]?.id || !entry.enabled);
}

/**
 * Enabled shipped defs in playlist order. Empty enable-set falls back
 * to the full catalog so createGame always has a pack.
 *
 * @param {unknown} settings
 * @param {unknown} catalog
 * @returns {MicrogameDef[]}
 */
export function packFromPlaylist(settings, catalog) {
  const defs = catalogDefs(catalog);
  const byId = new Map(defs.map((def) => [def.id, def]));
  const normalized = normalizePlaylist(settings, catalog);
  const pack = normalized.games
    .filter((entry) => entry.enabled)
    .map((entry) => byId.get(entry.id))
    .filter((def) => Boolean(def));
  return pack.length > 0 ? pack : defs;
}

/**
 * Kid-length session: custom playlists keep order; a default list still
 * shuffles a short run from the full pack.
 *
 * @param {PlaylistSettings} settings
 * @param {unknown} catalog
 */
export function sessionOptionsFromPlaylist(settings, catalog) {
  const pack = packFromPlaylist(settings, catalog);
  const custom = playlistIsCustom(settings, catalog);
  return {
    pack,
    playerMode: settings.playerMode === "1p" ? "1p" : "2p",
    shuffle: !custom,
    games: Math.min(GAME_COUNT, Math.max(1, pack.length)),
  };
}

/**
 * @param {unknown} storage
 * @param {unknown} catalog
 * @returns {PlaylistSettings}
 */
export function loadPlaylist(storage, catalog) {
  let raw = null;
  try {
    const text = storage && typeof storage.getItem === "function" ? storage.getItem(PLAYLIST_KEY) : null;
    raw = text ? JSON.parse(text) : null;
  } catch {
    raw = null;
  }
  return normalizePlaylist(raw, catalog);
}

/**
 * @param {unknown} storage
 * @param {unknown} settings
 * @param {unknown} catalog
 * @returns {PlaylistSettings}
 */
export function savePlaylist(storage, settings, catalog) {
  const normalized = normalizePlaylist(settings, catalog);
  try {
    if (storage && typeof storage.setItem === "function") {
      storage.setItem(PLAYLIST_KEY, JSON.stringify(normalized));
    }
  } catch {
    // Private mode can throw. In-memory settings still apply.
  }
  return normalized;
}

/**
 * @param {PlaylistSettings} settings
 * @param {string} id
 * @param {number} direction -1 up, +1 down
 * @returns {PlaylistSettings}
 */
export function movePlaylistGame(settings, id, direction) {
  const next = cloneSettings(settings);
  const index = next.games.findIndex((entry) => entry.id === id);
  if (index < 0) return next;
  const swap = index + (direction < 0 ? -1 : 1);
  if (swap < 0 || swap >= next.games.length) return next;
  const held = next.games[index];
  next.games[index] = next.games[swap];
  next.games[swap] = held;
  return next;
}

/**
 * @param {PlaylistSettings} settings
 * @param {string} id
 * @param {boolean} enabled
 * @returns {PlaylistSettings}
 */
export function setPlaylistEnabled(settings, id, enabled) {
  return {
    version: PLAYLIST_VERSION,
    playerMode: settings.playerMode === "1p" ? "1p" : "2p",
    games: settings.games.map((entry) =>
      entry.id === id ? { id: entry.id, enabled: Boolean(enabled) } : { ...entry },
    ),
  };
}

/**
 * @param {PlaylistSettings} settings
 * @param {"1p" | "2p" | string} playerMode
 * @returns {PlaylistSettings}
 */
export function setPlayerMode(settings, playerMode) {
  return {
    version: PLAYLIST_VERSION,
    playerMode: playerMode === "1p" ? "1p" : "2p",
    games: settings.games.map((entry) => ({ ...entry })),
  };
}

/**
 * 1P keeps the first pose map only. 2P is two bodies in one frame.
 *
 * @param {PoseSample | { poses?: unknown, joints?: unknown, source?: string } | null | undefined} sample
 * @param {"1p" | "2p" | string} playerMode
 */
export function clipSampleForMode(sample, playerMode) {
  if (playerMode !== "1p" || !sample) return sample;
  const poses = posesFromSample(sample).slice(0, 1);
  return { ...sample, poses };
}

/**
 * @param {unknown} catalog
 * @returns {MicrogameDef[]}
 */
function catalogDefs(catalog) {
  return Array.isArray(catalog) ? catalog.filter(isMicrogameDef) : [];
}

/**
 * @param {PlaylistSettings} settings
 * @returns {PlaylistSettings}
 */
function cloneSettings(settings) {
  return {
    version: PLAYLIST_VERSION,
    playerMode: settings.playerMode === "1p" ? "1p" : "2p",
    games: settings.games.map((entry) => ({ id: entry.id, enabled: Boolean(entry.enabled) })),
  };
}
