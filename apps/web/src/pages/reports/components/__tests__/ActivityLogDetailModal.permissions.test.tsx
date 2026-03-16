import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActivityLogDetailModal } from '../ActivityLogDetailModal';

vi.mock('../../../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: () => false,
  }),
}));

describe('ActivityLogDetailModal permissions', () => {
  it('hides detail payload when role lacks activity detail permission', () => {
    render(
      <ActivityLogDetailModal
        log={{
          id: 'log_1',
          action: 'Payment Record Created',
          entityType: 'party',
          entityId: 'pat_1',
          createdAt: '2026-03-16T10:00:00Z',
          userName: 'Admin',
          userEmail: 'admin@example.com',
          isCritical: false,
          details: { amount: 500, paymentType: 'payment' },
        } as never}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Bu rol icin log detay verisi gizli.')).toBeInTheDocument();
    expect(screen.queryByText('admin@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText('500')).not.toBeInTheDocument();
  });
});
