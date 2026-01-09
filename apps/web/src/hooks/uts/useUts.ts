import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import utsService from '@/services/uts/uts.service';
import type { ListUtRegistrationsParams, BulkRegistration } from '@/api/generated/schemas';

interface UtsJobStatus {
  status: string;
  [key: string]: unknown;
}

const isUtsJobStatus = (data: unknown): data is UtsJobStatus => {
  return typeof data === 'object' && data !== null && 'status' in data;
};

const QUERY_KEY = ['uts', 'registrations'] as const;

export function useUtsRegistrations(params?: ListUtRegistrationsParams) {
  return useQuery({ queryKey: QUERY_KEY, queryFn: () => utsService.listRegistrations(params) });
}

export function useStartBulkUtsRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkRegistration) => utsService.createUtRegistrationBulk(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUtsJobStatus(jobId: string) {
  // Basic status query — useful for one-off checks
  return useQuery({ queryKey: ['uts', 'job', jobId], queryFn: () => utsService.getUtJob(jobId), enabled: !!jobId });
}



export function usePollUtsJob(jobId: string, opts?: { interval?: number; onComplete?: (data: unknown) => void }) {
  // Poll the job status until terminal state
  const interval = opts?.interval ?? 3000;
  const query = useQuery({
    queryKey: ['uts', 'job', jobId, 'poll'],
    queryFn: () => utsService.getUtJob(jobId),
    enabled: !!jobId,
    refetchInterval: (data) => {
      if (!data) return interval;
      if (isUtsJobStatus(data)) {
        const { status } = data;
        // consider 'completed', 'failed', 'cancelled' as terminal
        if (status === 'completed' || status === 'failed' || status === 'cancelled') return false;
      }
      return interval;
    },
  });

  useEffect(() => {
    if (query.data && isUtsJobStatus(query.data)) {
      const { status } = query.data;
      if (status === 'completed' && opts?.onComplete) {
        opts.onComplete(query.data);
      }
    }
  }, [query.data, opts?.onComplete]);

  return query;
}

export default useUtsRegistrations;
