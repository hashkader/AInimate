/**
 * Cost estimation for a MiniMax call. Pure and provider-agnostic in shape
 * (just token counts in, dollars out) — the actual per-model rates are
 * supplied by the caller (server/index.ts, from env vars) since pricing
 * changes independently of this code and varies by provider/model.
 */

export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
}

export interface TokenPricing {
  readonly inputPerMillion: number;
  readonly outputPerMillion: number;
}

export function estimateCostUsd(usage: TokenUsage, pricing: TokenPricing): number {
  return (
    (usage.promptTokens / 1_000_000) * pricing.inputPerMillion +
    (usage.completionTokens / 1_000_000) * pricing.outputPerMillion
  );
}
