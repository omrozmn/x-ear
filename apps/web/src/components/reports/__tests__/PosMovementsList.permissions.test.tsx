import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PosMovementsList } from '../PosMovementsList';

vi.mock('@x-ear/ui-web', () => ({
  DataTable: ({ data, columns }: { data: Array<Record<string, unknown>>; columns: Array<Record<string, unknown>> }) => (
    <div>
      {data.map((item) => (
        <div key={String(item.id)}>
          {columns.map((column) => {
            const renderCell = column.render as ((value: unknown, row: Record<string, unknown>) => ReactNode) | undefined;
            const key = String(column.key);
            return (
              <div key={key}>
                {(renderCell ? renderCell(item[key], item) : item[key]) as ReactNode}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  ),
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

describe('PosMovementsList permissions', () => {
  it('shows hidden placeholders when financial details are restricted', () => {
    render(
      <PosMovementsList
        canViewFinancials={false}
        movements={[
          {
            id: 'pos_1',
            date: '2026-03-16T10:00:00Z',
            amount: 2500,
            status: 'paid',
            posTransactionId: 'txn_123',
            patientName: 'Ali Sahin', // legacy
            saleId: 'sale_1',
          } as never,
        ]}
      />
    );

    expect(screen.getAllByText('Bu rol icin gizli').length).toBeGreaterThanOrEqual(3);
  });
});
