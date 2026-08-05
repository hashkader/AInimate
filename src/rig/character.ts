/**
 * A single hand-authored test character rig: a flat cutout puppet.
 *
 * This is placeholder "art" (bones drawn as capsules, head as a circle) — the
 * point of the walking skeleton is to validate that the rig + IK + timeline
 * *feel* right, not to look finished. The structure is a classic humanoid:
 *
 *     hips (pivot)
 *       torso -> head
 *              -> upperArmL -> forearmL
 *              -> upperArmR -> forearmR
 *       thighL -> shinL
 *       thighR -> shinR
 *
 * Coordinates are screen-space (y points DOWN), so "up" is angle -PI/2 and
 * "down" is +PI/2. Rest angles are authored as absolute world angles for
 * readability, then converted to the local (parent-relative) angles the pose
 * model uses.
 */

import { boneIds, type BoneDef, type Pose, type Skeleton } from './bone';
import { vec2 } from './math';

const UP = -Math.PI / 2;
const DOWN = Math.PI / 2;

export const characterSkeleton: Skeleton = {
  rootPosition: vec2(0, 0),
  root: {
    id: 'hips',
    length: 1, // near-zero pivot; torso and thighs both originate here
    children: [
      {
        id: 'torso',
        length: 120,
        children: [
          { id: 'head', length: 70 },
          { id: 'upperArmL', length: 70, children: [{ id: 'forearmL', length: 65 }] },
          { id: 'upperArmR', length: 70, children: [{ id: 'forearmR', length: 65 }] },
        ],
      },
      { id: 'thighL', length: 90, children: [{ id: 'shinL', length: 85 }] },
      { id: 'thighR', length: 90, children: [{ id: 'shinR', length: 85 }] },
    ],
  },
};

/** Desired absolute world angle (radians) of each bone in the rest pose. */
const restWorldAngles: Record<string, number> = {
  hips: 0,
  torso: UP,
  head: UP,
  upperArmR: DOWN - 0.35,
  forearmR: DOWN - 0.2,
  upperArmL: DOWN + 0.35,
  forearmL: DOWN + 0.2,
  thighR: DOWN - 0.12,
  shinR: DOWN - 0.05,
  thighL: DOWN + 0.12,
  shinL: DOWN + 0.05,
};

/** Parent id for each bone, derived once from the skeleton structure. */
function parentMap(def: BoneDef, parent: string | null = null): Record<string, string | null> {
  const map: Record<string, string | null> = { [def.id]: parent };
  for (const child of def.children ?? []) Object.assign(map, parentMap(child, def.id));
  return map;
}

/** Convert the authored world angles into a local-angle Pose. */
function buildRestPose(): Pose {
  const parents = parentMap(characterSkeleton.root);
  const angles: Record<string, number> = {};
  for (const id of boneIds(characterSkeleton.root)) {
    const world = restWorldAngles[id] ?? 0;
    const parent = parents[id];
    const parentWorld = parent ? (restWorldAngles[parent] ?? 0) : 0;
    angles[id] = world - parentWorld;
  }
  return { angles, rootPosition: characterSkeleton.rootPosition };
}

export const characterRestPose: Pose = buildRestPose();

/**
 * The limb chains that can be driven by two-bone IK. `origin` is the bone whose
 * *tip* is the chain's proximal joint (shoulder/hip); `upper` and `lower` are
 * the two bones the solver rotates; the lower bone's tip is the IK handle.
 */
export interface IKChain {
  readonly id: string;
  readonly label: string;
  readonly originBone: string;
  readonly upper: string;
  readonly lower: string;
  /** Which way the elbow/knee bends. See solveTwoBoneIK's `bend`. */
  readonly bend: 1 | -1;
}

export const characterIKChains: readonly IKChain[] = [
  { id: 'armL', label: 'Left arm', originBone: 'torso', upper: 'upperArmL', lower: 'forearmL', bend: 1 }, // prettier-ignore
  { id: 'armR', label: 'Right arm', originBone: 'torso', upper: 'upperArmR', lower: 'forearmR', bend: -1 }, // prettier-ignore
  { id: 'legL', label: 'Left leg', originBone: 'hips', upper: 'thighL', lower: 'shinL', bend: -1 },
  { id: 'legR', label: 'Right leg', originBone: 'hips', upper: 'thighR', lower: 'shinR', bend: 1 },
];

/** Purely visual description of a bone's cutout piece, for the renderer. */
export interface BoneVisual {
  readonly width: number;
  readonly color: string;
  /** Draw a circle centered on the bone's tip (used for the head). */
  readonly headRadius?: number;
}

export const characterVisuals: Record<string, BoneVisual> = {
  hips: { width: 0, color: 'transparent' },
  torso: { width: 60, color: '#5b8def' },
  head: { width: 8, color: '#f2c14e', headRadius: 42 },
  upperArmL: { width: 22, color: '#4a76d6' },
  forearmL: { width: 18, color: '#4a76d6' },
  upperArmR: { width: 22, color: '#4a76d6' },
  forearmR: { width: 18, color: '#4a76d6' },
  thighL: { width: 26, color: '#3a5cbf' },
  shinL: { width: 20, color: '#3a5cbf' },
  thighR: { width: 26, color: '#3a5cbf' },
  shinR: { width: 20, color: '#3a5cbf' },
};
