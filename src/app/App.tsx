/**
 * The walking-skeleton app shell.
 *
 * Wires the pure rig engine to an SVG canvas and a timeline:
 *  - solve the current pose (sampled from the animation) into world transforms,
 *  - draw it, with draggable IK handles,
 *  - dragging a handle solves two-bone IK and writes a keyframe at the current
 *    frame (creating one if needed) — so the motion stays fully parametric,
 *  - scrub / play to watch linear interpolation between keyframes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RigView } from '../render/RigView';
import { Timeline } from './Timeline';
import { dragChainTo } from './poseEditing';
import { sampleAnimation, type Animation } from '../rig/animation';
import { solveFK, type Pose } from '../rig/bone';
import {
  characterSkeleton,
  characterRestPose,
  characterIKChains,
  characterVisuals,
} from '../rig/character';
import { vec2, type Vec2 } from '../rig/math';

const END_FRAME = 24;
const FPS = 24;

// A second authored pose so interpolation is visible out of the box: raise the
// right hand up and reach the left hand across. Built through the same IK path
// a user would drive by hand — no baked data.
const armR = characterIKChains.find((c) => c.id === 'armR')!;
const armL = characterIKChains.find((c) => c.id === 'armL')!;
const shoulder = solveFK(characterSkeleton, characterRestPose).torso!.tip;
const wavePose: Pose = dragChainTo(
  characterSkeleton,
  dragChainTo(characterSkeleton, characterRestPose, armR, vec2(shoulder.x + 150, shoulder.y - 120)),
  armL,
  vec2(shoulder.x - 60, shoulder.y + 40)
);

const initialAnimation: Animation = {
  keyframes: [
    { frame: 0, pose: characterRestPose, easeOut: 'linear' },
    { frame: END_FRAME, pose: wavePose, easeOut: 'linear' },
  ],
};

/** Insert or replace the keyframe at `frame`, preserving its easeOut if it already existed. */
function upsertKeyframe(anim: Animation, frame: number, pose: Pose): Animation {
  const existing = anim.keyframes.find((k) => k.frame === frame);
  const others = anim.keyframes.filter((k) => k.frame !== frame);
  const easeOut = existing?.easeOut ?? 'linear';
  return {
    keyframes: [...others, { frame, pose, easeOut }].sort((a, b) => a.frame - b.frame),
  };
}

/** Convert a client pointer position into SVG user-space coordinates. */
function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Vec2 {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return vec2(clientX, clientY);
  const local = pt.matrixTransform(ctm.inverse());
  return vec2(local.x, local.y);
}

export function App() {
  const [animation, setAnimation] = useState<Animation>(initialAnimation);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeChainId, setActiveChainId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const keyframeFrames = useMemo(() => animation.keyframes.map((k) => k.frame), [animation]);

  const pose = useMemo(() => sampleAnimation(animation, frame), [animation, frame]);
  const world = useMemo(() => solveFK(characterSkeleton, pose), [pose]);

  // Playback loop.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setFrame((f) => {
        const next = f + dt * FPS;
        return next >= END_FRAME ? next - END_FRAME : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const applyDrag = useCallback(
    (chainId: string, clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const chain = characterIKChains.find((c) => c.id === chainId);
      if (!chain) return;
      const target = toSvgPoint(svg, clientX, clientY);
      const editFrame = Math.round(frame);

      setAnimation((anim) => {
        const base = sampleAnimation(anim, editFrame);
        const edited = dragChainTo(characterSkeleton, base, chain, target);
        return upsertKeyframe(anim, editFrame, edited);
      });
      setFrame(editFrame);
    },
    [frame]
  );

  const onHandlePointerDown = useCallback((chainId: string, e: React.PointerEvent) => {
    e.preventDefault();
    setPlaying(false);
    setActiveChainId(chainId);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const onSvgPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!activeChainId) return;
      applyDrag(activeChainId, e.clientX, e.clientY);
    },
    [activeChainId, applyDrag]
  );

  const endDrag = useCallback(() => setActiveChainId(null), []);

  const resetPose = useCallback(() => {
    setAnimation(initialAnimation);
    setFrame(0);
    setPlaying(false);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          AInimate <span className="tag">walking skeleton</span>
        </h1>
        <p className="subtitle">
          Drag a hand or foot handle — IK solves the limb into editable bone angles. Set a pose on
          frame 0 and frame {END_FRAME}, then scrub or play to watch it interpolate.
        </p>
      </header>

      <div className="stage">
        <svg
          ref={svgRef}
          className="canvas"
          viewBox="-260 -280 520 520"
          onPointerMove={onSvgPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          {/* ground line for orientation */}
          <line x1={-260} y1={185} x2={260} y2={185} stroke="#2a3550" strokeWidth={2} />
          <RigView
            world={world}
            visuals={characterVisuals}
            ikChains={characterIKChains}
            activeChainId={activeChainId}
            onHandlePointerDown={onHandlePointerDown}
          />
        </svg>
      </div>

      <div className="controls">
        <Timeline
          frame={frame}
          endFrame={END_FRAME}
          playing={playing}
          keyframeFrames={keyframeFrames}
          onScrub={(f) => {
            setPlaying(false);
            setFrame(f);
          }}
          onTogglePlay={() => setPlaying((p) => !p)}
          onSelectKeyframe={(f) => {
            setPlaying(false);
            setFrame(f);
          }}
        />
        <button className="reset" onClick={resetPose}>
          Reset
        </button>
      </div>
    </div>
  );
}
