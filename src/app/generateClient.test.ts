import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateAnimation, GenerateRequestError } from './generateClient';

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    })
  );
}

describe('generateAnimation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs the prompt and returns the animation, usage, and cost on success', async () => {
    const animation = { keyframes: [{ frame: 0, pose: { angles: {} }, easeOut: 'linear' }] };
    const usage = { promptTokens: 500, completionTokens: 120, totalTokens: 620 };
    mockFetchOnce(200, { animation, usage, costUsd: 0.00027 });

    const result = await generateAnimation('wave hello');

    expect(result).toEqual({ animation, usage, costUsd: 0.00027 });
    expect(fetch).toHaveBeenCalledWith(
      '/api/generate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ prompt: 'wave hello' }),
      })
    );
  });

  it('throws the server-provided error message on a non-2xx response', async () => {
    mockFetchOnce(422, { error: 'unknown bone id "wing"' });

    await expect(generateAnimation('grow wings')).rejects.toThrow(GenerateRequestError);
    await expect(generateAnimation('grow wings')).rejects.toThrow(/wing/);
  });

  it('falls back to a generic message when the error body has no "error" field', async () => {
    mockFetchOnce(502, {});

    await expect(generateAnimation('wave')).rejects.toThrow(/502/);
  });

  it('throws when a 2xx response is missing an animation', async () => {
    mockFetchOnce(200, {});

    await expect(generateAnimation('wave')).rejects.toThrow(GenerateRequestError);
  });
});
