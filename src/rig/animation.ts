/**
 * Keyframes + interpolation.
 *
 * An animation is a small set of keyframed poses on a frame timeline. Sampling
 * at an arbitrary frame blends the two surrounding keyframes. This first version
 * is linear interpolation (angles along the shortest arc, root position
 * component-wise) — no easing curves yet, by design.
 *
 * Every value produced here is a plain Pose (bone angles + root position): the
 * timeline never bakes anything, it just evaluates parameters at a point in time.
 */

import { lerpAngle, lerpVec, clamp, type Vec2 } from './math';
import type { Pose } from './bone';

export interface Keyframe {
  readonly frame: number;
  readonly pose: Pose;
}

export interface Animation {
  /** Keyframes in arbitrary order; sampling sorts defensively. */
  readonly keyframes: readonly Keyframe[];
}

function sortedFrames(animation: Animation): Keyframe[] {
  return [...animation.keyframes].sort((a, b) => a.frame - b.frame);
}

/** The inclusive [first, last] keyframe frame numbers, or null if empty. */
export function frameRange(animation: Animation): { start: number; end: number } | null {
  const frames = sortedFrames(animation);
  if (frames.length === 0) return null;
  return { start: frames[0]!.frame, end: frames[frames.length - 1]!.frame };
}

function blendPoses(a: Pose, b: Pose, t: number): Pose {
  const angles: Record<string, number> = {};
  const ids = new Set([...Object.keys(a.angles), ...Object.keys(b.angles)]);
  for (const id of ids) {
    const av = a.angles[id];
    const bv = b.angles[id];
    if (av !== undefined && bv !== undefined) {
      angles[id] = lerpAngle(av, bv, t);
    } else {
      // Present in only one keyframe: hold that value across the segment.
      angles[id] = (av ?? bv)!;
    }
  }

  let rootPosition: Vec2 | undefined;
  if (a.rootPosition && b.rootPosition) {
    rootPosition = lerpVec(a.rootPosition, b.rootPosition, t);
  } else {
    rootPosition = a.rootPosition ?? b.rootPosition;
  }

  return rootPosition ? { angles, rootPosition } : { angles };
}

/**
 * Sample the animation at `frame`, returning the interpolated pose.
 *
 * Frames before the first keyframe clamp to it; frames after the last clamp to
 * it (hold). Between two keyframes, blend linearly by the fractional position.
 */
export function sampleAnimation(animation: Animation, frame: number): Pose {
  const frames = sortedFrames(animation);
  if (frames.length === 0) return { angles: {} };
  if (frames.length === 1) return frames[0]!.pose;

  const first = frames[0]!;
  const last = frames[frames.length - 1]!;
  if (frame <= first.frame) return first.pose;
  if (frame >= last.frame) return last.pose;

  // Find the segment [prev, next] that contains `frame`.
  let prev = first;
  let next = last;
  for (let i = 0; i < frames.length - 1; i++) {
    const lo = frames[i]!;
    const hi = frames[i + 1]!;
    if (frame >= lo.frame && frame <= hi.frame) {
      prev = lo;
      next = hi;
      break;
    }
  }

  const span = next.frame - prev.frame;
  const t = span === 0 ? 0 : clamp((frame - prev.frame) / span, 0, 1);
  return blendPoses(prev.pose, next.pose, t);
}
