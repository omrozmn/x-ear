import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import sgkService from '@/services/sgk/sgk.service';

const QUERY_KEY = (patientId: string) => ['patients', patientId, 'sgk-documents'] as const;

export function useSgkDocuments(patientId: string) {
  return useQuery({ queryKey: QUERY_KEY(patientId), queryFn: () => sgkService.listDocuments(patientId) });
}

export function useUploadSgkDocument(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData | Record<string, any> & { idempotencyKey?: string }) =>
      sgkService.uploadDocument(formData as any, { idempotencyKey: (formData as any).idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(patientId) }),
  });
}

export function useDeleteSgkDocument(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, idempotencyKey }: { id: string; idempotencyKey?: string }) =>
      sgkService.deleteDocument(id, { idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(patientId) }),
  });
}

export default useSgkDocuments;
