import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import utsService, { type UtsConfigUpdate, type UtsMovementRequest, type UtsSerialStateUpsertRequest } from '@/services/uts/uts.service';

interface UtsJobStatus {
  status: string;
  [key: string]: unknown;
}

const isUtsJobStatus = (data: unknown): data is UtsJobStatus => {
  return typeof data === 'object' && data !== null && 'status' in data;
};

const UTS_CONFIG_QUERY_KEY = ['uts', 'config'] as const;
const UTS_REGISTRATIONS_QUERY_KEY = ['uts', 'registrations'] as const;

export function useUtsConfig() {
  return useQuery({
    queryKey: UTS_CONFIG_QUERY_KEY,
    queryFn: () => utsService.getConfig(),
  });
}

export function useUpdateUtsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UtsConfigUpdate) => utsService.updateConfig(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UTS_CONFIG_QUERY_KEY });
    },
  });
}

export function useUtsSerialStates(params?: { status?: 'owned' | 'pending_receipt' | 'not_owned'; inventoryId?: string; search?: string }) {
  return useQuery({
    queryKey: ['uts', 'serial-states', params],
    queryFn: () => utsService.listSerialStates(params),
  });
}

export function useUpsertUtsSerialState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UtsSerialStateUpsertRequest) => utsService.upsertSerialState(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uts', 'serial-states'] });
    },
  });
}

export function useQueryUtsTekilUrun() {
  return useMutation({
    mutationFn: (body: { productNumber: string; serialNumber?: string; lotBatchNumber?: string }) => utsService.queryTekilUrun(body),
  });
}

export function useExecuteUtsVerme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UtsMovementRequest) => utsService.executeVerme(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uts', 'serial-states'] });
    },
  });
}

export function useExecuteUtsAlma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UtsMovementRequest) => utsService.executeAlma(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uts', 'serial-states'] });
    },
  });
}

export function useTestUtsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => utsService.testConfig(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UTS_CONFIG_QUERY_KEY });
    },
  });
}

export function useRunUtsSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => utsService.runSync(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uts'] });
      qc.invalidateQueries({ queryKey: ['uts', 'serial-states'] });
    },
  });
}

export function useUtsRegistrations() {
  return useQuery({
    queryKey: UTS_REGISTRATIONS_QUERY_KEY,
    queryFn: () => utsService.listRegistrations(),
  });
}

export function useStartBulkUtsRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => utsService.createUtRegistrationBulk(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: UTS_REGISTRATIONS_QUERY_KEY }),
  });
}

export function useUtsJobStatus(jobId: string) {
  return useQuery({
    queryKey: ['uts', 'job', jobId],
    queryFn: () => utsService.getUtJob(jobId),
    enabled: !!jobId,
  });
}

export function usePollUtsJob(jobId: string, opts?: { interval?: number; onComplete?: (data: unknown) => void }) {
  const interval = opts?.interval ?? 3000;
  const query = useQuery({
    queryKey: ['uts', 'job', jobId, 'poll'],
    queryFn: () => utsService.getUtJob(jobId),
    enabled: !!jobId,
    refetchInterval: (data) => {
      if (!data) return interval;
      if (isUtsJobStatus(data)) {
        const { status } = data;
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
          return false;
        }
      }
      return interval;
    },
  });

  useEffect(() => {
    if (query.data && isUtsJobStatus(query.data) && query.data.status === 'completed' && opts?.onComplete) {
      opts.onComplete(query.data);
    }
  }, [opts, query.data]);

  return query;
}

export default useUtsRegistrations;
