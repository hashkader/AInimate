import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

// Trivial end-to-end proof that the Vitest + React Testing Library loop works.
describe('App', () => {
  it('renders the walking-skeleton stage with draggable IK handles', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /ainimate/i })).toBeInTheDocument();
    // One IK handle per limb chain (both arms, both legs).
    expect(screen.getByTestId('ik-handle-armR')).toBeInTheDocument();
    expect(screen.getByTestId('ik-handle-legL')).toBeInTheDocument();
  });

  it('enables the ease-preset dropdown on selecting a non-last keyframe, and updates it', async () => {
    const user = userEvent.setup();
    render(<App />);

    // The rest-pose keyframe at frame 0 is not the last keyframe.
    await user.click(screen.getByRole('button', { name: /select keyframe at frame 0/i }));

    const select = screen.getByRole('combobox', { name: /ease out for keyframe at frame 0/i });
    expect(select).toBeEnabled();
    expect(select).toHaveValue('linear');

    await user.selectOptions(select, 'easeInOut');
    expect(select).toHaveValue('easeInOut');
  });

  it('disables the ease-preset dropdown for the last keyframe (without unmounting it)', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /select keyframe at frame 24/i }));

    // Present but inert (visibility: hidden, so excluded from the a11y tree
    // by default) — kept mounted so the timeline layout doesn't reflow (and
    // the slider/markers jump) as scrubbing crosses keyframes.
    expect(screen.getByRole('combobox', { hidden: true })).toBeDisabled();
  });
});
