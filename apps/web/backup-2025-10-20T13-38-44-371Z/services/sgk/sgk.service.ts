import {
  sgkGetPatientSgkDocuments,
  sgkUploadSgkDocument,
  sgkDeleteSgkDocument,
  sgkProcessOcr,
  automationTriggerSgkProcessing,
} from '@/generated/orval-api';
import axios from 'axios';

// Thin wrapper around Orval-generated SGK client methods.
// Only adapt shapes or inject headers (Idempotency-Key) where needed.
export const sgkService = {
  // Documents related endpoints
  listDocuments: (patientId: string, options?: any) =>
    // generated client expects (patientId: string, options?: AxiosRequestConfig)
    sgkGetPatientSgkDocuments(patientId, options),

  // Accepts the request body for the multipart/form-data (e.g. FormData) and optional headers
  uploadDocument: (body: FormData | Record<string, any>, opts?: { idempotencyKey?: string; options?: any }) =>
    sgkUploadSgkDocument(body as any, { ...(opts?.options || {}), headers: { 'Content-Type': 'multipart/form-data', ...(opts?.options?.headers || {}), ...(opts?.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}) } } as any),

  // Bulk upload for SGK processing
  uploadBulkDocuments: async (formData: FormData, opts?: { idempotencyKey?: string }) => {
    const response = await axios.post('/api/sgk/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(opts?.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
      },
    });
    return response;
  },

  deleteDocument: (documentId: string, opts?: { idempotencyKey?: string; options?: any }) =>
    sgkDeleteSgkDocument(documentId, { ...(opts?.options || {}), headers: { ...(opts?.options?.headers || {}), ...(opts?.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}) } } as any),

  // OCR / processing helpers
  processOcr: (body?: any, opts?: any) => sgkProcessOcr(body, opts),
  triggerProcessing: (body?: any, opts?: any) => automationTriggerSgkProcessing(body, opts),
};

export default sgkService;
