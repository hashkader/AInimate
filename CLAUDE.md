# CLAUDE.md — AInimate

> Orientation for any Claude Code session starting cold on this project. Read
> this first. For the full product context, see [`docs/spec.md`](docs/spec.md).

## One-line pitch

AInimate turns a script into a flat 2D cutout-puppet character performance where
every AI-assisted step lands as **tweakable rig parameters**, never a baked video.

## Vision

Existing tools force a choice: manual animation software (Toon Boom, Adobe
Animate, Blender) gives full control but demands real animation skill, while
generative "black box" AI video tools give speed but no real lever — when the
result is 90% right, your only move is to re-roll.

AInimate is the middle path. The AI drafts, but the underlying **bone/IK rig
stays fully parametric** underneath, so a human (or an AI acting on their
explicit instruction) makes precise edits instead of regenerating. See
[`docs/spec.md`](docs/spec.md) for the full version.

## Target aesthetic

Flat 2D **"cutout" / puppet-style** animation — the _BoJack Horseman_ /
_Paradise PD_ look. Flat artwork pieces (head, torso, upper/forearm, hand, mouth
shapes) rigged onto a **bone skeleton with joints**.

**This is NOT 3D.** No meshes, no Blender-style modeling, no physics. Think Adobe
Animate / Toon Boom Harmony rigging, not Maya. If a future session finds itself
reaching for a 3D/mesh approach, stop — that is a deliberate non-goal.

## Non-negotiable product philosophy

**The AI is never the only pen.** Every AI-assisted step (draft motion, suggested
poses, natural-language tweaks) must land as inspectable, editable parameters on
the rig — bone rotations, IK targets, blend-shape weights, keyframe curves —
never as a baked, opaque output. If a feature can't be represented as a tweakable
parameter, it doesn't belong in this product yet.

## Roadmap

- **Phase 1 — 2D character rig engine. ← WE ARE HERE.** Parametric bone/IK rig,
  manual timeline. No AI yet.
- **Phase 2 — AI-assisted drafting.** Script → shot breakdown; text-to-motion
  landed as editable keyframes; natural-language tweak assistant.
- **Phase 3 — Scenes & multi-character.** Backgrounds, camera, multiple
  characters, optional 3D expansion.
- **Phase 4 — Platform.** Marketplace, embeddable runtime, team features.

## Current scope (single source of truth for "should I build X yet?")

This section is **living** — update it as work progresses.

**Phase 1 walking skeleton — DONE:**

- [x] Scaffolding, tooling, docs.
- [x] One hand-authored test character rig (torso → arms → head, plus legs).
- [x] Two-bone IK solver on limb chains; drag a hand/foot handle to pose a limb.
- [x] Minimal timeline: keyframes at frame 0 and N, scrub/play, linear
      interpolation between them.
- [x] SVG canvas/renderer with draggable IK handles.

**Phase 2 first slice — DONE.** Scope confirmed via a grilling session; see
[`docs/adr/0002-llm-authored-keyframes-minimax.md`](docs/adr/0002-llm-authored-keyframes-minimax.md)
and the `Generate` entry in [`CONTEXT.md`](CONTEXT.md) for the full rationale.

- [x] A minimal standalone Express server (`server/`) holding the MiniMax API
      key, run as a second process alongside Vite in dev. No database.
- [x] A single free-text motion prompt → one generated `Animation`, via a
      strict-schema MiniMax tool call that returns `Keyframe[]` in our own
      `Pose` schema (no third-party text-to-motion API, no retargeting).
- [x] Generation always starts from the rig's rest pose and replaces the
      current `Animation` wholesale, applied immediately — no preview/confirm
      step.
- [x] Strict validation of LLM output against `characterSkeleton`; reject with
      an explicit error and leave the prior animation untouched on any
      failure — no best-effort repair.
- [x] Tweaking a generated animation reuses the existing manual controls (IK
      drag, timeline scrub, keyframe edit) — this is the HITL step.

**Deferred — do NOT build without checking in first, even if it looks easy:**

- [ ] Script → shot breakdown (multi-line script parsing into a shot list).
- [ ] Natural-language tweak assistant (parameter deltas against the current
      state, as opposed to a fresh Generate).
- [ ] Licensed text-to-motion / motion-capture API and any retargeting onto
      our rig.
- [ ] Real character artwork, character import, auto-rigging.
- [ ] Per-bone joint/angle limits.
- [ ] Provenance tracking (marking generated vs. hand-edited keyframes).
- [ ] Multi-provider / user-supplied API key selection (the generation call
      should stay behind a small seam so this isn't a rewrite later, but it's
      not built now — MiniMax only for this slice).
- [ ] Persistence, multi-clip management, undo/redo.
- [ ] Easing / curve-editor UI beyond the fixed preset picker (already done).
- [ ] Multiple characters, scenes, cameras, backgrounds.
- [ ] Mobile support.
- [ ] Any 3D code path.

## Domain glossary

- **Rig** — a character's skeleton plus the flat artwork pieces attached to it;
  the thing you pose and animate.
- **Bone** — a rigid segment of the skeleton with a length. Bones form a tree
  (parent → children). A bone runs from its `origin` (proximal joint) to its
  `tip` (distal endpoint); a child's origin sits at its parent's tip.
- **Joint** — the connection point where a child bone pivots on its parent (a
  bone's `origin`). Shoulder, elbow, hip, knee.
- **Pose** — the animatable state: one local rotation angle per bone (relative to
  its parent) plus the root's world position. Poses are plain numbers — exactly
  the tweakable parameters the philosophy demands.
- **FK (forward kinematics)** — given joint angles, compute where the bones end
  up. `solveFK` in `src/rig/bone.ts`.
- **IK (inverse kinematics)** — the reverse: given a target for a chain's tip
  (e.g. a hand), solve the joint angles that reach it. We use an analytic
  two-bone solver (`src/rig/ik.ts`). Its output is bone angles written back onto
  the pose — never a baked result.
- **Keyframe** — a pose pinned to a specific frame on the timeline.
- **Interpolation** — filling in the poses _between_ keyframes. Currently linear
  (angles along the shortest arc). **Easing** (non-linear curves) is deferred.
- **Blend shape** — a weighted deformation for things like mouth shapes /
  expressions. Not built yet; called out here because it's part of the vocabulary
  and must stay parametric when it arrives.
- **Cutout animation** — the flat-puppet technique described under Target
  aesthetic.
- **Walking skeleton** — the smallest end-to-end working slice that proves the
  concept (rig + IK + timeline) before a full editor is built. That is what this
  repo currently is.
- **Generate** — the Phase 2 action: a free-text motion prompt in, an LLM-authored
  `Animation` out (same `Keyframe[]` type Phase 1 already has — no new type,
  no baked output). Always drafted fresh from the rig's rest pose and applied
  immediately, replacing whatever animation was there. See `CONTEXT.md` and
  `docs/adr/0002-llm-authored-keyframes-minimax.md`.

## Tech stack & key decisions

- **Vite + React 19 + TypeScript (strict).** Frontend-only; no backend this phase.
- **Renderer: inline SVG in React.** Chosen deliberately for Phase 1: this slice
  is about validating rig _feel_, not performance. SVG gives the best DX for
  hit-testing, dragging, and inspecting a single rig, and the rig engine is
  renderer-agnostic so Canvas2D/WebGL can be swapped in later without touching the
  math. (npm as package manager; renderer and package manager were the two
  load-bearing choices confirmed at kickoff.)
- **Vitest + React Testing Library** for tests; **ESLint + Prettier**;
  **Husky + lint-staged** pre-commit running lint-staged + `tsc -b`.
- **Rig engine is isolated in `src/rig/`** and must never import React, the DOM,
  or UI code — enforced by an ESLint `no-restricted-imports` rule. This is the
  product's core IP and is expected to be extracted into its own package later.

## Project structure

```
src/
  rig/            # THE IP: pure, renderer-agnostic rig engine (no React/DOM).
    math.ts       #   vec2 + angle helpers
    bone.ts       #   bone hierarchy + forward kinematics (solveFK)
    ik.ts         #   analytic two-bone inverse kinematics
    animation.ts  #   keyframes + linear interpolation (sampleAnimation)
    character.ts  #   the hand-authored test puppet (skeleton, rest pose, chains)
    generation.ts #   strict validation of LLM-generated Keyframe[] (Phase 2 Generate)
    index.ts      #   barrel export
    *.test.ts     #   TDD lives here
  render/         # SVG presentation only
    RigView.tsx   #   draws a solved pose + draggable IK handles
  app/            # UI shell + interaction state
    App.tsx       #   canvas, drag→IK→keyframe wiring, playback
    Timeline.tsx  #   transport + scrubber + keyframe markers
    poseEditing.ts#   drag gesture → two-bone IK → pose parameters (the bridge)
    GeneratePanel.tsx  # prompt input + Generate button, owns loading/error state
    generateClient.ts  # fetch wrapper for POST /api/generate
  main.tsx        # React entry
server/           # Minimal Express server — holds the MiniMax API key server-side
  index.ts        #   app entry, reads env, mounts POST /api/generate
  generateHandler.ts  # orchestrates: call MiniMax, validate via src/rig/generation.ts
  minimaxClient.ts    # thin fetch wrapper around MiniMax's tool-calling API
docs/spec.md      # full product context
```

The `rig → render → app` dependency direction is one-way: `rig` depends on
nothing internal; `app` may use both. `server/` may import `src/rig` (it's
Node, not UI/DOM, so the rig boundary's restriction doesn't apply to it) but
nothing in `src/` may import from `server/`.

## How to run

```bash
npm install       # install dependencies
cp .env.example .env  # then fill in MINIMAX_API_KEY (see .env.example)
npm run dev       # start the Vite dev server (http://localhost:5173)
npm run server    # in a second terminal: the Express server behind Generate (:3001)
npm test          # run the full test suite once (Vitest)
npm run test:watch
npm run typecheck # tsc -b (project references; real type check)
npm run lint      # eslint
npm run format    # prettier --write
npm run build     # tsc -b && vite build
```

The Generate feature (text prompt → AI-drafted keyframes) needs both `npm run
dev` and `npm run server` running; everything else in the app works with just
`npm run dev`.

## Working agreements for future sessions

- **TDD is expected for rig-engine logic** (`src/rig/**`): bone math, IK, and
  keyframe interpolation are pure and highly testable — write the test first.
  UI/rendering code does not need the same rigor.
- **Keep the rig boundary clean.** Nothing in `src/rig/` may import React, the
  DOM, or `render`/`app` code. The lint rule enforces it; don't work around it.
- **Everything must stay parametric.** Before adding any feature (especially once
  AI arrives in Phase 2), ask: does this land as editable rig parameters? If not,
  it doesn't belong yet.
- **Don't build ahead of "Current scope."** If a task falls under the deferred
  list, check in before starting — even if it seems small.
- **This is a living document.** Update "Current scope" and any decisions here
  whenever a major choice is made or a milestone completes.

## Agent skills

### Issue tracker

Issues are tracked in this repo's GitHub Issues (uses the `gh` CLI). See
`docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
