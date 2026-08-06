/**
 * Validation for LLM-generated animations (Phase 2 "Generate").
 *
 * An LLM authors keyframes directly in our own Pose/Animation schema (see
 * docs/adr/0002-llm-authored-keyframes-minimax.md) instead of a third-party
 * motion format. This module is the strict boundary that output must cross:
 * anything that doesn't fully conform is rejected with a descriptive error,
 * never best-effort repaired. It knows nothing about which LLM or provider
 * produced the raw data — callers (the server) own that.
 */

import { boneIds, type BoneDef, type Pose, type Skeleton } from './bone';
import { EASE_PRESETS, type Animation, type EasePreset, type Keyframe } from './animation';

export class GenerationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationValidationError';
  }
}

export interface GenerationCaps {
  readonly maxKeyframes: number;
  readonly maxFrame: number;
}

/** 12 keyframes over up to 10s at 24fps is generous for a single-prompt motion. */
export const DEFAULT_GENERATION_CAPS: GenerationCaps = { maxKeyframes: 12, maxFrame: 240 };

/** Angles beyond two full turns are almost certainly hallucinated garbage, not motion. */
const MAX_PLAUSIBLE_ANGLE = 4 * Math.PI;

function fail(message: string): never {
  throw new GenerationValidationError(message);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateAngles(
  raw: unknown,
  knownBoneIds: ReadonlySet<string>,
  frame: number
): Record<string, number> {
  if (raw === undefined) return {};
  if (!isPlainObject(raw)) {
    fail(`Keyframe at frame ${frame}: "angles" must be an object.`);
  }
  const angles: Record<string, number> = {};
  for (const [boneId, value] of Object.entries(raw)) {
    if (!knownBoneIds.has(boneId)) {
      fail(`Keyframe at frame ${frame}: unknown bone id "${boneId}" is not on this skeleton.`);
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      fail(`Keyframe at frame ${frame}: angle for "${boneId}" must be a finite number.`);
    }
    if (Math.abs(value) > MAX_PLAUSIBLE_ANGLE) {
      fail(`Keyframe at frame ${frame}: angle for "${boneId}" (${value}) is implausibly large.`);
    }
    angles[boneId] = value;
  }
  return angles;
}

function validateEaseOut(raw: unknown, frame: number): EasePreset {
  if (raw === undefined) return 'linear';
  if (typeof raw !== 'string' || !(EASE_PRESETS as readonly string[]).includes(raw)) {
    fail(
      `Keyframe at frame ${frame}: "easeOut" must be one of ${EASE_PRESETS.join(', ')}, got ${JSON.stringify(raw)}.`
    );
  }
  return raw as EasePreset;
}

function validateFrame(raw: unknown, caps: GenerationCaps): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) {
    fail(`Keyframe "frame" must be an integer, got ${JSON.stringify(raw)}.`);
  }
  if (raw < 0) {
    fail(`Keyframe "frame" must be >= 0, got ${raw}.`);
  }
  if (raw > caps.maxFrame) {
    fail(`Keyframe "frame" ${raw} exceeds the cap of ${caps.maxFrame}.`);
  }
  return raw;
}

/**
 * Strictly validate raw (untrusted, LLM-produced) data into an Animation.
 *
 * Bone ids the LLM omits on a given keyframe default to `restPose`'s angle
 * for that bone — never to zero — so an incomplete pose collapses toward the
 * rig's authored rest pose instead of an arbitrary FK default. Throws
 * `GenerationValidationError` on any structural or semantic violation; never
 * repairs or drops bad data silently.
 */
export function validateGeneratedAnimation(
  raw: unknown,
  skeleton: Skeleton,
  restPose: Pose,
  caps: GenerationCaps = DEFAULT_GENERATION_CAPS
): Animation {
  if (!isPlainObject(raw)) {
    fail('Generated animation must be a JSON object.');
  }
  const rawKeyframes = raw['keyframes'];
  if (!Array.isArray(rawKeyframes) || rawKeyframes.length === 0) {
    fail('Generated animation must have a non-empty "keyframes" array.');
  }
  if (rawKeyframes.length > caps.maxKeyframes) {
    fail(
      `Generated animation has ${rawKeyframes.length} keyframes, exceeding the cap of ${caps.maxKeyframes}.`
    );
  }

  const knownBoneIds = new Set(boneIds(skeleton.root));
  const seenFrames = new Set<number>();
  const keyframes: Keyframe[] = rawKeyframes.map((rawKeyframe) => {
    if (!isPlainObject(rawKeyframe)) {
      fail('Each keyframe must be a JSON object.');
    }
    const frame = validateFrame(rawKeyframe['frame'], caps);
    if (seenFrames.has(frame)) {
      fail(`Duplicate keyframe at frame ${frame}.`);
    }
    seenFrames.add(frame);

    const angles = validateAngles(rawKeyframe['angles'], knownBoneIds, frame);
    const easeOut = validateEaseOut(rawKeyframe['easeOut'], frame);
    const pose: Pose = restPose.rootPosition
      ? { angles: { ...restPose.angles, ...angles }, rootPosition: restPose.rootPosition }
      : { angles: { ...restPose.angles, ...angles } };

    return { frame, pose, easeOut };
  });

  if (!seenFrames.has(0)) {
    fail('Generated animation must include a keyframe at frame 0.');
  }

  return { keyframes };
}

function walkBoneLines(def: BoneDef, restPose: Pose, parent: string | null, lines: string[]): void {
  const parentDesc = parent ? `child of ${parent}` : 'root';
  const restAngle = (restPose.angles[def.id] ?? 0).toFixed(2);
  lines.push(`- ${def.id} (${parentDesc}, length ${def.length}): rest angle ${restAngle} rad`);
  for (const child of def.children ?? []) walkBoneLines(child, restPose, def.id, lines);
}

/**
 * A human-readable description of the skeleton's bone hierarchy, lengths,
 * and rest-pose angles — given to the LLM as prompt context so it can
 * reason about actual proportions and joint relationships instead of just a
 * flat list of bone id names (which is all `keyframesToolSchema` conveys).
 */
export function describeSkeletonForPrompt(skeleton: Skeleton, restPose: Pose): string {
  const lines: string[] = [];
  walkBoneLines(skeleton.root, restPose, null, lines);
  return lines.join('\n');
}

/**
 * The JSON schema for a tool-call's arguments describing a generated
 * animation, scoped to exactly the bone ids this skeleton has. Passed to the
 * LLM provider (server-side) so it can only propose angles for bones that
 * actually exist on the rig.
 */
export function keyframesToolSchema(
  skeleton: Skeleton,
  caps: GenerationCaps = DEFAULT_GENERATION_CAPS
): object {
  const boneProperties: Record<string, object> = {};
  for (const id of boneIds(skeleton.root)) {
    boneProperties[id] = {
      type: 'number',
      description: `Local rotation angle in radians for bone "${id}", relative to its parent.`,
    };
  }

  return {
    type: 'object',
    properties: {
      keyframes: {
        type: 'array',
        minItems: 1,
        maxItems: caps.maxKeyframes,
        items: {
          type: 'object',
          properties: {
            frame: {
              type: 'integer',
              minimum: 0,
              maximum: caps.maxFrame,
              description: 'Frame number on the timeline. Must include one keyframe at frame 0.',
            },
            easeOut: {
              type: 'string',
              enum: EASE_PRESETS,
              description: 'Interpolation curve for the segment leaving this keyframe.',
            },
            angles: {
              type: 'object',
              description:
                'Local rotation angle (radians) per bone id that moves at this keyframe. Bones not listed hold their rest-pose angle.',
              properties: boneProperties,
              additionalProperties: false,
            },
          },
          required: ['frame', 'angles'],
        },
      },
    },
    required: ['keyframes'],
  };
}
