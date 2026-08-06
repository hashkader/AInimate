import { describe, it, expect } from 'vitest';
import {
  validateGeneratedAnimation,
  keyframesToolSchema,
  describeSkeletonForPrompt,
  GenerationValidationError,
  DEFAULT_GENERATION_CAPS,
} from './generation';
import type { Skeleton, Pose } from './bone';

// A tiny two-bone skeleton is enough to exercise the validation rules without
// dragging in the full character rig.
const skeleton: Skeleton = {
  rootPosition: { x: 0, y: 0 },
  root: {
    id: 'hips',
    length: 1,
    children: [{ id: 'torso', length: 100, children: [{ id: 'head', length: 40 }] }],
  },
};

const restPose: Pose = {
  angles: { hips: 0, torso: -1.5, head: -1.5 },
  rootPosition: { x: 0, y: 0 },
};

function validRaw() {
  return {
    keyframes: [
      { frame: 0, easeOut: 'linear', angles: { torso: -1.5, head: -1.5 } },
      { frame: 12, easeOut: 'easeInOut', angles: { torso: -0.8, head: -1.2 } },
    ],
  };
}

describe('validateGeneratedAnimation', () => {
  it('accepts well-formed output and returns a matching Animation', () => {
    const anim = validateGeneratedAnimation(validRaw(), skeleton, restPose);
    expect(anim.keyframes).toHaveLength(2);
    expect(anim.keyframes[0]).toMatchObject({ frame: 0, easeOut: 'linear' });
    expect(anim.keyframes[1]).toMatchObject({ frame: 12, easeOut: 'easeInOut' });
  });

  it('fills bone ids the LLM omitted with the rest pose angle, not zero', () => {
    const raw = {
      keyframes: [
        { frame: 0, easeOut: 'linear', angles: { torso: -0.9 } }, // head omitted
        { frame: 10, easeOut: 'linear', angles: { torso: -0.9, head: -1.5 } },
      ],
    };
    const anim = validateGeneratedAnimation(raw, skeleton, restPose);
    expect(anim.keyframes[0]!.pose.angles['head']).toBe(restPose.angles['head']);
    expect(anim.keyframes[0]!.pose.angles['hips']).toBe(restPose.angles['hips']);
  });

  it('defaults a missing easeOut to linear', () => {
    const raw = {
      keyframes: [
        { frame: 0, angles: { torso: -1.5 } },
        { frame: 10, angles: { torso: -0.5 } },
      ],
    };
    const anim = validateGeneratedAnimation(raw, skeleton, restPose);
    expect(anim.keyframes[0]!.easeOut).toBe('linear');
  });

  it('rejects non-object input', () => {
    expect(() => validateGeneratedAnimation(null, skeleton, restPose)).toThrow(
      GenerationValidationError
    );
    expect(() => validateGeneratedAnimation('nope', skeleton, restPose)).toThrow(
      GenerationValidationError
    );
  });

  it('rejects a missing keyframes array', () => {
    expect(() => validateGeneratedAnimation({}, skeleton, restPose)).toThrow(
      GenerationValidationError
    );
  });

  it('rejects an empty keyframes array', () => {
    expect(() => validateGeneratedAnimation({ keyframes: [] }, skeleton, restPose)).toThrow(
      GenerationValidationError
    );
  });

  it('rejects when no keyframe sits at frame 0', () => {
    const raw = { keyframes: [{ frame: 5, angles: { torso: -1 } }] };
    expect(() => validateGeneratedAnimation(raw, skeleton, restPose)).toThrow(/frame 0/i);
  });

  it('rejects a non-integer or negative frame', () => {
    const raw = { keyframes: [{ frame: 0.5, angles: {} }] };
    expect(() => validateGeneratedAnimation(raw, skeleton, restPose)).toThrow(
      GenerationValidationError
    );

    const raw2 = { keyframes: [{ frame: -1, angles: {} }] };
    expect(() => validateGeneratedAnimation(raw2, skeleton, restPose)).toThrow(
      GenerationValidationError
    );
  });

  it('rejects a frame beyond the configured cap', () => {
    const raw = {
      keyframes: [
        { frame: 0, angles: {} },
        { frame: 9999, angles: {} },
      ],
    };
    expect(() => validateGeneratedAnimation(raw, skeleton, restPose)).toThrow(/cap|frame/i);
  });

  it('rejects more keyframes than the configured cap', () => {
    const keyframes = Array.from({ length: DEFAULT_GENERATION_CAPS.maxKeyframes + 1 }, (_, i) => ({
      frame: i,
      angles: {},
    }));
    expect(() => validateGeneratedAnimation({ keyframes }, skeleton, restPose)).toThrow(
      /cap|keyframes/i
    );
  });

  it('rejects an angle for a bone id that does not exist on the skeleton', () => {
    const raw = {
      keyframes: [{ frame: 0, angles: { wing: 1.2 } }],
    };
    expect(() => validateGeneratedAnimation(raw, skeleton, restPose)).toThrow(/wing|bone/i);
  });

  it('rejects a non-finite or implausibly large angle', () => {
    const nan = { keyframes: [{ frame: 0, angles: { torso: Number.NaN } }] };
    expect(() => validateGeneratedAnimation(nan, skeleton, restPose)).toThrow(
      GenerationValidationError
    );

    const huge = { keyframes: [{ frame: 0, angles: { torso: 999 } }] };
    expect(() => validateGeneratedAnimation(huge, skeleton, restPose)).toThrow(
      GenerationValidationError
    );
  });

  it('rejects an unrecognized easeOut preset', () => {
    const raw = { keyframes: [{ frame: 0, angles: {}, easeOut: 'bounce' }] };
    expect(() => validateGeneratedAnimation(raw, skeleton, restPose)).toThrow(
      GenerationValidationError
    );
  });

  it('rejects duplicate frame numbers', () => {
    const raw = {
      keyframes: [
        { frame: 0, angles: {} },
        { frame: 0, angles: {} },
      ],
    };
    expect(() => validateGeneratedAnimation(raw, skeleton, restPose)).toThrow(/duplicate|frame/i);
  });
});

describe('describeSkeletonForPrompt', () => {
  it('describes every bone with its parent, length, and rest angle', () => {
    const description = describeSkeletonForPrompt(skeleton, restPose);

    expect(description).toMatch(/hips.*root.*length 1/i);
    expect(description).toMatch(/torso.*child of hips.*length 100/i);
    expect(description).toMatch(/head.*child of torso.*length 40/i);
    // Rest angles should be present so the model knows where "rest" is.
    expect(description).toContain('-1.5');
  });
});

describe('keyframesToolSchema', () => {
  it('enumerates every bone id on the skeleton as a required numeric property', () => {
    const schema = keyframesToolSchema(skeleton);
    const anglesSchema = (
      (schema as { properties: { keyframes: { items: { properties: { angles: object } } } } })
        .properties.keyframes.items.properties.angles as {
        properties: Record<string, unknown>;
      }
    ).properties;
    expect(Object.keys(anglesSchema).sort()).toEqual(['head', 'hips', 'torso']);
  });
});
