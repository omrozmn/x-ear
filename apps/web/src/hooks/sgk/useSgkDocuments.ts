import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import sgkService from '@/services/sgk/sgk.service';
import { outbox } from '@/utils/outbox';
import { indexedDBManager } from '@/utils/indexeddb';

const generateIdempotencyKey = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const QUERY_KEY = (patientId: string) => ['patients', patientId, 'sgk-documents'] as const;

export function useSgkDocuments(patientId: string) {
  return useQuery({ queryKey: QUERY_KEY(patientId), queryFn: () => sgkService.listDocuments(patientId) });
}

export function useUploadSgkDocument(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData | Record<string, any> & { idempotencyKey?: string }) => {
      const idempotencyKey = (formData as any).idempotencyKey || generateIdempotencyKey();

      try {
        return await sgkService.uploadDocument(formData as any, { idempotencyKey });
      } catch (err) {
        // On network/offline failure, serialize file blob to IndexedDB and enqueue outbox operation
        try {
          const file = (formData as any).get ? (formData as FormData).get('file') : (formData as any).file || (formData as any)[0];
          if (file instanceof Blob) {
            const blobId = await indexedDBManager.saveFileBlob(file as Blob, { filename: (file as any).name, mime: (file as any).type });
            await outbox.addOperation({
              method: 'POST',
              endpoint: `/api/sgk/documents?patientId=${encodeURIComponent(patientId)}`,
              data: { blobId, filename: (file as any).name, mime: (file as any).type },
              headers: { 'Idempotency-Key': idempotencyKey },
              maxRetries: 5,
            });
            // Return a temporary response to the UI so it can show optimistic state
            return { data: { id: `temp-${Date.now()}`, filename: (file as any).name, status: 'queued' } };
          }
        } catch (e) {
          console.warn('Failed to enqueue upload to outbox:', e);
        }

        throw err;
      }
    },
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
