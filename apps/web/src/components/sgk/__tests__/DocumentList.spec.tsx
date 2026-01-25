// Test globals - using vitest types
import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

// Mock ui primitives to avoid loading the real Modal (which depends on browser internals/hooks)
vi.mock('@x-ear/ui-web', () => ({
  __esModule: true,
  Button: (props: React.ComponentProps<'button'>) => React.createElement('button', props, props.children),
  Input: (props: React.ComponentProps<'input'>) => React.createElement('input', props),
  Modal: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  Card: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => React.createElement('div', { 'data-testid': 'card', ...props }, children),
  CardContent: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => React.createElement('div', props, children),
  Badge: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => React.createElement('span', props, children),
  FileUpload: (props: React.ComponentProps<'input'>) => React.createElement('input', { type: 'file', ...props }),
}));

vi.mock('@/hooks/sgk/useSgkDocuments', () => ({
  useSgkDocuments: (_partyId: string) => ({ data: { data: [{ id: 'temp-1', filename: 'f.txt', status: 'queued' }] }, isLoading: false, isError: false }),
  useUploadSgkDocument: (_partyId: string) => ({ mutate: vi.fn(), isLoading: false }),
  useDeleteSgkDocument: (_partyId: string) => ({ mutate: vi.fn() }),
}));

import DocumentList from '../DocumentList';

describe('DocumentList', () => {
  it('shows queued badge for queued documents', () => {
    render(<DocumentList partyId="party-1" />);
    expect(screen.getByText(/Queued/i)).toBeInTheDocument();
  });
});
