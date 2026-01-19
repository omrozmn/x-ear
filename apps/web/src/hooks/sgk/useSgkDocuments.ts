import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import sgkService from '@/services/sgk/sgk.service';
import { outbox } from '@/utils/outbox';
import { indexedDBManager } from '@/utils/indexeddb';

const generateIdempotencyKey = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const QUERY_KEY = (partyId: string) => ['parties', partyId, 'sgk-documents'] as const;

export function useSgkDocuments(partyId: string) {
  return useQuery({ queryKey: QUERY_KEY(partyId), queryFn: () => sgkService.listDocuments(partyId) });
}

export function useUploadSgkDocument(partyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FormData | { file: File; idempotencyKey?: string }) => {
      let documentData: FormData;
      let file: File | null = null;
      let idempotencyKey: string;

      if (input instanceof FormData) {
        documentData = input;
        const potentialFile = input.get('file');
        file = potentialFile instanceof File ? potentialFile : null;
        idempotencyKey = (input.get('idempotencyKey') as string) || generateIdempotencyKey();
      } else {
        // Construct FormData from object
        documentData = new FormData();
        documentData.append('file', input.file);
        file = input.file;
        idempotencyKey = input.idempotencyKey || generateIdempotencyKey();
      }

      try {
        // Upload document - sgkService.uploadDocument takes BodySgkCreateSgkDocuments which is { file: Blob }
        const body: any = { file: file as Blob }; // Service expects object with file property, assuming generated client structure

        // Actually sgkService.uploadDocument likely takes the generated body type.
        // We pass the object wrapper as expected by generated clients usually.
        return await sgkService.uploadDocument({ file: file as Blob });
      } catch (err) {
        // On network/offline failure, serialize file blob to IndexedDB and enqueue outbox operation
        try {
          if (file && ((file as any) instanceof File || (file as any) instanceof Blob)) {
            const fileObj = file as File; // Blob might not have name, but input says File
            const filename = fileObj.name || 'unknown_file';
            const mime = fileObj.type || 'application/octet-stream';

            const blobId = await indexedDBManager.saveFileBlob(fileObj, { filename, mime });
            await outbox.addOperation({
              method: 'POST',
              endpoint: `/api/sgk/documents?partyId=${encodeURIComponent(partyId)}`,
              data: { blobId, filename, mime },
              headers: { 'Idempotency-Key': idempotencyKey },
              maxRetries: 5,
            });
            // Return a temporary response to the UI so it can show optimistic state
            return { data: { id: `temp-${Date.now()}`, filename, status: 'queued' } };
          }
        } catch (e) {
          console.warn('Failed to enqueue upload to outbox:', e);
        }

        throw err;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(partyId) }),
  });
}

export function useUploadSgkDocuments() {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      return await sgkService.uploadDocument(formData);
    },
  });
}

export function useDeleteSgkDocument(partyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; idempotencyKey?: string }) => {
      return await sgkService.deleteDocument(data.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY(partyId) }),
  });
}

export default useSgkDocuments;
