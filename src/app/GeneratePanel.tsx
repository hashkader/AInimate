/**
 * The Generate feature's UI: a text prompt, a submit button, and inline
 * loading/success/error state. Owns its own request lifecycle so App.tsx
 * stays a thin orchestrator — it only needs to know what to do with the
 * resulting Animation.
 *
 * On success, the caller applies the animation immediately (see
 * docs/adr/0002-llm-authored-keyframes-minimax.md: no preview/confirm step,
 * replaces the current animation wholesale) and a confirmation showing token
 * usage/cost is shown here. On failure, the prior animation is left
 * untouched and the error is shown here instead.
 */

import { useState } from 'react';
import type { Animation } from '../rig/animation';
import type { GenerateResult } from './generateClient';

interface GeneratePanelProps {
  onGenerate: (prompt: string) => Promise<GenerateResult>;
  onApply: (animation: Animation) => void;
}

function formatCostUsd(costUsd: number): string {
  return costUsd < 0.01 ? `$${costUsd.toFixed(4)}` : `$${costUsd.toFixed(2)}`;
}

export function GeneratePanel({ onGenerate, onApply }: GeneratePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<GenerateResult | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || generating) return;

    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await onGenerate(trimmed);
      onApply(result.animation);
      setSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generate failed.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <form className="generate-panel" onSubmit={submit}>
      <label className="generate-label" htmlFor="generate-prompt">
        Motion prompt
      </label>
      <input
        id="generate-prompt"
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. wave hello, then point to the left"
        disabled={generating}
      />
      <button type="submit" disabled={generating || prompt.trim().length === 0}>
        {generating ? 'Generating…' : 'Generate'}
      </button>
      {success && (
        <p className="generate-success" role="status">
          Generated {success.animation.keyframes.length} keyframe
          {success.animation.keyframes.length === 1 ? '' : 's'} · {success.usage.totalTokens} tokens
          · {formatCostUsd(success.costUsd)}
        </p>
      )}
      {error && (
        <p className="generate-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
