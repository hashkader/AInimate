---

You're setting up a brand new project from an empty directory. Read this entire prompt
before taking any action or writing any code. This session has two goals, in order:
(1) establish the project's foundation and documentation, (2) build the first concrete
slice of working code. Do not skip ahead to (2) before (1) is solid.

## Project context

**Working name:** AInimate

**What we're building:** A web app that helps creators go from a script to a finished
2D animated character performance, without needing traditional animation skills — and
without the "type a prompt, get an unchangeable video, re-roll if it's wrong" pattern
that most AI video tools use today.

**The target aesthetic is specific:** flat 2D "cutout" / puppet-style character animation
— the technique used to make shows like *BoJack Horseman* and *Paradise PD*. Characters
are built from separate flat artwork pieces (head, torso, upper arm, forearm, hand, mouth
shapes, etc.) rigged onto a bone skeleton with joints. This is NOT 3D — no meshes, no
Blender-style modeling, no physics simulation. Think Adobe Animate / Toon Boom Harmony
rigging, not Maya.

**Core product philosophy — this is the single most important constraint on everything
you build:** the AI should never be the only pen. Every AI-assisted step (draft motion,
suggested poses, natural-language tweaks) must land as inspectable, editable parameters
on the rig — bone rotations, IK targets, blend-shape weights, keyframe curves — never as
a baked, opaque output the user can only accept or regenerate. If a feature can't be
represented as a tweakable parameter, it doesn't belong in this product yet.

**Why this is worth building:** existing tools sit at two extremes. Manual tools (Toon
Boom, Blender, Adobe Animate) give full control but require real animation skill.
Generative "black box" AI video tools give speed but no real lever when the output is
90% right and 10% wrong. This product is the middle: AI drafts, the rig stays fully
parametric and tweakable underneath, and a human (or an AI assistant acting on their
explicit instruction) makes precise adjustments instead of re-rolling.

**Full roadmap (context only — we are building Phase 1, first slice, right now):**
- **Phase 1 — 2D character rig engine.** Parametric bone/IK rig, manual timeline +
  curve editor. No AI yet. Validate that hand-authoring an animation on this rig
  actually feels good before adding any AI on top of it.
- **Phase 2 — AI-assisted drafting.** Script → shot breakdown (LLM). Draft motion
  generation via a licensed text-to-motion API, landed as editable keyframes. Natural-
  language fine-tuning assistant that translates instructions into parameter deltas.
- **Phase 3 — Scenes & multi-character.** Backgrounds, camera, multiple characters in
  one scene, optional 3D expansion via Three.js.
- **Phase 4 — Platform.** Rig/asset marketplace, embeddable runtime, team features.

**Longer-term tech direction (for context, not all needed now):** React + TypeScript on
the frontend throughout. NestJS + PostgreSQL for a backend once Phase 2 needs persistence,
job queues, and LLM orchestration. Object storage (S3-compatible) for assets once there
are assets worth storing server-side. None of this is needed for Phase 1.

## What Phase 1, first slice, actually means

The concrete, scoped-down goal for THIS session is what we're calling the **walking
skeleton**: the smallest possible working proof that the rig + IK + timeline concept
feels right to use, before we build a full editor UI around it.

**In scope for this session:**
- Project scaffolding, tooling, and documentation (see below) — do this first.
- A single hand-authored test character rig: a handful of flat shapes (rectangles/simple
  SVG shapes are fine as placeholder art — no real character art needed yet) arranged
  as a bone hierarchy — e.g. torso → upper arm → forearm → hand, on both sides, plus a
  head.
- A working inverse kinematics (IK) solver on at least one limb chain, so dragging a
  hand/foot target repositions the arm/leg naturally instead of rotating each bone
  by hand.
- A minimal timeline / keyframe scrubber: set a pose at frame 0 and a different pose at
  frame N, scrub between them, see interpolation happen. Doesn't need easing curve UI
  yet — linear interpolation between keyframes is a fine first version.
- Enough of a canvas/renderer to see the rig and drag it around.

**Explicitly out of scope for this session (do not build these yet, even if it seems
easy or tempting):**
- Any AI integration of any kind.
- A backend, database, or auth of any kind. Local-only, in-memory or localStorage
  persistence is fine if you need to persist anything at all.
- Real character artwork, character import, or auto-rigging.
- Easing/curve editor UI (linear interpolation is enough for now).
- Multiple characters, scenes, cameras, or backgrounds.
- Mobile support.
- Any 3D code path.

If you find yourself about to build something in the "out of scope" list, stop and ask
me first — don't assume it's obviously fine because it's small.

## Your process for this session

1. **Ask me clarifying questions before writing any code.** If you have a clarification/
   requirements-gathering skill installed (e.g. something like `grill` or
   `grill-with-docs` from Matt Pocock's skills), use it now — this is exactly the kind
   of session it's for. At minimum, confirm with me: the project's final name if not
   set above, package manager preference (I'd lean pnpm but confirm), whether you want
   to propose Canvas2D/SVG/a small rendering library or go straight to something
   WebGL-based for the renderer (my instinct is to start simple — Canvas2D or plain SVG
   — since this session is about validating rig *feel*, not performance, but make the
   case and let me weigh in), and anything else genuinely load-bearing for how the rest
   of the project gets built. Don't ask about things you can reasonably decide yourself
   and document.

2. **Propose the initial scaffold and tech decisions for my approval** before generating
   files. Short and concrete is fine — I don't need an essay, I need to know what you're
   about to do.

3. **Once confirmed, set up the project:**
   - `git init`, sensible `.gitignore`.
   - Vite + React + TypeScript app.
   - Vitest + React Testing Library configured, with one trivial passing test to prove
     the loop works end to end.
   - ESLint + Prettier + TypeScript strict mode.
   - Husky + lint-staged pre-commit hook (running lint + typecheck at minimum).
   - Structure the code so the rig engine (bone math, IK solver, keyframe/interpolation
     logic) lives in its own clearly separated module from UI/rendering code — this
     logic is the actual IP of the product and will likely get extracted into its own
     package later. Don't scaffold empty folders for things we're not building yet
     (no premature `apps/api`, no premature `packages/` monorepo split) — just keep the
     internal boundary clean inside a single app for now.

4. **Write the `CLAUDE.md` file.** This is important — every future Claude Code session
   on this project starts from zero context, and this file is how it gets oriented. See
   exact required sections below. Also write a `docs/spec.md` containing the fuller
   product context from this prompt (vision, philosophy, full roadmap, target aesthetic)
   so `CLAUDE.md` can stay lean and point to it rather than duplicating it.

5. **Build the walking skeleton using TDD for the rig-engine logic specifically** — bone
   transform math, the IK solver, and keyframe interpolation are exactly the kind of
   pure, testable logic this benefits from. UI/rendering code doesn't need the same
   rigor at this stage. If you have a TDD skill installed, use it for this part.

6. **Stop and report back once the walking skeleton works** — don't continue on to
   building a full rig editor UI, character import, or anything from the out-of-scope
   list without checking in with me first.

## Required CLAUDE.md sections

Write `CLAUDE.md` so that a Claude Code session with zero prior context on this project,
opened a month from now, can read it and immediately understand what this is and how to
work on it correctly. It must include, in this rough order:

1. **One-line pitch** — what this is, in a sentence.
2. **Vision** — the problem being solved and why (2–3 short paragraphs max; link to
   `docs/spec.md` for the full version rather than repeating it).
3. **Target aesthetic** — explicitly state the BoJack Horseman / Paradise PD-style flat
   2D cutout/puppet reference, and explicitly state that this is NOT 3D, to prevent a
   future session from wandering toward a 3D approach by default.
4. **Non-negotiable product philosophy** — the "AI is never the only pen, everything
   must land as tweakable rig parameters" rule, stated plainly.
5. **Roadmap** — the four phases, one line each, with a clear "**we are here**" marker
   on Phase 1.
6. **Current scope** — a living checklist of what's in scope right now vs. explicitly
   deferred, kept up to date as work progresses. Treat this as the single source of
   truth for "should I build X yet" questions in future sessions.
7. **Domain glossary** — precise definitions of the vocabulary this project uses: rig,
   bone, joint, IK (inverse kinematics), blend shape, keyframe, interpolation/easing,
   walking skeleton, cutout animation. If a clarification skill you use maintains a
   separate `CONTEXT.md` glossary, reference it here instead of duplicating it — pick
   one source of truth for terminology and don't let it drift into two places.
8. **Tech stack & key decisions** — what's used and why, including the rendering
   approach decided in step 1 above. If you write ADRs for these decisions, link to
   them here rather than re-explaining.
9. **Project structure** — a short map of what lives where and why.
10. **How to run this project** — install, dev server, test, lint, build commands.
11. **Working agreements for future sessions** — TDD expected for rig-engine logic;
    ask before assuming on anything load-bearing; don't build ahead of the current
    scope section without checking in; update this file whenever a major decision is
    made or a phase/milestone completes — it's a living document, not a one-time setup
    artifact.

Now begin with step 1: ask me your clarifying questions.
