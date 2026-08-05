import { describe, it, expect } from 'vitest';
import { dragChainTo } from './poseEditing';
import { solveFK } from '../rig/bone';
import { characterSkeleton, characterRestPose, characterIKChains } from '../rig/character';
import { distance, vec2 } from '../rig/math';

const armR = characterIKChains.find((c) => c.id === 'armR')!;

describe('dragChainTo', () => {
  it('moves the chain tip toward a reachable target', () => {
    // Solve the shoulder position, then pick a target well within arm reach.
    const world0 = solveFK(characterSkeleton, characterRestPose);
    const shoulder = world0.torso!.tip;
    const target = vec2(shoulder.x + 40, shoulder.y + 30);

    const posed = dragChainTo(characterSkeleton, characterRestPose, armR, target);
    const world1 = solveFK(characterSkeleton, posed);
    expect(distance(world1.forearmR!.tip, target)).toBeCloseTo(0, 1);
  });

  it('only edits the two bones in the dragged chain', () => {
    const target = vec2(120, 120);
    const posed = dragChainTo(characterSkeleton, characterRestPose, armR, target);
    for (const [id, angle] of Object.entries(posed.angles)) {
      if (id === armR.upper || id === armR.lower) continue;
      expect(angle).toBe(characterRestPose.angles[id]);
    }
  });

  it('returns editable numeric parameters, never a baked result', () => {
    const posed = dragChainTo(characterSkeleton, characterRestPose, armR, vec2(100, 100));
    expect(typeof posed.angles[armR.upper]).toBe('number');
    expect(typeof posed.angles[armR.lower]).toBe('number');
  });
});
