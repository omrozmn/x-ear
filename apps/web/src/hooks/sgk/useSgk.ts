import { useMutation, useQueryClient } from '@tanstack/react-query';
import sgkService from '@/services/sgk/sgk.service';

// Note: The OpenAPI/Orval-generated client in this repo exposes SGK document endpoints and OCR/processing
// helpers (sgkGetPatientSgkDocuments, sgkUploadSgkDocument, sgkDeleteSgkDocument, ocrProcessDocument, automationTriggerSgkProcessing).
// There are no generic CRUD endpoints for "SGK records" in the generated client. We expose processing hooks
// and provide clear placeholders for CRUD once backend endpoints exist.

export function useProcessSgkOcr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: any) => sgkService.processOcr(body),
    onSuccess: () => {
      // Invalidate potentially affected queries (patient documents may change after OCR)
      qc.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useTriggerSgkProcessing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: any) => sgkService.triggerProcessing(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}

// Placeholder CRUD hooks for SGK records. Backend currently doesn't expose these endpoints in the generated client.
// Keep these small and explicit so we can implement them when backend is available.
export function useSgkList() {
  throw new Error('useSgkList: not implemented — backend SGK list endpoint not present in API client');
}

export function useSgk() {
  throw new Error('useSgk: not implemented — backend SGK get endpoint not present in API client');
}

export function useCreateSgk() {
  throw new Error('useCreateSgk: not implemented — backend SGK create endpoint not present in API client');
}

export function useUpdateSgk() {
  throw new Error('useUpdateSgk: not implemented — backend SGK update endpoint not present in API client');
}

export function useDeleteSgk() {
  throw new Error('useDeleteSgk: not implemented — backend SGK delete endpoint not present in API client');
}

export default useProcessSgkOcr;
