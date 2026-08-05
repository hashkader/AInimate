import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
