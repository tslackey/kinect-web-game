/**
 * Mirror me (#38): P2 copies P1 wrist pose for ~0.5s.
 * Prompt `Copy!`. Two bodies in one cam. Solo fallback matches a
 * ghost (same anchors as Strike a pose). Pointer stands in only when
 * no camera body is in the sample.
 */

import { defineMicrogame, PLAY_DURATION } from "./microgame.js";
import { HIT_RADIUS, listIdentifiedStrikers } from "./hit.js";
import { posesFromSample } from "../input/poses.js";
import { createTimedPlay } from "./timed.js";
import { LAYOUT_COOP } from "./layout.js";

export const MIRROR_DURATION = PLAY_DURATION;
/** Hold the match (or ghost anchors) this long. */
export const MIRROR_DWELL = 0.5;

const LEFT_ANCHOR = { x: 0.24, y: 0.38 };
const RIGHT_ANCHOR = { x: 0.76, y: 0.38 };

/**
 * @typedef {import("../input/index.js").Joint} Joint
 * @typedef {import("../input/poses.js").PoseMap} PoseMap
 */

/**
 * @typedef {object} MirrorScene
 * @property {"mirror-me"} kind
 * @property {"duo" | "solo"} mode
 * @property {{ x: number, y: number, held: boolean }} left
 * @property {{ x: number, y: number, held: boolean }} right
 * @property {boolean} matched
 */

export const MIRROR_ME = defineMicrogame({
  id: "mirror-me",
  prompt: "Copy!",
  backgroundId: "mirror",
  layout: LAYOUT_COOP,
  duration: MIRROR_DURATION,
  create({ duration }) {
    const lifetime = Number.isFinite(duration) && duration > 0 ? duration : MIRROR_DURATION;
    let matchHeld = 0;
    let leftHeld = 0;
    let rightHeld = 0;
    let leftSticky = false;
    let rightSticky = false;
    let mode = /** @type {"duo" | "solo"} */ ("solo");
    let matched = false;
    let leftMark = { ...LEFT_ANCHOR };
    let rightMark = { ...RIGHT_ANCHOR };

    return createTimedPlay({
      lifetime,
      reset() {
        matchHeld = 0;
        leftHeld = 0;
        rightHeld = 0;
        leftSticky = false;
        rightSticky = false;
        mode = "solo";
        matched = false;
        leftMark = { ...LEFT_ANCHOR };
        rightMark = { ...RIGHT_ANCHOR };
      },
      step(dt, sample) {
        const poses = posesFromSample(sample);
        if (poses.length >= 2) {
          mode = "duo";
          return stepDuo(dt, poses);
        }
        mode = "solo";
        return stepSolo(dt, sample);
      },
      view() {
        return {
          target: { id: 1, x: leftMark.x, y: leftMark.y, vx: 0, vy: 0 },
          scene: {
            kind: "mirror-me",
            mode,
            left: { ...leftMark, held: matched || leftHeld > 0 || leftSticky },
            right: { ...rightMark, held: matched || rightHeld > 0 || rightSticky },
            matched,
          },
        };
      },
    });

    /**
     * @param {number} dt
     * @param {PoseMap[]} poses
     */
    function stepDuo(dt, poses) {
      const lead = poses[0];
      const copy = poses[1];
      const leadPair = worldWrists(lead.joints);
      leftMark = leadPair.left ?? { ...LEFT_ANCHOR };
      rightMark = leadPair.right ?? { ...RIGHT_ANCHOR };
      const copying = pairsMatch(lead.joints, copy.joints);
      if (copying) {
        matchHeld += dt;
        leftHeld = matchHeld;
        rightHeld = matchHeld;
      } else {
        matchHeld = 0;
        leftHeld = 0;
        rightHeld = 0;
      }
      matched = matchHeld >= MIRROR_DWELL;
      return matched ? "win" : "playing";
    }

    /**
     * Ghost fallback — same sequential pointer / both-wrists grammar as Strike a pose.
     *
     * @param {number} dt
     * @param {import("../input/poses.js").PoseSample} sample
     */
    function stepSolo(dt, sample) {
      leftMark = { ...LEFT_ANCHOR };
      rightMark = { ...RIGHT_ANCHOR };
      const strikers = listIdentifiedStrikers(sample);
      const onLeft = strikers.some((joint) => near(joint, LEFT_ANCHOR));
      const onRight = strikers.some((joint) => near(joint, RIGHT_ANCHOR));
      const wrists = strikers.filter((joint) => joint.name.endsWith("wrist"));
      const bothLive =
        wrists.some((joint) => near(joint, LEFT_ANCHOR)) &&
        wrists.some((joint) => near(joint, RIGHT_ANCHOR));

      if (bothLive) {
        leftHeld += dt;
        rightHeld += dt;
      } else {
        if (onLeft) {
          leftHeld += dt;
          if (leftHeld >= MIRROR_DWELL) leftSticky = true;
        } else if (!leftSticky) {
          leftHeld = 0;
        }
        if (onRight) {
          rightHeld += dt;
          if (rightHeld >= MIRROR_DWELL) rightSticky = true;
        } else if (!rightSticky) {
          rightHeld = 0;
        }
      }

      matched =
        (leftHeld >= MIRROR_DWELL && rightHeld >= MIRROR_DWELL) || (leftSticky && rightSticky);
      return matched ? "win" : "playing";
    }
  },
});

/**
 * Body-relative wrist pose so two people standing apart can still copy.
 *
 * @param {Record<string, Joint> | undefined} a
 * @param {Record<string, Joint> | undefined} b
 */
function pairsMatch(a, b) {
  const lead = relativeWrists(a);
  const copy = relativeWrists(b);
  if (!lead || !copy) return false;
  return near(lead.left, copy.left) && near(lead.right, copy.right);
}

/**
 * @param {Record<string, Joint> | undefined} joints
 */
function relativeWrists(joints) {
  const pair = worldWrists(joints);
  const origin = torsoOf(joints);
  if (!pair.left || !pair.right || !origin) return null;
  return {
    left: { x: pair.left.x - origin.x, y: pair.left.y - origin.y },
    right: { x: pair.right.x - origin.x, y: pair.right.y - origin.y },
  };
}

/**
 * @param {Record<string, Joint> | undefined} joints
 */
function worldWrists(joints) {
  if (!joints) return { left: null, right: null };
  const left = usable(joints.left_wrist) ? joints.left_wrist : usable(joints.pointer) ? joints.pointer : null;
  const right = usable(joints.right_wrist) ? joints.right_wrist : usable(joints.pointer) ? joints.pointer : null;
  return { left, right };
}

/**
 * @param {Record<string, Joint> | undefined} joints
 */
function torsoOf(joints) {
  if (!joints) return null;
  if (usable(joints.nose)) return joints.nose;
  if (usable(joints.left_shoulder) && usable(joints.right_shoulder)) {
    return {
      x: (joints.left_shoulder.x + joints.right_shoulder.x) / 2,
      y: (joints.left_shoulder.y + joints.right_shoulder.y) / 2,
    };
  }
  return null;
}

/**
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 */
function near(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= HIT_RADIUS;
}

/**
 * @param {Joint | null | undefined} joint
 */
function usable(joint) {
  return Boolean(joint && Number.isFinite(joint.x) && Number.isFinite(joint.y));
}
