# Phase 2 first slice: LLM authors keyframes directly, no motion-capture retargeting

`docs/spec.md` named a "licensed text-to-motion API" as the eventual Phase 2
motion source. Those APIs (built on 3D humanoid motion-capture data, e.g.
SMPL/BVH-style skeletons) target a fixed 3D humanoid joint set. Our rig
(`src/rig/character.ts`) is a custom flat 2D bone hierarchy with its own bone
ids, lengths, and IK chains — mapping motion-capture output onto it is an
unsolved retargeting problem and a research question in its own right.

For the first Phase 2 slice we instead have an LLM author keyframes directly
in our own `Pose` schema (`src/rig/bone.ts` — bone id → local angle, plus
`rootPosition`), wrapped in `Keyframe`s (`src/rig/animation.ts` — `frame`,
`pose`, `easeOut`). The LLM is given the skeleton structure and asked, via a
strict-schema tool call, to return a `Keyframe[]` for a described motion.

This sidesteps retargeting entirely, keeps generation output natively
parametric and inspectable (the core product philosophy — see `CLAUDE.md`'s
"Non-negotiable product philosophy"), and lets the concept be validated before
committing to the harder integration. A licensed motion-capture API remains a
future option, reframed as "retarget motion-capture data onto our rig" once
this slice proves the pipeline is worth the added fidelity.

## Provider: MiniMax, not Claude

MiniMax was chosen over Claude for this slice purely for iteration cost during
testing (higher token budget available, cheaper). MiniMax's M2.x/M3 models
support tool/function calling with structured arguments over an
OpenAI-compatible API, which is the load-bearing capability here (see Q6/Q9 of
the grilling session that produced this ADR) — the provider choice does not
change the design.

The client code should not hard-wire assumptions that make swapping providers
hard: a future increment is expected to let a user paste their own API key and
choose a provider. That increment is not built now — this slice targets
MiniMax only — but the generation call should stay isolated behind a small
seam (one server-side module) rather than inlined across the codebase, so that
future swap isn't a rewrite.

## Validation is strict, not best-effort

LLM output is validated against `characterSkeleton`'s known bone ids and
plausible angle ranges before it's applied. On any validation failure, the
call is rejected with an explicit error and the prior animation is left
untouched — no best-effort repair (dropping unknown bones, clamping silently).
Silent repair would hide generation failures behind a plausible-looking
animation, which is exactly the "opaque baked output" the product philosophy
rejects.

## Every generation replaces the animation wholesale, from rest pose

There is currently exactly one `Animation` in app state, with no
persistence/save-load and no undo. Generation:

- always starts the LLM from the rig's rest pose, never from the current
  (possibly hand-edited) pose — a prompt describes an absolute motion, not a
  delta against whatever's currently on the timeline;
- replaces that single `Animation` wholesale and applies immediately (no
  preview/confirm step) — the existing scrub/drag/play controls already serve
  as the review mechanism, and nothing is at risk of being lost since nothing
  is persisted yet anyway.

A natural-language _tweak_ assistant (edit deltas against the current state,
per `docs/spec.md`) is a distinct future feature, not this one.

## Explicitly out of scope for this slice

- Script → shot breakdown (single motion prompt → one clip only).
- Real character artwork / import / auto-rigging.
- Per-bone joint/angle limits.
- Provenance tracking (marking which keyframes came from generation vs. hand
  edits).
- Multi-provider / user-supplied API key selection (seam left open for it,
  not built).
