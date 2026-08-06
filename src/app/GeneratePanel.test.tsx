import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeneratePanel } from './GeneratePanel';
import type { Animation } from '../rig/animation';
import type { GenerateResult } from './generateClient';

const animation: Animation = {
  keyframes: [{ frame: 0, pose: { angles: {} }, easeOut: 'linear' }],
};

const result: GenerateResult = {
  animation,
  usage: { promptTokens: 500, completionTokens: 120, totalTokens: 620 },
  costUsd: 0.00027,
};

describe('GeneratePanel', () => {
  it('calls onGenerate with the trimmed prompt, then onApply with the animation', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn().mockResolvedValue(result);
    const onApply = vi.fn();

    render(<GeneratePanel onGenerate={onGenerate} onApply={onApply} />);
    await user.type(screen.getByLabelText(/motion prompt/i), '  wave hello  ');
    await user.click(screen.getByRole('button', { name: /generate/i }));

    expect(onGenerate).toHaveBeenCalledWith('wave hello');
    expect(onApply).toHaveBeenCalledWith(animation);
  });

  it('shows a success message with keyframe count, token usage, and cost', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn().mockResolvedValue(result);
    const onApply = vi.fn();

    render(<GeneratePanel onGenerate={onGenerate} onApply={onApply} />);
    await user.type(screen.getByLabelText(/motion prompt/i), 'wave hello');
    await user.click(screen.getByRole('button', { name: /generate/i }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('1 keyframe');
    expect(status).toHaveTextContent('620 tokens');
    expect(status).toHaveTextContent('$0.0003');
  });

  it('disables the button while generating is in flight, and re-enables after', async () => {
    const user = userEvent.setup();
    let resolve!: (r: GenerateResult) => void;
    const onGenerate = vi.fn().mockReturnValue(new Promise<GenerateResult>((r) => (resolve = r)));
    const onApply = vi.fn();

    render(<GeneratePanel onGenerate={onGenerate} onApply={onApply} />);
    await user.type(screen.getByLabelText(/motion prompt/i), 'wave');
    await user.click(screen.getByRole('button', { name: /generate/i }));

    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();

    resolve(result);
    expect(await screen.findByRole('button', { name: /^generate$/i })).toBeEnabled();
  });

  it('shows the error message and does not call onApply when onGenerate rejects', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn().mockRejectedValue(new Error('unknown bone id "wing"'));
    const onApply = vi.fn();

    render(<GeneratePanel onGenerate={onGenerate} onApply={onApply} />);
    await user.type(screen.getByLabelText(/motion prompt/i), 'grow wings');
    await user.click(screen.getByRole('button', { name: /generate/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/wing/);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('clears a prior success message when a new generate fails', async () => {
    const user = userEvent.setup();
    const onGenerate = vi
      .fn()
      .mockResolvedValueOnce(result)
      .mockRejectedValueOnce(new Error('boom'));
    const onApply = vi.fn();

    render(<GeneratePanel onGenerate={onGenerate} onApply={onApply} />);
    await user.type(screen.getByLabelText(/motion prompt/i), 'wave hello');
    await user.click(screen.getByRole('button', { name: /generate/i }));
    await screen.findByRole('status');

    await user.clear(screen.getByLabelText(/motion prompt/i));
    await user.type(screen.getByLabelText(/motion prompt/i), 'boom prompt');
    await user.click(screen.getByRole('button', { name: /generate/i }));

    await screen.findByRole('alert');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('disables the submit button when the prompt is empty or whitespace', async () => {
    const user = userEvent.setup();
    render(<GeneratePanel onGenerate={vi.fn()} onApply={vi.fn()} />);

    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/motion prompt/i), '   ');
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled();
  });
});
