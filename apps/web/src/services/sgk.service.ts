// SGK Service for X-Ear CRM
// Modern TypeScript service for SGK document management, workflow, and e-receipt processing

import {
  SGKDocument,
  SGKWorkflow,
  SGKStatusEntry,
  EReceipt,
  UTSRecord,
  SGKPartyInfo,
  SGKDocumentFilters,
  SGKSearchResult,
  SGKStats,
  OCRProcessingResult,
  SGKDocumentFormData,
  CreateSGKDocumentData,
  UpdateSGKDocumentData,
  CreateEReceiptData,
  UpdateEReceiptData,
  OCRProcessingRequest,
  SGKWorkflowStatus,
  EReceiptMaterial,
  EReceiptFormData,
  SGKValidation,
  BulkSGKOperation,
  BulkOperationResult
} from '../types/sgk';
import { apiClient } from '../api/orval-mutator';
import { outbox, OutboxOperation } from '../utils/outbox';
import { SGK_DATA, SGK_DOCUMENTS } from '../constants/storage-keys';
import {
  createSgkWorkflowCreate,
  updateSgkWorkflowStatus,
  getSgkWorkflow,
  listSgkEReceiptDownloadPatientForm
} from '@/api/client/sgk.client';
import { WorkflowStatusUpdate, WorkflowCreateRequest } from '@/api/generated/schemas';

export class SGKService {
  private documents: SGKDocument[] = [];
  private workflows: SGKWorkflow[] = [];
  private eReceipts: EReceipt[] = [];
  private utsRecords: UTSRecord[] = [];
  private initialized = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    await this.loadData();
    this.initialized = true;

    // Listen for storage changes
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  private async loadData(): Promise<void> {
    try {
      // Load SGK documents
      const documentsData = localStorage.getItem(SGK_DOCUMENTS);
      if (documentsData) {
        this.documents = JSON.parse(documentsData);
      }

      // Load workflows
      const workflowsData = localStorage.getItem(SGK_DATA);
      if (workflowsData) {
        const data = JSON.parse(workflowsData);
        this.workflows = data.workflows || [];
        this.eReceipts = data.eReceipts || [];
        this.utsRecords = data.utsRecords || [];
      }

      // Initialize with sample data if empty
      if (this.documents.length === 0) {
        await this.initializeSampleData();
      }
    } catch (error) {
      console.error('Error loading SGK data:', error);
      await this.initializeSampleData();
    }
  }

  private async initializeSampleData(): Promise<void> {
    const sampleDocuments: SGKDocument[] = [
      {
        id: 'sgk-doc-1',
        partyId: 'party-1',
        filename: 'sgk-rapor-001.pdf',
        documentType: 'rapor',
        fileUrl: '/uploads/sgk-rapor-001.pdf',
        fileSize: 245760,
        mimeType: 'application/pdf',
        ocrText: 'SGK Raporu - Hasta: Ahmet Yılmaz - TC: 12345678901',
        extractedInfo: {
          partyName: 'Ahmet Yılmaz',
          tcNumber: '12345678901',
          reportNumber: 'RPT-2024-001',
          reportDate: '2024-01-15',
          validityDate: '2024-07-15',
          confidence: 0.95,
          extractionMethod: 'ocr'
        },
        processingStatus: 'completed',
        uploadedBy: 'user-1',
        uploadedAt: '2024-01-15T10:00:00Z',
        processedAt: '2024-01-15T10:05:00Z',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:05:00Z'
      }
    ];

    const sampleWorkflows: SGKWorkflow[] = [
      {
        id: 'workflow-1',
        documentId: 'sgk-doc-1',
        partyId: 'party-1',
        currentStatus: 'approved',
        statusHistory: [
          {
            status: 'draft',
            timestamp: '2024-01-15T10:00:00Z',
            userId: 'user-1',
            userName: 'Admin User'
          },
          {
            status: 'submitted',
            timestamp: '2024-01-15T11:00:00Z',
            userId: 'user-1',
            userName: 'Admin User'
          },
          {
            status: 'approved',
            timestamp: '2024-01-16T09:00:00Z',
            systemGenerated: true
          }
        ],
        submittedDate: '2024-01-15T11:00:00Z',
        approvalDate: '2024-01-16T09:00:00Z',
        deadline: '2024-02-15T23:59:59Z',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-16T09:00:00Z',
        createdBy: 'user-1'
      }
    ];

    this.documents = sampleDocuments;
    this.workflows = sampleWorkflows;
    await this.saveData();
  }

  private async saveData(): Promise<void> {
    try {
      localStorage.setItem(SGK_DOCUMENTS, JSON.stringify(this.documents));
      localStorage.setItem(SGK_DATA, JSON.stringify({
        workflows: this.workflows,
        eReceipts: this.eReceipts,
        utsRecords: this.utsRecords
      }));
    } catch (error) {
      console.error('Error saving SGK data:', error);
    }
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === SGK_DOCUMENTS || event.key === SGK_DATA) {
      this.loadData();
    }
  }

  // Document Management
  async getDocuments(filters?: SGKDocumentFilters): Promise<SGKSearchResult> {
    await this.init();

    let filteredDocuments = [...this.documents];

    if (filters) {
      if (filters.partyId) {
        filteredDocuments = filteredDocuments.filter(doc => doc.partyId === filters.partyId);
      }

      if (filters.documentType) {
        filteredDocuments = filteredDocuments.filter(doc => doc.documentType === filters.documentType);
      }

      if (filters.status) {
        filteredDocuments = filteredDocuments.filter(doc => {
          const workflow = this.workflows.find(w => w.documentId === doc.id);
          return workflow?.currentStatus === filters.status;
        });
      }

      if (filters.processingStatus) {
        filteredDocuments = filteredDocuments.filter(doc => doc.processingStatus === filters.processingStatus);
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredDocuments = filteredDocuments.filter(doc =>
          doc.filename.toLowerCase().includes(searchLower) ||
          doc.ocrText?.toLowerCase().includes(searchLower) ||
          doc.extractedInfo?.partyName?.toLowerCase().includes(searchLower)
        );
      }

      if (filters.dateRange) {
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        filteredDocuments = filteredDocuments.filter(doc => {
          const docDate = new Date(doc.createdAt);
          return docDate >= startDate && docDate <= endDate;
        });
      }
    }

    // Sort by creation date (newest first)
    filteredDocuments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      documents: filteredDocuments,
      total: filteredDocuments.length,
      page: 1,
      pageSize: filteredDocuments.length,
      hasMore: false
    };
  }

  async getDocument(id: string): Promise<SGKDocument | null> {
    await this.init();
    return this.documents.find(doc => doc.id === id) || null;
  }

  async createDocument(data: CreateSGKDocumentData): Promise<SGKDocument> {
    await this.init();

    const document: SGKDocument = {
      ...data,
      id: `sgk-doc-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.documents.push(document);
    await this.saveData();

    // Queue API call
    const operation: OutboxOperation = {
      method: 'POST',
      endpoint: '/api/sgk/documents',
      data: document,
      headers: {
        'Idempotency-Key': `create-sgk-doc-${document.id}-${Date.now()}`
      }
    };
    outbox.addOperation(operation);

    return document;
  }

  async updateDocument(id: string, data: Partial<UpdateSGKDocumentData>): Promise<SGKDocument> {
    await this.init();

    const index = this.documents.findIndex(doc => doc.id === id);
    if (index === -1) {
      throw new Error('Document not found');
    }

    const updatedDocument = {
      ...this.documents[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    this.documents[index] = updatedDocument;
    await this.saveData();

    // Queue API call
    const operation: OutboxOperation = {
      method: 'PUT',
      endpoint: `/api/sgk/documents/${id}`,
      data: updatedDocument,
      headers: {
        'Idempotency-Key': `update-sgk-doc-${id}-${Date.now()}`
      }
    };
    outbox.addOperation(operation);

    return updatedDocument;
  }

  async deleteDocument(id: string): Promise<void> {
    await this.init();

    const index = this.documents.findIndex(doc => doc.id === id);
    if (index === -1) {
      throw new Error('Document not found');
    }

    this.documents.splice(index, 1);

    // Also remove associated workflow
    const workflowIndex = this.workflows.findIndex(w => w.documentId === id);
    if (workflowIndex !== -1) {
      this.workflows.splice(workflowIndex, 1);
    }

    await this.saveData();

    // Queue API call
    const operation: OutboxOperation = {
      method: 'DELETE',
      endpoint: `/api/sgk/documents/${id}`,
      headers: {
        'Idempotency-Key': `delete-sgk-doc-${id}-${Date.now()}`
      }
    };
    outbox.addOperation(operation);
  }

  // OCR Processing
  async processDocument(request: OCRProcessingRequest): Promise<OCRProcessingResult> {
    await this.init();

    // Queue OCR processing request
    const operation: OutboxOperation = {
      method: 'POST',
      endpoint: '/api/ocr/process',
      data: request,
      headers: {
        'Idempotency-Key': `ocr-process-${Date.now()}`
      }
    };
    outbox.addOperation(operation);

    // Return mock result for offline functionality
    return {
      success: true,
      extractedText: 'Mock OCR text extraction',
      confidence: 0.85,
      processingTime: 2500,
      extractedInfo: {
        partyName: 'Mock Party',
        confidence: 0.85,
        extractionMethod: 'ocr'
      }
    };
  }

  // Legacy Workflow Management (kept for backward compatibility)
  async getWorkflowLegacy(documentId: string): Promise<SGKWorkflow | null> {
    await this.init();
    return this.workflows.find(w => w.documentId === documentId) || null;
  }

  async updateWorkflowStatus(workflowId: string, status: SGKWorkflowStatus, notes?: string): Promise<SGKWorkflow> {
    await this.init();

    const index = this.workflows.findIndex(w => w.id === workflowId);
    if (index === -1) {
      throw new Error('Workflow not found');
    }

    const workflow = this.workflows[index];
    const statusEntry: SGKStatusEntry = {
      status,
      timestamp: new Date().toISOString(),
      notes,
      userId: 'current-user',
      userName: 'Current User'
    };

    workflow.currentStatus = status;
    workflow.statusHistory.push(statusEntry);
    workflow.updatedAt = new Date().toISOString();

    // Update specific dates based on status
    if (status === 'submitted') {
      workflow.submittedDate = new Date().toISOString();
    } else if (status === 'approved') {
      workflow.approvalDate = new Date().toISOString();
    } else if (status === 'paid') {
      workflow.paymentDate = new Date().toISOString();
    }

    this.workflows[index] = workflow;
    await this.saveData();

    // Queue API call
    const operation: OutboxOperation = {
      method: 'PUT',
      endpoint: `/api/sgk/workflows/${workflowId}/status`,
      data: { status, notes },
      headers: {
        'Idempotency-Key': `update-workflow-${workflowId}-${Date.now()}`
      }
    };
    outbox.addOperation(operation);

    return workflow;
  }

  // E-Receipt Management
  async getEReceipts(partyId?: string): Promise<EReceipt[]> {
    await this.init();

    if (partyId) {
      return this.eReceipts.filter(receipt => receipt.partyId === partyId);
    }

    return [...this.eReceipts];
  }

  async getEReceipt(id: string): Promise<EReceipt | null> {
    await this.init();
    return this.eReceipts.find(receipt => receipt.id === id) || null;
  }

  async createEReceipt(data: CreateEReceiptData): Promise<EReceipt> {
    await this.init();

    const eReceipt: EReceipt = {
      ...data,
      id: `ereceipt-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.eReceipts.push(eReceipt);
    await this.saveData();

    // Queue API call
    const operation: OutboxOperation = {
      method: 'POST',
      endpoint: `/api/parties/${data.partyId}/ereceipts`,
      data: eReceipt,
      headers: {
        'Idempotency-Key': `create-ereceipt-${eReceipt.id}-${Date.now()}`
      }
    };
    outbox.addOperation(operation);

    return eReceipt;
  }

  async updateEReceipt(id: string, data: Partial<UpdateEReceiptData>): Promise<EReceipt> {
    await this.init();

    const index = this.eReceipts.findIndex(receipt => receipt.id === id);
    if (index === -1) {
      throw new Error('E-Receipt not found');
    }

    const updatedReceipt = {
      ...this.eReceipts[index],
      ...data,
      updatedAt: new Date().toISOString()
    };

    this.eReceipts[index] = updatedReceipt;
    await this.saveData();

    // Queue API call
    const operation: OutboxOperation = {
      method: 'PUT',
      endpoint: `/api/parties/${updatedReceipt.partyId}/ereceipts/${id}`,
      data: updatedReceipt,
      headers: {
        'Idempotency-Key': `update-ereceipt-${id}-${Date.now()}`
      }
    };
    outbox.addOperation(operation);

    return updatedReceipt;
  }

  async deliverMaterial(receiptId: string, materialId: string, deliveryData: {
    ubbCompanyCode?: string;
    deviceBarcode?: string;
    deviceSerial?: string;
    deliveryDate?: string;
    notes?: string;
  }): Promise<EReceiptMaterial> {
    await this.init();

    const receipt = this.eReceipts.find(r => r.id === receiptId);
    if (!receipt) {
      throw new Error('E-Receipt not found');
    }

    const materialIndex = receipt.materials.findIndex(m => m.id === materialId);
    if (materialIndex === -1) {
      throw new Error('Material not found');
    }

    const material = receipt.materials[materialIndex];
    const updatedMaterial = {
      ...material,
      ...deliveryData,
      deliveryStatus: 'delivered' as const,
      deliveryDate: deliveryData.deliveryDate || new Date().toISOString(),
      deliveredQuantity: material.quantity
    };

    receipt.materials[materialIndex] = updatedMaterial;
    receipt.updatedAt = new Date().toISOString();

    // Check if all materials are delivered
    const allDelivered = receipt.materials.every(m => m.deliveryStatus === 'delivered');
    if (allDelivered) {
      receipt.status = 'completed';
      receipt.deliveryStatus = 'delivered';
    }

    await this.saveData();

    // Queue API call
    const operation: OutboxOperation = {
      method: 'PUT',
      endpoint: `/api/parties/${receipt.partyId}/ereceipts/${receiptId}/materials/${materialId}/deliver`,
      data: deliveryData,
      headers: {
        'Idempotency-Key': `deliver-material-${materialId}-${Date.now()}`
      }
    };
    outbox.addOperation(operation);

    return updatedMaterial;
  }

  // Statistics
  async getStats(): Promise<SGKStats> {
    await this.init();

    const stats: SGKStats = {
      totalDocuments: this.documents.length,
      byType: {
        recete: 0,
        rapor: 0,
        belge: 0,
        fatura: 0,
        teslim: 0,
        iade: 0
      },
      byStatus: {
        draft: 0,
        submitted: 0,
        under_review: 0,
        approved: 0,
        rejected: 0,
        paid: 0,
        completed: 0,
        cancelled: 0
      },
      pendingApprovals: 0,
      expiringSoon: 0,
      totalValue: 0,
      monthlySubmissions: 0,
      approvalRate: 0
    };

    // Calculate document type statistics
    this.documents.forEach(doc => {
      stats.byType[doc.documentType]++;
    });

    // Calculate workflow status statistics
    this.workflows.forEach(workflow => {
      stats.byStatus[workflow.currentStatus]++;

      if (workflow.currentStatus === 'under_review') {
        stats.pendingApprovals++;
      }
    });

    // Calculate monthly submissions (current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    stats.monthlySubmissions = this.workflows.filter(w => {
      if (!w.submittedDate) return false;
      const submittedDate = new Date(w.submittedDate);
      return submittedDate.getMonth() === currentMonth && submittedDate.getFullYear() === currentYear;
    }).length;

    // Calculate approval rate
    const totalSubmitted = this.workflows.filter(w => w.currentStatus !== 'draft').length;
    const totalApproved = this.workflows.filter(w => w.currentStatus === 'approved' || w.currentStatus === 'paid' || w.currentStatus === 'completed').length;
    stats.approvalRate = totalSubmitted > 0 ? (totalApproved / totalSubmitted) * 100 : 0;

    // Calculate total value from e-receipts
    stats.totalValue = this.eReceipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);

    return stats;
  }

  // Party SGK Info Management
  async getPartySGKInfo(): Promise<SGKPartyInfo | null> {
    await this.init();

    // This would typically come from the party service
    // For now, return a mock implementation
    return {
      hasInsurance: true,
      insuranceNumber: '12345678901',
      insuranceType: 'sgk',
      coveragePercentage: 80,
      deviceEntitlement: {
        hasEntitlement: true,
        validFrom: '2024-01-01',
        validUntil: '2029-01-01',
        maxQuantity: 2,
        remainingQuantity: 1
      },
      batteryEntitlement: {
        hasEntitlement: true,
        validFrom: '2024-01-01',
        validUntil: '2025-01-01',
        maxQuantity: 12,
        remainingQuantity: 8
      },
      currentStatus: 'approved'
    };
  }

  // Validation
  validateDocument(data: SGKDocumentFormData): SGKValidation {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    if (!data.partyId) {
      errors.partyId = 'Party is required';
    }

    if (!data.documentType) {
      errors.documentType = 'Document type is required';
    }

    if (!data.file && !data.notes) {
      errors.file = 'Either file or notes must be provided';
    }

    if (data.file && data.file.size > 10 * 1024 * 1024) {
      errors.file = 'File size must be less than 10MB';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }

  validateEReceipt(data: EReceiptFormData): SGKValidation {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    if (!data.partyId) {
      errors.partyId = 'Party is required';
    }

    if (!data.tcNumber) {
      errors.tcNumber = 'TC Number is required';
    } else if (!/^\d{11}$/.test(data.tcNumber)) {
      errors.tcNumber = 'TC Number must be 11 digits';
    }

    if (!data.prescriptionNumber) {
      errors.prescriptionNumber = 'Prescription number is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }

  // Bulk Operations
  async bulkOperation(operation: BulkSGKOperation): Promise<BulkOperationResult> {
    await this.init();

    const result: BulkOperationResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: []
    };

    for (const documentId of operation.documentIds) {
      try {
        switch (operation.type) {
          case 'process':
            await this.processDocument({ imagePath: documentId });
            break;
          case 'approve':
            const workflow = this.workflows.find(w => w.documentId === documentId);
            if (workflow) {
              await this.updateWorkflowStatus(workflow.id, 'approved', operation.data?.notes);
            }
            break;
          case 'reject':
            const rejectWorkflow = this.workflows.find(w => w.documentId === documentId);
            if (rejectWorkflow) {
              await this.updateWorkflowStatus(rejectWorkflow.id, 'rejected', operation.data?.rejectionReason);
            }
            break;
          case 'submit':
            const submitWorkflow = this.workflows.find(w => w.documentId === documentId);
            if (submitWorkflow) {
              await this.updateWorkflowStatus(submitWorkflow.id, 'submitted', operation.data?.notes);
            }
            break;
        }
        result.processed++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          documentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  // Hasta işlem formu indirme
  // Hasta işlem formu indirme
  async downloadPartyForm(receiptId: string): Promise<Blob> {
    try {
      const response = await listSgkEReceiptDownloadPatientForm(receiptId);
      // If the response is already a Blob, return it directly
      // Otherwise, convert the response to a Blob
      if (response instanceof Blob) {
        return response;
      }
      // Fallback: convert to blob if needed
      return new Blob([JSON.stringify(response)], { type: 'application/json' });
    } catch (error) {
      console.error('Download form error:', error);
      throw error;
    }
  }

  // Hasta hakları sorgulama
  async createSgkQueryRightsMethod(partyId: string, tcNumber: string): Promise<unknown> {
    try {
      // Gerçek API çağrısı - using apiClient since createSgkQueryRights doesn't exist
      const response = await apiClient({
        url: '/api/sgk/query-rights',
        method: 'POST',
        data: { tcNumber, partyId }
      });
      return response;
    } catch (error) {
      console.error('Party rights query error:', error);
      throw error;
    }
  }

  // SGK Workflow Management
  async createWorkflow(partyId: string, documentId?: string, workflowType: string = 'approval'): Promise<unknown> {
    try {
      const response = await createSgkWorkflowCreate({
        partyId,
        documentId,
        workflowType
      } as WorkflowCreateRequest);
      return response;
    } catch (error) {
      console.error('SGK workflow creation error:', error);
      throw error;
    }
  }

  async updateWorkflow(workflowId: string, _stepId: string, status: string, notes?: string): Promise<unknown> {
    try {
      // Gerçek API çağrısı
      const response = await updateSgkWorkflowStatus(workflowId, {
        status,
        notes
      } as WorkflowStatusUpdate);
      return response;
    } catch (error) {
      console.error('SGK workflow update error:', error);
      throw error;
    }
  }

  async getWorkflow(workflowId: string): Promise<unknown> {
    try {
      // Gerçek API çağrısı
      const response = await getSgkWorkflow(workflowId);
      return response;
    } catch (error) {
      console.error('SGK workflow get error:', error);
      throw error;
    }
  }
}


// Export singleton instance
export const sgkService = new SGKService();