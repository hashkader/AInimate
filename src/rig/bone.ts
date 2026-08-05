/**
 * Bone hierarchy + forward kinematics (FK).
 *
 * A skeleton is a tree of bones. Each bone is a rigid segment: it starts at a
 * proximal joint (`origin`), and extends `length` units along its world angle
 * to a distal endpoint (`tip`). A child bone's origin sits at its parent's tip.
 *
 * The *structure* (ids, lengths, parenting) is fixed rig data. The *pose*
 * (a local rotation angle per bone, plus a root world position) is the
 * animatable state — exactly the kind of inspectable, tweakable parameter the
 * product philosophy requires. FK turns a pose into concrete world positions.
 */

import { add, fromAngle, vec2, type Vec2 } from './math';

/** Fixed structural definition of a bone and its children. */
export interface BoneDef {
  readonly id: string;
  /** Segment length from this bone's origin to its tip. */
  readonly length: number;
  readonly children?: readonly BoneDef[];
}

export interface Skeleton {
  readonly root: BoneDef;
  /** Default world position of the root bone's origin. */
  readonly rootPosition: Vec2;
}

/**
 * The animatable state of a skeleton: one local rotation angle (radians,
 * relative to the parent bone's world angle) per bone id, plus an optional
 * override for where the root origin sits in the world.
 */
export interface Pose {
  readonly angles: Readonly<Record<string, number>>;
  readonly rootPosition?: Vec2;
}

/** The FK-resolved world transform of a single bone. */
export interface BoneWorld {
  readonly id: string;
  /** Proximal joint (this bone's origin) in world space. */
  readonly origin: Vec2;
  /** Distal endpoint in world space. */
  readonly tip: Vec2;
  /** Absolute world angle of the segment, in radians. */
  readonly worldAngle: number;
  readonly length: number;
}

export type PoseSolution = Readonly<Record<string, BoneWorld>>;

/** Depth-first list of every bone id in the skeleton, parents before children. */
export function boneIds(def: BoneDef): string[] {
  const ids: string[] = [def.id];
  for (const child of def.children ?? []) ids.push(...boneIds(child));
  return ids;
}

/** Find a bone definition by id, or undefined if absent. */
export function findBone(def: BoneDef, id: string): BoneDef | undefined {
  if (def.id === id) return def;
  for (const child of def.children ?? []) {
    const found = findBone(child, id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Resolve a pose into world transforms for every bone via forward kinematics.
 *
 * Missing angles default to 0 (bone aligned with its parent). The root's world
 * angle is simply its own local angle; each child's world angle is its parent's
 * world angle plus its own local angle.
 */
export function solveFK(skeleton: Skeleton, pose: Pose): PoseSolution {
  const out: Record<string, BoneWorld> = {};
  const rootOrigin = pose.rootPosition ?? skeleton.rootPosition;

  const walk = (def: BoneDef, origin: Vec2, parentWorldAngle: number): void => {
    const localAngle = pose.angles[def.id] ?? 0;
    const worldAngle = parentWorldAngle + localAngle;
    const tip = add(origin, fromAngle(worldAngle, def.length));

    out[def.id] = { id: def.id, origin, tip, worldAngle, length: def.length };

    for (const child of def.children ?? []) {
      // Children hang off this bone's tip and inherit its world angle.
      walk(child, tip, worldAngle);
    }
  };

  walk(skeleton.root, rootOrigin, 0);
  return out;
}

/** Convenience: a zeroed pose (every bone at local angle 0). */
export function restPose(skeleton: Skeleton): Pose {
  const angles: Record<string, number> = {};
  for (const id of boneIds(skeleton.root)) angles[id] = 0;
  return { angles, rootPosition: skeleton.rootPosition ?? vec2(0, 0) };
}
