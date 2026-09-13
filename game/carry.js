/**
 * Sticky-carry ownership with two-hand offer / one-hand accept (#56).
 * First grab still uses hover dwell. A held item follows one striker.
 *
 * Offer: the owner's second hand on the item latches an offered state.
 * Accept: another hand on the offered item takes it — other body any
 * contact, or same body after that hand leaves and re-grabs. Without an
 * offer, a non-owner cannot steal. Same-body swap is this rule, not a
 * second verb. Future passables (hot potato #39) can reuse this helper.
 */

import { HIT_RADIUS } from "./hit.js";

/** Seconds the offer stays live after the second owner hand leaves. */
export const OFFER_HOLD = 0.8;

/**
 * @typedef {import("./hit.js").IdentifiedStriker} IdentifiedStriker
 */

/**
 * @typedef {object} StickyCarryView
 * @property {string | null} heldBy
 * @property {boolean} offered
 * @property {number} x
 * @property {number} y
 */

/**
 * @param {{ pickupDwell?: number, radius?: number, offerHold?: number }} [options]
 */
export function createStickyCarry({
  pickupDwell = 0.4,
  radius = HIT_RADIUS,
  offerHold = OFFER_HOLD,
} = {}) {
  const dwell = Number.isFinite(pickupDwell) && pickupDwell > 0 ? pickupDwell : 0.4;
  const zone = Number.isFinite(radius) && radius > 0 ? radius : HIT_RADIUS;
  const hold = Number.isFinite(offerHold) && offerHold > 0 ? offerHold : OFFER_HOLD;

  /** @type {string | null} */
  let heldBy = null;
  let offered = false;
  let grace = 0;
  let locked = false;
  /** @type {Set<string>} */
  let seenOnOffer = new Set();
  /** @type {Map<string, number>} */
  const hover = new Map();
  let x = 0;
  let y = 0;

  /**
   * @param {{ x?: number, y?: number }} [origin]
   */
  function reset(origin = { x: 0, y: 0 }) {
    heldBy = null;
    offered = false;
    grace = 0;
    locked = false;
    seenOnOffer = new Set();
    hover.clear();
    x = Number.isFinite(origin.x) ? origin.x : 0;
    y = Number.isFinite(origin.y) ? origin.y : 0;
  }

  /**
   * @param {IdentifiedStriker[]} strikers
   * @param {number} step
   * @returns {StickyCarryView}
   */
  function tick(strikers, step) {
    const dt = Number.isFinite(step) ? Math.max(0, step) : 0;
    const hands = Array.isArray(strikers) ? strikers : [];

    if (!heldBy) {
      offered = false;
      grace = 0;
      locked = false;
      seenOnOffer = new Set();
      updateHover(hands, dt);
      const attached = hands.find((striker) => (hover.get(striker.id) ?? 0) >= dwell);
      if (attached) {
        heldBy = attached.id;
        x = attached.x;
        y = attached.y;
        hover.clear();
      }
      return snapshot();
    }

    const holder = hands.find((striker) => striker.id === heldBy);
    if (holder) {
      x = holder.x;
      y = holder.y;
    }

    const item = { x, y };
    const ownerPose = holder?.poseId ?? poseIdOf(heldBy);
    const onItem = hands.filter((striker) => overlapsCarry(striker, item, zone));
    const ownerOn = onItem.filter((striker) => striker.poseId === ownerPose);

    if (ownerOn.length < 2) {
      locked = false;
    }

    if (!offered) {
      if (ownerOn.length >= 2 && !locked) {
        offered = true;
        grace = hold;
        seenOnOffer = new Set(onItem.map((striker) => striker.id));
      }
      return snapshot();
    }

    forgetDeparted(onItem);
    const acceptor = pickAcceptor(onItem, ownerPose);
    if (acceptor) {
      heldBy = acceptor.id;
      x = acceptor.x;
      y = acceptor.y;
      offered = false;
      grace = 0;
      locked = true;
      seenOnOffer = new Set();
      return snapshot();
    }

    if (ownerOn.length >= 2) {
      grace = hold;
    } else {
      grace -= dt;
      if (grace <= 0) {
        offered = false;
        seenOnOffer = new Set();
      }
    }

    return snapshot();
  }

  /**
   * @param {IdentifiedStriker[]} onItem
   * @param {string} ownerPose
   */
  function pickAcceptor(onItem, ownerPose) {
    const eligible = onItem.filter((striker) => {
      if (striker.id === heldBy) return false;
      if (striker.poseId !== ownerPose) return true;
      return !seenOnOffer.has(striker.id);
    });
    return eligible.find((striker) => striker.poseId !== ownerPose) ?? eligible[0] ?? null;
  }

  /**
   * @param {IdentifiedStriker[]} onItem
   */
  function forgetDeparted(onItem) {
    const present = new Set(onItem.map((striker) => striker.id));
    for (const id of [...seenOnOffer]) {
      if (!present.has(id)) seenOnOffer.delete(id);
    }
  }

  /**
   * @param {IdentifiedStriker[]} hands
   * @param {number} dt
   */
  function updateHover(hands, dt) {
    const seen = new Set();
    for (const striker of hands) {
      seen.add(striker.id);
      const over = overlapsCarry(striker, { x, y }, zone);
      hover.set(striker.id, over ? (hover.get(striker.id) ?? 0) + dt : 0);
    }
    for (const id of hover.keys()) {
      if (!seen.has(id)) hover.set(id, 0);
    }
  }

  function snapshot() {
    return { heldBy, offered, x, y };
  }

  return {
    reset,
    tick,
    get heldBy() {
      return heldBy;
    },
    get offered() {
      return offered;
    },
  };
}

/**
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 * @param {number} [radius]
 */
export function overlapsCarry(a, b, radius = HIT_RADIUS) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= radius;
}

/**
 * @param {string} strikerId
 */
function poseIdOf(strikerId) {
  const i = String(strikerId).indexOf(":");
  return i === -1 ? strikerId : strikerId.slice(0, i);
}
