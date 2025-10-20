import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import utsService from '@/services/uts/uts.service';

const QUERY_KEY = ['uts', 'registrations'] as const;

export function useUtsRegistrations(params?: any) {
  return useQuery({ queryKey: QUERY_KEY, queryFn: () => utsService.listRegistrations(params) });
}

export function useStartBulkUtsRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => utsService.startBulkRegistration(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUtsJobStatus(jobId: string) {
  // Basic status query — useful for one-off checks
  return useQuery({ queryKey: ['uts', 'job', jobId], queryFn: () => utsService.getJobStatus(jobId), enabled: !!jobId });
}

export function usePollUtsJob(jobId: string, opts?: { interval?: number; onComplete?: (data:any)=>void }) {
  // Poll the job status until terminal state
  const interval = opts?.interval ?? 3000;
  return useQuery(({
    queryKey: ['uts', 'job', jobId, 'poll'],
    queryFn: () => utsService.getJobStatus(jobId),
    enabled: !!jobId,
    refetchInterval: (data: any) => {
      if (!data) return interval;
      const status = (data as any).status;
      // consider 'completed', 'failed', 'cancelled' as terminal
      if (status === 'completed' || status === 'failed' || status === 'cancelled') return false;
      return interval;
    },
    onSuccess: (data: any) => {
      const status = (data as any)?.status;
      if (status === 'completed' && opts?.onComplete) opts.onComplete(data);
    }
  } as any));
}

export default useUtsRegistrations;
