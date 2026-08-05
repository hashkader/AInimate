import { describe, it, expect } from 'vitest';
import {
  add,
  sub,
  scale,
  dot,
  length,
  distance,
  normalize,
  rotate,
  angleOf,
  fromAngle,
  clamp,
  lerp,
  lerpVec,
  normalizeAngle,
  angleDiff,
  lerpAngle,
  vec2,
  TWO_PI,
} from './math';

describe('vector arithmetic', () => {
  it('adds and subtracts', () => {
    expect(add(vec2(1, 2), vec2(3, 4))).toEqual(vec2(4, 6));
    expect(sub(vec2(3, 4), vec2(1, 2))).toEqual(vec2(2, 2));
  });

  it('scales and dots', () => {
    expect(scale(vec2(2, -3), 2)).toEqual(vec2(4, -6));
    expect(dot(vec2(1, 0), vec2(0, 1))).toBe(0);
    expect(dot(vec2(2, 3), vec2(4, 5))).toBe(23);
  });

  it('computes length and distance', () => {
    expect(length(vec2(3, 4))).toBe(5);
    expect(distance(vec2(0, 0), vec2(3, 4))).toBe(5);
  });

  it('normalizes, and handles the zero vector safely', () => {
    expect(normalize(vec2(0, 5))).toEqual(vec2(0, 1));
    expect(normalize(vec2(0, 0))).toEqual(vec2(0, 0));
  });
});

describe('rotation and angles', () => {
  it('rotates 90 degrees', () => {
    const r = rotate(vec2(1, 0), Math.PI / 2);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(1);
  });

  it('angleOf and fromAngle are inverses', () => {
    const a = 0.7;
    expect(angleOf(fromAngle(a))).toBeCloseTo(a);
    expect(length(fromAngle(a, 5))).toBeCloseTo(5);
  });
});

describe('scalar helpers', () => {
  it('clamps', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('lerps scalars and vectors', () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    expect(lerpVec(vec2(0, 0), vec2(10, 20), 0.5)).toEqual(vec2(5, 10));
  });
});

describe('angle wrapping', () => {
  it('normalizes into (-PI, PI]', () => {
    expect(normalizeAngle(0)).toBeCloseTo(0);
    expect(normalizeAngle(TWO_PI)).toBeCloseTo(0);
    expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2);
  });

  it('takes the shortest signed difference across the wrap boundary', () => {
    // From 170deg to -170deg is +20deg (crossing 180), not -340deg.
    const a = (170 * Math.PI) / 180;
    const b = (-170 * Math.PI) / 180;
    expect(angleDiff(a, b)).toBeCloseTo((20 * Math.PI) / 180);
  });

  it('lerps angles along the shortest arc', () => {
    const a = (170 * Math.PI) / 180;
    const b = (-170 * Math.PI) / 180;
    // Halfway should sit at 180deg (== -180), not swing back through 0.
    expect(Math.abs(lerpAngle(a, b, 0.5))).toBeCloseTo(Math.PI);
  });
});
