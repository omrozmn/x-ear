
import { sgkService as fullSgkService } from '../sgk.service';

// SGK Service - handles SGK document operations
export const sgkService = {
  // Upload SGK document
  uploadDocument: (body?: any) => fullSgkService.createDocument(body),

  // Delete SGK document
  deleteDocument: (documentId: string) => fullSgkService.deleteDocument(documentId),

  // List SGK documents for a party
  listDocuments: (partyId: string) => fullSgkService.getDocuments({ partyId }),

  // Process OCR
  processOcr: (body?: any) => fullSgkService.processDocument(body),

  // Trigger SGK processing
  triggerProcessing: (body?: any) => fullSgkService.createWorkflow(body?.partyId),

  // Workflow methods from the full SGK service
  getWorkflow: (workflowId: string) => fullSgkService.getWorkflow(workflowId),
  updateWorkflowStatus: (workflowId: string, status: any, notes?: string) => fullSgkService.updateWorkflowStatus(workflowId, status, notes),
  createWorkflow: (partyId: string, documentId?: string, workflowType?: string) => fullSgkService.createWorkflow(partyId, documentId, workflowType),

  // Document management methods from the full SGK service
  validateDocument: (data: any) => fullSgkService.validateDocument(data),
  createDocument: (data: any) => fullSgkService.createDocument(data),
  processDocument: (request: any) => fullSgkService.processDocument(request),
  updateDocumentStatus: (id: string, status: any) => fullSgkService.updateWorkflowStatus(id, status),
};

export default sgkService;
