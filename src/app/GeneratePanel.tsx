/**
 * The Generate feature's UI: a text prompt, a submit button, and inline
 * loading/error state. Owns its own request lifecycle (loading/error) so
 * App.tsx stays a thin orchestrator — it only needs to know what to do with
 * the resulting Animation.
 *
 * On success, the caller applies the animation immediately (see
 * docs/adr/0002-llm-authored-keyframes-minimax.md: no preview/confirm step,
 * replaces the current animation wholesale). On failure, the prior animation
 * is left untouched and the error is shown here.
 */

import { useState } from 'react';
import type { Animation } from '../rig/animation';

interface GeneratePanelProps {
  onGenerate: (prompt: string) => Promise<Animation>;
  onApply: (animation: Animation) => void;
}

export function GeneratePanel({ onGenerate, onApply }: GeneratePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || generating) return;

    setGenerating(true);
    setError(null);
    try {
      const animation = await onGenerate(trimmed);
      onApply(animation);
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
      {error && (
        <p className="generate-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
