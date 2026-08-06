# AInimate — Domain Glossary

> Canonical terminology for this codebase. If a term here conflicts with usage
> elsewhere (comments, `CLAUDE.md`, conversation), this file wins — update it
> in place the moment a term is resolved or changes.

## Ease curve

A named, fixed interpolation shape applied to a **segment** (see below),
remapping the segment's blend fraction `t` before it's used to blend poses.
Selected from a small fixed preset set — not freeform/authored by the user (see
[[0001-easeout-on-keyframe]]).

v1 preset set: `Linear` (default), `Ease In`, `Ease Out`, `Ease In-Out`.

## easeOut

The field on a **Keyframe** holding its **ease curve**, naming the curve used
for the segment leaving that keyframe going forward in time. The last keyframe
in an animation has an `easeOut` that is never read (no segment follows it).

## Segment

The implicit interval between two time-adjacent keyframes in an `Animation`.
Not a distinct stored entity — always derived from the sorted `keyframes`
array. Its curve is the `easeOut` of the earlier of the two keyframes. See
[[0001-easeout-on-keyframe]].

## Generate

The Phase 2 user action: submit a free-text motion prompt (e.g. "wave hello,
then point left") and have an LLM author a full `Animation` — keyframe count,
timing, and `easeOut` per segment are the LLM's choice, capped for safety.
There is no separate "draft" entity: the result is an ordinary `Animation`,
identical in kind to one a human could hand-author, produced from the rig's
rest pose every time (never contextualized on whatever's currently on the
timeline). See [[0002-llm-authored-keyframes-minimax]].

Generating replaces the app's single `Animation` wholesale and applies
immediately — no preview/confirm step, no provenance marker distinguishing
generated keyframes from hand-edited ones. After generating, tweaking an
animation uses the same manual controls (IK drag, timeline scrub, keyframe
edit) as any hand-authored animation — this is the human-in-the-loop (HITL)
step the product philosophy requires. See
[[0002-llm-authored-keyframes-minimax]].
