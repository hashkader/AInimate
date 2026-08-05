# AInimate — Product Specification

> This document holds the full product context. `CLAUDE.md` stays lean and links
> here rather than duplicating it.

## What we're building

A web app that helps creators go from a **script** to a finished **2D animated
character performance** — without needing traditional animation skills, and
without the "type a prompt, get an unchangeable video, re-roll if it's wrong"
pattern that most AI video tools use today.

## Target aesthetic

Flat 2D **"cutout" / puppet-style** character animation — the technique behind
shows like _BoJack Horseman_ and _Paradise PD_. Characters are built from
separate flat artwork pieces (head, torso, upper arm, forearm, hand, mouth
shapes, etc.) rigged onto a **bone skeleton with joints**.

This is **NOT 3D**. No meshes, no Blender-style modeling, no physics simulation.
The mental model is Adobe Animate / Toon Boom Harmony rigging — not Maya. Any
future session tempted to reach for a 3D/mesh approach by default should stop:
that is a deliberate non-goal for the core product (a limited optional 3D
expansion is only contemplated far out in Phase 3).

## Core product philosophy — the single most important constraint

**The AI should never be the only pen.**

Every AI-assisted step — draft motion, suggested poses, natural-language tweaks —
must land as **inspectable, editable parameters on the rig**: bone rotations, IK
targets, blend-shape weights, keyframe curves. Never as a baked, opaque output
the user can only accept or regenerate.

If a feature can't be represented as a tweakable parameter, it doesn't belong in
this product yet.

## Why this is worth building

Existing tools sit at two extremes:

- **Manual tools** (Toon Boom, Blender, Adobe Animate) give full control but
  require real animation skill.
- **Generative "black box" AI video tools** give speed but no real lever when the
  output is 90% right and 10% wrong — your only move is to re-roll.

This product is the middle: **AI drafts, the rig stays fully parametric and
tweakable underneath**, and a human (or an AI assistant acting on their explicit
instruction) makes precise adjustments instead of re-rolling.

## Roadmap

- **Phase 1 — 2D character rig engine. ← we are here.** Parametric bone/IK rig,
  manual timeline + curve editor. No AI yet. Validate that hand-authoring an
  animation on this rig actually _feels good_ before adding any AI on top of it.
- **Phase 2 — AI-assisted drafting.** Script → shot breakdown (LLM). Draft motion
  generation via a licensed text-to-motion API, landed as editable keyframes.
  Natural-language fine-tuning assistant that translates instructions into
  parameter deltas.
- **Phase 3 — Scenes & multi-character.** Backgrounds, camera, multiple
  characters in one scene, optional 3D expansion via Three.js.
- **Phase 4 — Platform.** Rig/asset marketplace, embeddable runtime, team
  features.

## Longer-term tech direction (context, not all needed now)

- **Frontend:** React + TypeScript throughout.
- **Backend (only once Phase 2 needs persistence, job queues, LLM
  orchestration):** NestJS + PostgreSQL.
- **Asset storage (only once there are server-side assets worth storing):**
  S3-compatible object storage.

None of the backend/storage direction is needed for Phase 1.

## Phase 1, first slice — the "walking skeleton"

The smallest possible working proof that the rig + IK + timeline concept feels
right to use, before building a full editor UI around it.

**In scope for the first slice (all delivered):**

- Project scaffolding, tooling, documentation.
- One hand-authored test character rig: flat placeholder shapes arranged as a
  bone hierarchy (torso → upper arm → forearm → hand on both sides, plus a head;
  we also included legs).
- A working IK solver on limb chains, so dragging a hand/foot target repositions
  the limb naturally instead of rotating each bone by hand.
- A minimal timeline / keyframe scrubber: pose at frame 0, a different pose at
  frame N, scrub between them, see linear interpolation.
- Enough of a canvas/renderer to see the rig and drag it around.

**Explicitly out of scope for the first slice** (do not build without checking in
first, even if it seems small):

- Any AI integration of any kind.
- A backend, database, or auth. Local/in-memory/localStorage only.
- Real character artwork, character import, or auto-rigging.
- Easing/curve editor UI (linear interpolation is enough for now).
- Multiple characters, scenes, cameras, or backgrounds.
- Mobile support.
- Any 3D code path.
