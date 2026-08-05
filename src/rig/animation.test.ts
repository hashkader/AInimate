import { describe, it, expect } from 'vitest';
import { sampleAnimation, frameRange, applyEase, type Animation } from './animation';
import { vec2 } from './math';

const anim: Animation = {
  keyframes: [
    { frame: 0, pose: { angles: { arm: 0 }, rootPosition: vec2(0, 0) }, easeOut: 'linear' },
    {
      frame: 10,
      pose: { angles: { arm: Math.PI / 2 }, rootPosition: vec2(10, 0) },
      easeOut: 'linear',
    },
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
        { frame: 0, pose: { angles: { j: (170 * Math.PI) / 180 } }, easeOut: 'linear' },
        { frame: 10, pose: { angles: { j: (-170 * Math.PI) / 180 } }, easeOut: 'linear' },
      ],
    };
    // Midpoint should be at +/-180deg, not swinging back through 0.
    expect(Math.abs(sampleAnimation(wrap, 5).angles.j!)).toBeCloseTo(Math.PI);
  });

  it('holds a bone present in only one keyframe', () => {
    const partial: Animation = {
      keyframes: [
        { frame: 0, pose: { angles: { a: 0, b: 1 } }, easeOut: 'linear' },
        { frame: 10, pose: { angles: { a: 2 } }, easeOut: 'linear' },
      ],
    };
    const mid = sampleAnimation(partial, 5);
    expect(mid.angles.a).toBeCloseTo(1);
    expect(mid.angles.b).toBeCloseTo(1);
  });

  it('remaps the segment t through the earlier keyframe easeOut preset', () => {
    const easeIn: Animation = {
      keyframes: [
        { frame: 0, pose: { angles: { arm: 0 } }, easeOut: 'easeIn' },
        { frame: 10, pose: { angles: { arm: 1 } }, easeOut: 'linear' },
      ],
    };
    // easeIn at t=0.5 is 0.25, applied uniformly to every channel.
    expect(sampleAnimation(easeIn, 5).angles.arm).toBeCloseTo(0.25);
  });

  it('applies easeOut only to the segment leaving that keyframe, not the next segment', () => {
    const mixed: Animation = {
      keyframes: [
        { frame: 0, pose: { angles: { arm: 0 } }, easeOut: 'easeIn' },
        { frame: 10, pose: { angles: { arm: 1 } }, easeOut: 'linear' },
        { frame: 20, pose: { angles: { arm: 2 } }, easeOut: 'linear' },
      ],
    };
    // Second segment (frame 10 -> 20) uses the frame-10 keyframe's linear easeOut.
    expect(sampleAnimation(mixed, 15).angles.arm).toBeCloseTo(1.5);
  });
});

describe('applyEase', () => {
  it('linear is the identity', () => {
    expect(applyEase('linear', 0)).toBeCloseTo(0);
    expect(applyEase('linear', 0.5)).toBeCloseTo(0.5);
    expect(applyEase('linear', 1)).toBeCloseTo(1);
  });

  it('easeIn is t^2', () => {
    expect(applyEase('easeIn', 0.5)).toBeCloseTo(0.25);
    expect(applyEase('easeIn', 0)).toBeCloseTo(0);
    expect(applyEase('easeIn', 1)).toBeCloseTo(1);
  });

  it('easeOut is 1-(1-t)^2', () => {
    expect(applyEase('easeOut', 0.5)).toBeCloseTo(0.75);
    expect(applyEase('easeOut', 0)).toBeCloseTo(0);
    expect(applyEase('easeOut', 1)).toBeCloseTo(1);
  });

  it('easeInOut is smoothstep 3t^2-2t^3', () => {
    expect(applyEase('easeInOut', 0.5)).toBeCloseTo(0.5);
    expect(applyEase('easeInOut', 0.25)).toBeCloseTo(0.15625);
    expect(applyEase('easeInOut', 0)).toBeCloseTo(0);
    expect(applyEase('easeInOut', 1)).toBeCloseTo(1);
  });
});
