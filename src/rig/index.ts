/**
 * The rig engine: the product's core IP.
 *
 * Everything under `src/rig` is pure, renderer-agnostic logic — bone math,
 * forward + inverse kinematics, and keyframe interpolation. It must never
 * import React, the DOM, or UI code (enforced by ESLint). This boundary is
 * deliberate: this module is the piece most likely to be extracted into its own
 * package later. See CLAUDE.md.
 */

export * from './math';
export * from './bone';
export * from './ik';
export * from './animation';
export * from './character';
export * from './generation';
