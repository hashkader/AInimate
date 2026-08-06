/**
 * Fetch wrapper for the Generate feature's server endpoint (server/index.ts,
 * proxied at /api/generate — see vite.config.ts). Deliberately thin: parsing
 * the transport envelope and surfacing a readable error message is all that
 * belongs here. The server has already strictly validated the animation
 * shape (src/rig/generation.ts) before it reaches this function.
 */

import type { Animation } from '../rig/animation';

export class GenerateRequestError extends Error {}

interface GenerateResponseBody {
  readonly animation?: unknown;
  readonly error?: string;
}

export async function generateAnimation(prompt: string): Promise<Animation> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  const body: GenerateResponseBody | null = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.error ?? `Generate failed (${response.status}).`;
    throw new GenerateRequestError(message);
  }
  if (!body?.animation) {
    throw new GenerateRequestError('Generate response was missing an animation.');
  }
  return body.animation as Animation;
}
