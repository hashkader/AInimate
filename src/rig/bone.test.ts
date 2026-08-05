import { describe, it, expect } from 'vitest';
import { solveFK, boneIds, findBone, restPose, type Skeleton } from './bone';
import { vec2 } from './math';

// Two-bone chain along +x: root (len 10) -> child (len 10).
const skeleton: Skeleton = {
  rootPosition: vec2(0, 0),
  root: {
    id: 'root',
    length: 10,
    children: [{ id: 'child', length: 10 }],
  },
};

describe('skeleton traversal', () => {
  it('lists bone ids depth-first, parents first', () => {
    expect(boneIds(skeleton.root)).toEqual(['root', 'child']);
  });

  it('finds bones by id', () => {
    expect(findBone(skeleton.root, 'child')?.length).toBe(10);
    expect(findBone(skeleton.root, 'missing')).toBeUndefined();
  });
});

describe('forward kinematics', () => {
  it('lays a zero pose out straight along +x', () => {
    const world = solveFK(skeleton, restPose(skeleton));
    expect(world.root!.origin).toEqual(vec2(0, 0));
    expect(world.root!.tip.x).toBeCloseTo(10);
    expect(world.root!.tip.y).toBeCloseTo(0);
    // Child hangs off the parent tip and continues straight.
    expect(world.child!.origin.x).toBeCloseTo(10);
    expect(world.child!.tip.x).toBeCloseTo(20);
    expect(world.child!.tip.y).toBeCloseTo(0);
  });

  it('composes child world angle from parent + local angle', () => {
    const world = solveFK(skeleton, {
      angles: { root: Math.PI / 2, child: 0 },
    });
    // Root points straight up (+y).
    expect(world.root!.tip.x).toBeCloseTo(0);
    expect(world.root!.tip.y).toBeCloseTo(10);
    // Child inherits parent's world angle -> also points up.
    expect(world.child!.worldAngle).toBeCloseTo(Math.PI / 2);
    expect(world.child!.tip.y).toBeCloseTo(20);
  });

  it('bends the child relative to the parent', () => {
    const world = solveFK(skeleton, {
      angles: { root: 0, child: Math.PI / 2 },
    });
    // Root along +x, child turns 90deg to point +y from the elbow at (10,0).
    expect(world.child!.origin.x).toBeCloseTo(10);
    expect(world.child!.tip.x).toBeCloseTo(10);
    expect(world.child!.tip.y).toBeCloseTo(10);
  });

  it('honors a root position override from the pose', () => {
    const world = solveFK(skeleton, {
      angles: {},
      rootPosition: vec2(5, 5),
    });
    expect(world.root!.origin).toEqual(vec2(5, 5));
    expect(world.root!.tip.x).toBeCloseTo(15);
  });
});
