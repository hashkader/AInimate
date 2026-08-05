import { describe, it, expect } from 'vitest';
import { sampleAnimation, frameRange, type Animation } from './animation';
import { vec2 } from './math';

const anim: Animation = {
  keyframes: [
    { frame: 0, pose: { angles: { arm: 0 }, rootPosition: vec2(0, 0) } },
    { frame: 10, pose: { angles: { arm: Math.PI / 2 }, rootPosition: vec2(10, 0) } },
  ],
};

describe('frameRange', () => {
  it('reports the inclusive keyframe span', () => {
    expect(frameRange(anim)).toEqual({ start: 0, end: 10 });
  });

  it('is null for an empty animation', () => {
    expect(frameRange({ keyframes: [] })).toBeNull();
  });
});

describe('sampleAnimation', () => {
  it('returns keyframe poses exactly at keyframe times', () => {
    expect(sampleAnimation(anim, 0).angles.arm).toBeCloseTo(0);
    expect(sampleAnimation(anim, 10).angles.arm).toBeCloseTo(Math.PI / 2);
  });

  it('linearly interpolates angles between keyframes', () => {
    const mid = sampleAnimation(anim, 5);
    expect(mid.angles.arm).toBeCloseTo(Math.PI / 4);
    expect(mid.rootPosition?.x).toBeCloseTo(5);
  });

  it('holds before the first and after the last keyframe', () => {
    expect(sampleAnimation(anim, -5).angles.arm).toBeCloseTo(0);
    expect(sampleAnimation(anim, 999).angles.arm).toBeCloseTo(Math.PI / 2);
  });

  it('handles unsorted keyframes defensively', () => {
    const unsorted: Animation = {
      keyframes: [anim.keyframes[1]!, anim.keyframes[0]!],
    };
    expect(sampleAnimation(unsorted, 5).angles.arm).toBeCloseTo(Math.PI / 4);
  });

  it('interpolates angles along the shortest arc across the wrap boundary', () => {
    const wrap: Animation = {
      keyframes: [
        { frame: 0, pose: { angles: { j: (170 * Math.PI) / 180 } } },
        { frame: 10, pose: { angles: { j: (-170 * Math.PI) / 180 } } },
      ],
    };
    // Midpoint should be at +/-180deg, not swinging back through 0.
    expect(Math.abs(sampleAnimation(wrap, 5).angles.j!)).toBeCloseTo(Math.PI);
  });

  it('holds a bone present in only one keyframe', () => {
    const partial: Animation = {
      keyframes: [
        { frame: 0, pose: { angles: { a: 0, b: 1 } } },
        { frame: 10, pose: { angles: { a: 2 } } },
      ],
    };
    const mid = sampleAnimation(partial, 5);
    expect(mid.angles.a).toBeCloseTo(1);
    expect(mid.angles.b).toBeCloseTo(1);
  });
});
