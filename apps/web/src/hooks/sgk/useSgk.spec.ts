import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../../services/sgk/sgk.service', () => ({
  __esModule: true,
  default: {
    processOcr: vi.fn(),
    triggerProcessing: vi.fn(),
  },
}));

import sgkService from '../../services/sgk/sgk.service';
import { useProcessSgkOcr, useTriggerSgkProcessing } from './useSgk';

const createClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('useSgk processing hooks', () => {
  let qc: QueryClient;
  beforeEach(() => (qc = createClient()));
  afterEach(() => {
    qc.clear();
    vi.resetAllMocks();
  });

  it('calls processOcr', async () => {
    (sgkService.processOcr as any).mockResolvedValue({});
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useProcessSgkOcr(), { wrapper });

    act(() => {
      (result.current as any).mutate({});
    });

    await waitFor(() => (result.current as any).isSuccess);
    expect(sgkService.processOcr).toHaveBeenCalled();
  });

  it('calls triggerProcessing', async () => {
    (sgkService.triggerProcessing as any).mockResolvedValue({});
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useTriggerSgkProcessing(), { wrapper });

    act(() => {
      (result.current as any).mutate({});
    });

    await waitFor(() => (result.current as any).isSuccess);
    expect(sgkService.triggerProcessing).toHaveBeenCalled();
  });
});
