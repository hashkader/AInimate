/**
 * Thin wrapper around MiniMax's OpenAI-compatible chat completions endpoint,
 * scoped to exactly one job: force a single tool call and hand back its
 * parsed arguments. Deliberately narrow and provider-specific — everything
 * that must NOT change if the provider changes later (schema, validation,
 * prompt content) lives outside this file. See
 * docs/adr/0002-llm-authored-keyframes-minimax.md.
 */

const MINIMAX_BASE_URL = 'https://api.minimax.io/v1';
const TOOL_NAME = 'set_keyframes';

export interface MinimaxConfig {
  readonly apiKey: string;
  readonly model: string;
}

export class MinimaxRequestError extends Error {}

/**
 * Ask MiniMax to produce keyframes matching `schema` for `prompt`, forcing
 * the single tool call named `set_keyframes`. Returns the tool call's
 * arguments, JSON-parsed but otherwise unvalidated — callers must validate.
 * `systemPrompt` is assembled by the caller (see generateHandler.ts), which
 * owns the rig-specific context (skeleton structure, rest pose) this module
 * has no business knowing about.
 */
export async function generateKeyframesViaMinimax(
  prompt: string,
  systemPrompt: string,
  schema: object,
  config: MinimaxConfig
): Promise<unknown> {
  const response = await fetch(`${MINIMAX_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: TOOL_NAME,
            description: 'Set the keyframes for the requested motion.',
            parameters: schema,
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: TOOL_NAME } },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new MinimaxRequestError(`MiniMax request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
  };
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (typeof args !== 'string') {
    throw new MinimaxRequestError('MiniMax response did not include a set_keyframes tool call.');
  }

  try {
    return JSON.parse(args) as unknown;
  } catch {
    throw new MinimaxRequestError('MiniMax tool call arguments were not valid JSON.');
  }
}
