import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PartyOverviewTab } from '../PartyOverviewTab';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? '',
  }),
}));

vi.mock('../../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (permission: string) =>
      [
        'sensitive.parties.detail.contact.view',
        'sensitive.parties.detail.notes.view',
      ].includes(permission),
  }),
}));

const party = {
  id: 'pat_1',
  firstName: 'Ali',
  lastName: 'Sahin',
  phone: '05331000004',
  email: 'ali@example.com',
  tcNumber: '12345678901',
  createdAt: '2026-03-16T10:00:00Z',
  updatedAt: '2026-03-16T10:00:00Z',
  notes: [
    {
      id: 'note_1',
      text: 'Finansal takip notu',
      date: '2026-03-16T10:00:00Z',
      author: 'Admin',
    },
  ],
};

describe('PartyOverviewTab permissions', () => {
  it('shows hidden placeholder for identity without permission and keeps contact visible', () => {
    render(<PartyOverviewTab party={party} />);

    expect(screen.getByText('05331000004')).toBeInTheDocument();
    expect(screen.getByText('ali@example.com')).toBeInTheDocument();
    expect(screen.getByText('Bu rol icin gizli')).toBeInTheDocument();
  });
});
