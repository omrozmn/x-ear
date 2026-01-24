
import { sgkService as fullSgkService } from '../sgk.service';
import type { SGKDocumentFormData, OCRProcessingRequest, SGKWorkflowStatus, CreateSGKDocumentData } from '../../types/sgk';

// Type definitions for SGK service
interface SGKDocumentBody {
  partyId?: string;
  documentType?: string;
  file?: File | Blob;
  [key: string]: unknown;
}

interface SGKProcessRequest {
  documentId?: string;
  partyId?: string;
  [key: string]: unknown;
}

// SGK Service - handles SGK document operations
export const sgkService = {
  // Upload SGK document
  uploadDocument: (body?: SGKDocumentBody) => fullSgkService.createDocument(body as unknown as CreateSGKDocumentData),

  // Delete SGK document
  deleteDocument: (documentId: string) => fullSgkService.deleteDocument(documentId),

  // List SGK documents for a party
  listDocuments: (partyId: string) => fullSgkService.getDocuments({ partyId }),

  // Process OCR
  processOcr: (body?: SGKProcessRequest) => fullSgkService.processDocument(body as unknown as OCRProcessingRequest),

  // Trigger SGK processing
  triggerProcessing: (body?: SGKProcessRequest) => fullSgkService.createWorkflow(body?.partyId || ''),

  // Workflow methods from the full SGK service
  getWorkflow: (workflowId: string) => fullSgkService.getWorkflow(workflowId),
  updateWorkflowStatus: (workflowId: string, status: SGKWorkflowStatus, notes?: string) => fullSgkService.updateWorkflowStatus(workflowId, status, notes),
  createWorkflow: (partyId: string, documentId?: string, workflowType?: string) => fullSgkService.createWorkflow(partyId, documentId, workflowType),

  // Document management methods from the full SGK service
  validateDocument: (data: SGKDocumentFormData) => fullSgkService.validateDocument(data),
  createDocument: (data: SGKDocumentBody) => fullSgkService.createDocument(data as unknown as CreateSGKDocumentData),
  processDocument: (request: SGKProcessRequest) => fullSgkService.processDocument(request as unknown as OCRProcessingRequest),
  updateDocumentStatus: (id: string, status: SGKWorkflowStatus) => fullSgkService.updateWorkflowStatus(id, status),
};

export default sgkService;
