import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeneratePanel } from './GeneratePanel';
import type { Animation } from '../rig/animation';

const animation: Animation = {
  keyframes: [{ frame: 0, pose: { angles: {} }, easeOut: 'linear' }],
};

describe('GeneratePanel', () => {
  it('calls onGenerate with the trimmed prompt, then onApply with the result', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn().mockResolvedValue(animation);
    const onApply = vi.fn();

    render(<GeneratePanel onGenerate={onGenerate} onApply={onApply} />);
    await user.type(screen.getByLabelText(/motion prompt/i), '  wave hello  ');
    await user.click(screen.getByRole('button', { name: /generate/i }));

    expect(onGenerate).toHaveBeenCalledWith('wave hello');
    expect(onApply).toHaveBeenCalledWith(animation);
  });

  it('disables the button while generating is in flight, and re-enables after', async () => {
    const user = userEvent.setup();
    let resolve!: (a: Animation) => void;
    const onGenerate = vi.fn().mockReturnValue(new Promise<Animation>((r) => (resolve = r)));
    const onApply = vi.fn();

    render(<GeneratePanel onGenerate={onGenerate} onApply={onApply} />);
    await user.type(screen.getByLabelText(/motion prompt/i), 'wave');
    await user.click(screen.getByRole('button', { name: /generate/i }));

    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();

    resolve(animation);
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

  it('disables the submit button when the prompt is empty or whitespace', async () => {
    const user = userEvent.setup();
    render(<GeneratePanel onGenerate={vi.fn()} onApply={vi.fn()} />);

    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/motion prompt/i), '   ');
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled();
  });
});
