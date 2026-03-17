import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PartyListPage } from '../PartyListPage';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../../hooks/useParties', () => ({
  useParties: () => ({
    data: {
      parties: [
        {
          id: 'pat_1',
          firstName: 'Ali',
          lastName: 'Sahin',
          phone: null,
          email: null,
          tcNumber: null,
          createdAt: '2026-03-16T10:00:00Z',
          updatedAt: '2026-03-16T10:00:00Z',
          status: 'active',
          segment: 'NEW',
        },
      ],
      total: 1,
      hasMore: false,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../../hooks/party/usePartyMutations', () => ({
  usePartyMutations: () => ({
    createParty: vi.fn(),
    updateParty: vi.fn(),
    deleteParty: vi.fn(),
    loading: false,
    error: null,
    isOnline: true,
    clearError: vi.fn(),
  }),
}));

vi.mock('../../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (permission: string) => permission === 'parties.view',
  }),
}));

vi.mock('../../../components/parties/PartySearch', () => ({
  PartySearch: () => <div>PartySearch</div>,
}));

vi.mock('../../../components/parties/PartyFilters', () => ({
  PartyFilters: () => <div>PartyFilters</div>,
}));

vi.mock('../../../components/parties/PartyFormModal', () => ({
  PartyFormModal: () => null,
}));

describe('PartyListPage permissions', () => {
  it('shows hidden placeholders for masked contact fields', () => {
    render(<PartyListPage />);

    expect(screen.getAllByText('Bu rol icin gizli').length).toBeGreaterThanOrEqual(2);
  });
});
