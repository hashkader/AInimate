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

  it('reveals an ease-preset dropdown on selecting a non-last keyframe, and updates it', async () => {
    const user = userEvent.setup();
    render(<App />);

    // The rest-pose keyframe at frame 0 is not the last keyframe.
    await user.click(screen.getByRole('button', { name: /select keyframe at frame 0/i }));

    const select = screen.getByRole('combobox', { name: /ease out for keyframe at frame 0/i });
    expect(select).toHaveValue('linear');

    await user.selectOptions(select, 'easeInOut');
    expect(select).toHaveValue('easeInOut');
  });

  it('hides the ease-preset dropdown for the last keyframe', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /select keyframe at frame 24/i }));

    expect(screen.queryByRole('combobox', { name: /ease out/i })).not.toBeInTheDocument();
  });
});
