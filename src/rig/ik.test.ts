import { describe, it, expect } from 'vitest';
import { solveTwoBoneIK, twoBoneIKToLocalAngles } from './ik';
import { distance, vec2 } from './math';

describe('two-bone IK', () => {
  it('reaches a target inside its range and lands the tip on it', () => {
    const r = solveTwoBoneIK({
      origin: vec2(0, 0),
      l1: 10,
      l2: 10,
      target: vec2(10, 10),
      bend: 1,
    });
    expect(r.reached).toBe(true);
    expect(distance(r.tip, vec2(10, 10))).toBeCloseTo(0);
  });

  it('preserves both bone lengths in the solution', () => {
    const r = solveTwoBoneIK({
      origin: vec2(0, 0),
      l1: 8,
      l2: 5,
      target: vec2(6, 4),
      bend: 1,
    });
    expect(distance(vec2(0, 0), r.joint)).toBeCloseTo(8);
    expect(distance(r.joint, r.tip)).toBeCloseTo(5);
  });

  it('bend sign chooses mirrored elbow solutions', () => {
    const base = { origin: vec2(0, 0), l1: 10, l2: 10, target: vec2(12, 0) } as const;
    const up = solveTwoBoneIK({ ...base, bend: 1 });
    const down = solveTwoBoneIK({ ...base, bend: -1 });
    // Same reach, elbow flipped across the shoulder->target axis.
    expect(up.joint.y).toBeCloseTo(-down.joint.y);
    expect(Math.sign(up.joint.y)).not.toBe(Math.sign(down.joint.y));
  });

  it('extends straight and reports not-reached when out of range', () => {
    const r = solveTwoBoneIK({
      origin: vec2(0, 0),
      l1: 10,
      l2: 10,
      target: vec2(100, 0),
      bend: 1,
    });
    expect(r.reached).toBe(false);
    // Fully extended toward the target: tip at max reach along +x.
    expect(r.tip.x).toBeCloseTo(20);
    expect(r.tip.y).toBeCloseTo(0);
  });

  it('converts a solution into local pose angles relative to the parent', () => {
    // Straight along +x, parent also along +x: both locals are ~0.
    const r = solveTwoBoneIK({
      origin: vec2(0, 0),
      l1: 10,
      l2: 10,
      target: vec2(20, 0),
      bend: 1,
    });
    const locals = twoBoneIKToLocalAngles(r, 0);
    expect(locals.upper).toBeCloseTo(0);
    expect(locals.lower).toBeCloseTo(0);
  });
});
