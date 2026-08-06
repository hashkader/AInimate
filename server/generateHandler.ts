/**
 * POST /api/generate — turn a text motion prompt into a validated Animation.
 *
 * Orchestrates: call MiniMax with a schema scoped to the character's bone
 * ids (src/rig/generation.ts's keyframesToolSchema), then strictly validate
 * the result before it ever reaches the client. See
 * docs/adr/0002-llm-authored-keyframes-minimax.md for why validation is
 * strict-reject rather than best-effort repair.
 */

import type { Request, Response } from 'express';
import {
  characterRestPose,
  characterSkeleton,
  describeSkeletonForPrompt,
  keyframesToolSchema,
  validateGeneratedAnimation,
  GenerationValidationError,
} from '../src/rig';
import {
  generateKeyframesViaMinimax,
  MinimaxRequestError,
  type MinimaxConfig,
} from './minimaxClient';
import { estimateCostUsd, type TokenPricing } from './pricing';

const MAX_PROMPT_LENGTH = 500;

const SYSTEM_PROMPT = `You animate a flat 2D cutout-puppet character rig by proposing keyframes.
Always call the set_keyframes tool exactly once with your full answer — never reply in plain text.

The rig's bone hierarchy, bone lengths, and rest-pose angles (radians, relative to each bone's parent):
${describeSkeletonForPrompt(characterSkeleton, characterRestPose)}

Bones you don't mention in a keyframe hold their rest-pose angle above — you only need to specify bones that move.`;

export function createGenerateHandler(config: MinimaxConfig, pricing: TokenPricing) {
  return async function generateHandler(req: Request, res: Response): Promise<void> {
    const prompt = req.body?.prompt;
    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ error: 'Request body must include a non-empty "prompt" string.' });
      return;
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      res.status(400).json({ error: `"prompt" must be at most ${MAX_PROMPT_LENGTH} characters.` });
      return;
    }

    const schema = keyframesToolSchema(characterSkeleton);

    let raw: unknown;
    let usage: { promptTokens: number; completionTokens: number };
    try {
      const result = await generateKeyframesViaMinimax(prompt, SYSTEM_PROMPT, schema, config);
      raw = result.data;
      usage = result.usage;
    } catch (err) {
      const message = err instanceof MinimaxRequestError ? err.message : 'MiniMax request failed.';
      res.status(502).json({ error: message });
      return;
    }

    try {
      const animation = validateGeneratedAnimation(raw, characterSkeleton, characterRestPose);
      res.status(200).json({
        animation,
        usage: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.promptTokens + usage.completionTokens,
        },
        costUsd: estimateCostUsd(usage, pricing),
      });
    } catch (err) {
      const message =
        err instanceof GenerationValidationError ? err.message : 'Generated animation was invalid.';
      res.status(422).json({ error: message });
    }
  };
}
