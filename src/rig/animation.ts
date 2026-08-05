/**
 * Keyframes + interpolation.
 *
 * An animation is a small set of keyframed poses on a frame timeline. Sampling
 * at an arbitrary frame blends the two surrounding keyframes (angles along the
 * shortest arc, root position component-wise), remapped through the earlier
 * keyframe's `easeOut` curve.
 *
 * Every value produced here is a plain Pose (bone angles + root position): the
 * timeline never bakes anything, it just evaluates parameters at a point in time.
 */

import { lerpAngle, lerpVec, clamp, type Vec2 } from './math';
import type { Pose } from './bone';

/**
 * Named easing curves for the segment leaving a keyframe. Each is a pure,
 * closed-form polynomial of `t` — no numerical cubic-bezier inversion.
 */
export type EasePreset = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

const easeFns: Record<EasePreset, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => 3 * t * t - 2 * t * t * t,
};

/** All ease presets, in a stable order — for populating UI pickers. */
export const EASE_PRESETS: readonly EasePreset[] = ['linear', 'easeIn', 'easeOut', 'easeInOut'];

/** Apply a named ease preset to a linear [0, 1] progress value. */
export function applyEase(preset: EasePreset, t: number): number {
  return easeFns[preset](t);
}

export interface Keyframe {
  readonly frame: number;
  readonly pose: Pose;
  /** The ease preset for the segment leaving this keyframe forward in time.
   * Stored but never read on the last keyframe, since no segment follows it. */
  readonly easeOut: EasePreset;
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
  return blendPoses(prev.pose, next.pose, applyEase(prev.easeOut, t));
}
