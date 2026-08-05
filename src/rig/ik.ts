/**
 * Inverse kinematics (IK).
 *
 * Forward kinematics asks "given these joint angles, where do the bones end
 * up?". Inverse kinematics asks the reverse: "what joint angles put the tip of
 * the chain at this target?". Dragging a hand and having the whole arm follow
 * is IK — and, crucially, the *result* is a set of bone angles: inspectable,
 * tweakable rig parameters, never a baked output.
 *
 * This is an analytic two-bone solver (law of cosines) for a limb like
 * upper-arm -> forearm. It is exact, deterministic, and cheap.
 */

import { angleOf, clamp, distance, fromAngle, add, type Vec2 } from './math';

export interface TwoBoneIKInput {
  /** World position of the chain's proximal joint (e.g. the shoulder). */
  readonly origin: Vec2;
  /** Length of the first (upper) bone. */
  readonly l1: number;
  /** Length of the second (lower) bone. */
  readonly l2: number;
  /** World position the chain tip should reach for. */
  readonly target: Vec2;
  /**
   * Which way the middle joint (elbow/knee) bends. +1 and -1 give the two
   * mirror solutions; keeping it fixed per-limb avoids the joint popping.
   */
  readonly bend: 1 | -1;
}

export interface TwoBoneIKResult {
  /** World angle of the upper bone. */
  readonly upperWorldAngle: number;
  /** World angle of the lower bone. */
  readonly lowerWorldAngle: number;
  /** World position of the middle joint (elbow/knee). */
  readonly joint: Vec2;
  /** Where the tip actually landed (== target unless out of reach). */
  readonly tip: Vec2;
  /** False when the target was farther than l1 + l2 (or closer than |l1-l2|). */
  readonly reached: boolean;
}

/**
 * Solve a two-bone chain so its tip reaches `target` as closely as possible.
 *
 * When the target is unreachable, the limb extends straight toward it (or folds
 * as far as it can), and `reached` is false — the same graceful behavior an
 * animator expects when dragging a hand past arm's length.
 */
export function solveTwoBoneIK(input: TwoBoneIKInput): TwoBoneIKResult {
  const { origin, l1, l2, target, bend } = input;

  const rawDist = distance(origin, target);
  const minReach = Math.abs(l1 - l2);
  const maxReach = l1 + l2;
  const reached = rawDist <= maxReach && rawDist >= minReach;

  // Clamp into the annulus the chain can physically reach.
  const d = clamp(rawDist, minReach, maxReach);
  const baseAngle = angleOf({ x: target.x - origin.x, y: target.y - origin.y });

  // Interior angle at the origin between (origin->target) and the upper bone,
  // via the law of cosines. Guard the ratio against tiny FP overshoot.
  const cosShoulder = d === 0 ? 1 : clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const shoulderOffset = Math.acos(cosShoulder);

  const upperWorldAngle = baseAngle + bend * shoulderOffset;
  const joint = add(origin, fromAngle(upperWorldAngle, l1));

  // The lower bone simply points from the resolved joint toward the target.
  const lowerWorldAngle = angleOf({ x: target.x - joint.x, y: target.y - joint.y });
  const tip = add(joint, fromAngle(lowerWorldAngle, l2));

  return { upperWorldAngle, lowerWorldAngle, joint, tip, reached };
}

/**
 * Convert a two-bone IK solution into the local pose angles for the two bones,
 * given the world angle of the upper bone's parent. Local angle = world angle
 * of the bone minus the world angle of its parent. This is what lets IK results
 * land straight back onto the rig as editable parameters.
 */
export function twoBoneIKToLocalAngles(
  result: TwoBoneIKResult,
  parentWorldAngle: number
): { upper: number; lower: number } {
  return {
    upper: result.upperWorldAngle - parentWorldAngle,
    lower: result.lowerWorldAngle - result.upperWorldAngle,
  };
}
