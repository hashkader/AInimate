/**
 * Bridges an IK drag gesture back onto the rig as editable pose parameters.
 *
 * This is the load-bearing product idea in miniature: dragging a hand does not
 * produce a baked image, it solves for two bone angles and writes them into the
 * pose. Everything downstream still sees plain, tweakable numbers.
 */

import { solveFK, type Pose, type Skeleton } from '../rig/bone';
import { solveTwoBoneIK, twoBoneIKToLocalAngles } from '../rig/ik';
import type { IKChain } from '../rig/character';
import { findBone } from '../rig/bone';
import type { Vec2 } from '../rig/math';

/**
 * Return a new pose in which `chain`'s tip reaches `target` (SVG/world coords),
 * by solving two-bone IK and writing the resulting local angles for the upper
 * and lower bones. All other bones are untouched.
 */
export function dragChainTo(skeleton: Skeleton, pose: Pose, chain: IKChain, target: Vec2): Pose {
  const world = solveFK(skeleton, pose);
  const originBone = world[chain.originBone];
  const upperDef = findBone(skeleton.root, chain.upper);
  const lowerDef = findBone(skeleton.root, chain.lower);
  if (!originBone || !upperDef || !lowerDef) return pose;

  // The chain's proximal joint is the origin bone's tip (shoulder/hip), and the
  // upper bone's parent world angle is the origin bone's world angle.
  const result = solveTwoBoneIK({
    origin: originBone.tip,
    l1: upperDef.length,
    l2: lowerDef.length,
    target,
    bend: chain.bend,
  });
  const locals = twoBoneIKToLocalAngles(result, originBone.worldAngle);

  return {
    ...pose,
    angles: {
      ...pose.angles,
      [chain.upper]: locals.upper,
      [chain.lower]: locals.lower,
    },
  };
}
