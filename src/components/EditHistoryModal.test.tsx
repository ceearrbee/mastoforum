import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditHistoryModal from './EditHistoryModal';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ client: undefined, credentials: null }),
}));

describe('EditHistoryModal', () => {
  it('renders under document.body, outside a clipping ancestor', () => {
    const qc = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={qc}>
        <div style={{ overflow: 'hidden', containerType: 'inline-size' }}>
          <EditHistoryModal statusId="s1" open onClose={vi.fn()} />
        </div>
      </QueryClientProvider>,
    );
    expect(container.querySelector('.cds--modal')).toBeNull();
    expect(document.body.querySelector(':scope > .cds--modal')).not.toBeNull();
  });
});
