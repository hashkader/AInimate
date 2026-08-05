/**
 * SVG renderer for a rig pose.
 *
 * Pure presentation: it takes an already-solved set of world bone transforms
 * and draws each bone as a flat "cutout" capsule, plus a head circle and draggable
 * IK handles. All rig math happens upstream in `src/rig`; this file only knows
 * how to paint the result and report pointer events back up.
 */

import type { PoseSolution } from '../rig/bone';
import type { BoneVisual, IKChain } from '../rig/character';
import { angleOf, sub, type Vec2 } from '../rig/math';

interface RigViewProps {
  world: PoseSolution;
  visuals: Record<string, BoneVisual>;
  ikChains: readonly IKChain[];
  /** The IK handle currently being dragged, if any. */
  activeChainId: string | null;
  onHandlePointerDown: (chainId: string, e: React.PointerEvent) => void;
}

function Capsule({
  from,
  to,
  width,
  color,
}: {
  from: Vec2;
  to: Vec2;
  width: number;
  color: string;
}) {
  if (width <= 0) return null;
  const angleDeg = (angleOf(sub(to, from)) * 180) / Math.PI;
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  return (
    <g transform={`translate(${from.x} ${from.y}) rotate(${angleDeg})`}>
      <rect
        x={-width / 2}
        y={-width / 2}
        width={len + width}
        height={width}
        rx={width / 2}
        fill={color}
      />
    </g>
  );
}

export function RigView({
  world,
  visuals,
  ikChains,
  activeChainId,
  onHandlePointerDown,
}: RigViewProps) {
  const bones = Object.values(world);

  return (
    <g>
      {/* Bone cutout pieces (draw torso/legs first so arms layer on top). */}
      {bones.map((b) => {
        const v = visuals[b.id];
        if (!v) return null;
        return (
          <g key={b.id}>
            <Capsule from={b.origin} to={b.tip} width={v.width} color={v.color} />
            {v.headRadius ? (
              <circle cx={b.tip.x} cy={b.tip.y} r={v.headRadius} fill={v.color} />
            ) : null}
          </g>
        );
      })}

      {/* Joint pips for a hint of the skeleton underneath. */}
      {bones.map((b) =>
        visuals[b.id] && visuals[b.id]!.width > 0 ? (
          <circle key={`j-${b.id}`} cx={b.origin.x} cy={b.origin.y} r={3} fill="#1b2436" />
        ) : null
      )}

      {/* Draggable IK handles at each chain tip. */}
      {ikChains.map((chain) => {
        const tipBone = world[chain.lower];
        if (!tipBone) return null;
        const active = activeChainId === chain.id;
        return (
          <circle
            key={chain.id}
            data-testid={`ik-handle-${chain.id}`}
            cx={tipBone.tip.x}
            cy={tipBone.tip.y}
            r={active ? 13 : 10}
            fill={active ? '#ff6b6b' : '#ffffff'}
            stroke="#ff6b6b"
            strokeWidth={3}
            style={{ cursor: 'grab' }}
            onPointerDown={(e) => onHandlePointerDown(chain.id, e)}
          />
        );
      })}
    </g>
  );
}
