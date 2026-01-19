import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const createClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

vi.mock('../../services/sgk/sgk.service', () => ({
  __esModule: true,
  default: {
    listDocuments: vi.fn(),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}));
import sgkService from '../../services/sgk/sgk.service';
vi.mock('../../utils/outbox', () => ({
  __esModule: true,
  outbox: {
    addOperation: vi.fn(),
  },
}));
vi.mock('../../utils/indexeddb', () => ({
  __esModule: true,
  indexedDBManager: {
    saveFileBlob: vi.fn(),
    getFileBlob: vi.fn(),
  },
}));
import { outbox } from '../../utils/outbox';
import { indexedDBManager } from '../../utils/indexeddb';
import { useSgkDocuments, useUploadSgkDocument, useDeleteSgkDocument } from './useSgkDocuments';

describe('useSgkDocuments hooks', () => {
  let qc: QueryClient;
  beforeEach(() => {
    qc = createClient();
  });
  afterEach(() => {
    qc.clear();
    vi.resetAllMocks();
  });

  it('fetches documents with useSgkDocuments', async () => {
    (sgkService.listDocuments as any).mockResolvedValue({ data: [{ id: 'doc1' }] });

    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useSgkDocuments('party-1'), { wrapper });

    await waitFor(() => (result.current as any).isSuccess);
    expect(sgkService.listDocuments).toHaveBeenCalledWith('party-1');
  });

  it('uploads a document and invalidates', async () => {
    (sgkService.uploadDocument as any).mockResolvedValue({});
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useUploadSgkDocument('party-1'), { wrapper });

    act(() => {
      (result.current as any).mutate({ append: 'data', idempotencyKey: 'key-1' } as any);
    });

    await waitFor(() => (result.current as any).isSuccess);
    expect(sgkService.uploadDocument).toHaveBeenCalled();
  });

  it('deletes a document and invalidates', async () => {
    (sgkService.deleteDocument as any).mockResolvedValue({});
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useDeleteSgkDocument('party-1'), { wrapper });

    act(() => {
      (result.current as any).mutate({ id: 'doc1', idempotencyKey: 'k1' });
    });

    await waitFor(() => (result.current as any).isSuccess);
    expect(sgkService.deleteDocument).toHaveBeenCalledWith('doc1');
  });

  it('falls back to IndexedDB + outbox when upload fails (offline)', async () => {
    // Simulate network failure
    (sgkService.uploadDocument as any).mockRejectedValue(new Error('Network error'));
    (indexedDBManager.saveFileBlob as any).mockResolvedValue('blob-123');
    (outbox.addOperation as any).mockResolvedValue({ id: 'op-1' });

    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useUploadSgkDocument('party-1'), { wrapper });

    const file = new Blob(['hello'], { type: 'text/plain' });

    act(() => {
      (result.current as any).mutate({ file }, {});
    });

    await waitFor(() => (result.current as any).isSuccess);

    // ensure blob was saved and outbox operation queued
    expect(indexedDBManager.saveFileBlob).toHaveBeenCalled();
    expect(outbox.addOperation).toHaveBeenCalled();
    // returned data should be the queued temporary response
    const data = (result.current as any).data;
    expect(data).toBeDefined();
    expect(data.data?.status).toBe('queued');
  });
});
