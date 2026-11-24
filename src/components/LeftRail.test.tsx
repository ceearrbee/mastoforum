import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import LeftRail from './LeftRail';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ client: undefined, credentials: { url: 'https://home.example', token: 't' } }),
}));

describe('LeftRail', () => {
  it('links to the muted accounts page', () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <LeftRail />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('link', { name: 'Muted accounts' })).toHaveAttribute('href', '/mutes');
  });
});
