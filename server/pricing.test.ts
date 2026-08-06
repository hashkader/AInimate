import { describe, it, expect } from 'vitest';
import { estimateCostUsd, type TokenPricing } from './pricing';

const pricing: TokenPricing = { inputPerMillion: 0.3, outputPerMillion: 1.2 };

describe('estimateCostUsd', () => {
  it('prices prompt and completion tokens independently, in dollars', () => {
    const cost = estimateCostUsd({ promptTokens: 1_000_000, completionTokens: 0 }, pricing);
    expect(cost).toBeCloseTo(0.3, 10);
  });

  it('sums input and output cost', () => {
    const cost = estimateCostUsd({ promptTokens: 500_000, completionTokens: 250_000 }, pricing);
    expect(cost).toBeCloseTo(0.15 + 0.3, 10);
  });

  it('returns 0 for zero tokens', () => {
    expect(estimateCostUsd({ promptTokens: 0, completionTokens: 0 }, pricing)).toBe(0);
  });
});
