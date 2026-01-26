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

interface MockedService {
  listDocuments: ReturnType<typeof vi.fn>;
  uploadDocument: ReturnType<typeof vi.fn>;
  deleteDocument: ReturnType<typeof vi.fn>;
}

interface MockedOutbox {
  addOperation: ReturnType<typeof vi.fn>;
}

interface MockedIndexedDB {
  saveFileBlob: ReturnType<typeof vi.fn>;
  getFileBlob: ReturnType<typeof vi.fn>;
}

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
    (sgkService as unknown as MockedService).listDocuments.mockResolvedValue({ data: [{ id: 'doc1' }] });

    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useSgkDocuments('party-1'), { wrapper });

    await waitFor(() => result.current.isSuccess);
    expect(sgkService.listDocuments).toHaveBeenCalledWith('party-1');
  });

  it('uploads a document and invalidates', async () => {
    (sgkService as unknown as MockedService).uploadDocument.mockResolvedValue({});
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useUploadSgkDocument('party-1'), { wrapper });

    act(() => {
      result.current.mutate({ file: new File(['test'], 'test.pdf'), idempotencyKey: 'key-1' });
    });

    await waitFor(() => result.current.isSuccess);
    expect(sgkService.uploadDocument).toHaveBeenCalled();
  });

  it('deletes a document and invalidates', async () => {
    (sgkService as unknown as MockedService).deleteDocument.mockResolvedValue({});
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useDeleteSgkDocument('party-1'), { wrapper });

    act(() => {
      result.current.mutate({ id: 'doc1', idempotencyKey: 'k1' });
    });

    await waitFor(() => result.current.isSuccess);
    expect(sgkService.deleteDocument).toHaveBeenCalledWith('doc1');
  });

  it('falls back to IndexedDB + outbox when upload fails (offline)', async () => {
    // Simulate network failure
    (sgkService as unknown as MockedService).uploadDocument.mockRejectedValue(new Error('Network error'));
    (indexedDBManager as unknown as MockedIndexedDB).saveFileBlob.mockResolvedValue('blob-123');
    (outbox as unknown as MockedOutbox).addOperation.mockResolvedValue({ id: 'op-1' });

    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useUploadSgkDocument('party-1'), { wrapper });

    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });

    act(() => {
      result.current.mutate({ file });
    });

    await waitFor(() => result.current.isSuccess);

    // ensure blob was saved and outbox operation queued
    expect(indexedDBManager.saveFileBlob).toHaveBeenCalled();
    expect(outbox.addOperation).toHaveBeenCalled();
    // returned data should be the queued temporary response
    const data = result.current.data;
    expect(data).toBeDefined();
    expect((data as Record<string, unknown>)?.data).toBeDefined();
    expect(((data as Record<string, unknown>)?.data as Record<string, unknown>)?.status).toBe('queued');
  });
});
