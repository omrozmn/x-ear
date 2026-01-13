// Test globals - using vitest types
import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

// Mock ui primitives to avoid loading the real Modal (which depends on browser internals/hooks)
vi.mock('@x-ear/ui-web', () => ({
  __esModule: true,
  Button: (props: any) => React.createElement('button', props, props.children),
  Input: (props: any) => React.createElement('input', props),
  Modal: ({ children }: any) => React.createElement('div', null, children),
  Card: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'card', ...props }, children),
  CardContent: ({ children, ...props }: any) => React.createElement('div', props, children),
  Badge: ({ children, ...props }: any) => React.createElement('span', props, children),
  FileUpload: (props: any) => React.createElement('input', { type: 'file', ...props }),
}));

vi.mock('@/hooks/sgk/useSgkDocuments', () => ({
  useSgkDocuments: (patientId: string) => ({ data: { data: [{ id: 'temp-1', filename: 'f.txt', status: 'queued' }] }, isLoading: false, isError: false }),
  useUploadSgkDocument: (patientId: string) => ({ mutate: vi.fn(), isLoading: false }),
  useDeleteSgkDocument: (patientId: string) => ({ mutate: vi.fn() }),
}));

import DocumentList from '../DocumentList';

describe('DocumentList', () => {
  it('shows queued badge for queued documents', () => {
    render(<DocumentList patientId="patient-1" />);
    expect(screen.getByText(/Queued/i)).toBeInTheDocument();
  });
});
