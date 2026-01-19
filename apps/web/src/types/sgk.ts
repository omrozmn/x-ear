// SGK Types for X-Ear CRM
// Based on legacy SGK functionality and OpenAPI schema

export type SGKDocumentType = 
  | 'recete' // e-prescription
  | 'rapor' // medical report
  | 'belge' // general document
  | 'fatura' // invoice
  | 'teslim' // delivery document
  | 'iade'; // return document

export type SGKStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'paid' 
  | 'processing'
  | 'expired';

export type SGKWorkflowStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'completed'
  | 'cancelled';

export type InsuranceType = 'sgk' | 'private' | 'other';

export type MaterialType = 
  | 'hearing_aid_right'
  | 'hearing_aid_left'
  | 'ear_mold_right'
  | 'ear_mold_left'
  | 'battery_right'
  | 'battery_left'
  | 'accessory'
  | 'other';

export type DeliveryStatus = 
  | 'pending'
  | 'delivered'
  | 'returned'
  | 'cancelled';

// Core SGK Document interface
export interface SGKDocument {
  id: string;
  partyId: string;
  filename: string;
  documentType: SGKDocumentType;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  
  // OCR and processing
  ocrText?: string;
  extractedInfo?: SGKExtractedInfo;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  
  // Metadata
  uploadedBy: string;
  uploadedAt: string;
  processedAt?: string;
  notes?: string;
  
  // Workflow
  workflow?: SGKWorkflow;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Information extracted from SGK documents via OCR
export interface SGKExtractedInfo {
  partyName?: string;
  tcNumber?: string;
  birthDate?: string;
  diagnosis?: string;
  doctorName?: string;
  hospitalName?: string;
  prescriptionNumber?: string;
  prescriptionDate?: string;
  reportNumber?: string;
  reportDate?: string;
  validityDate?: string;
  materials?: ExtractedMaterial[];
  confidence: number; // 0-1 confidence score
  extractionMethod: 'ocr' | 'nlp' | 'manual';
}

export interface ExtractedMaterial {
  type: MaterialType;
  code?: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  vatRate?: number;
  side?: 'left' | 'right' | 'both';
}

// SGK Workflow management
export interface SGKWorkflow {
  id: string;
  documentId: string;
  partyId: string;
  currentStatus: SGKWorkflowStatus;
  statusHistory: SGKStatusEntry[];
  
  // Deadlines and dates
  submittedDate?: string;
  deadline?: string;
  approvalDate?: string;
  paymentDate?: string;
  
  // Workflow data
  submissionData?: SGKSubmissionData;
  approvalData?: SGKApprovalData;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface SGKStatusEntry {
  status: SGKWorkflowStatus;
  timestamp: string;
  notes?: string;
  userId?: string;
  userName?: string;
  systemGenerated?: boolean;
}

export interface SGKSubmissionData {
  submissionId?: string;
  submissionMethod: 'online' | 'manual' | 'api';
  submittedDocuments: string[]; // document IDs
  submissionNotes?: string;
}

export interface SGKApprovalData {
  approvalNumber?: string;
  approvedAmount?: number;
  approvedMaterials?: ApprovedMaterial[];
  rejectionReason?: string;
  approverName?: string;
}

export interface ApprovedMaterial {
  materialCode: string;
  materialName: string;
  approvedQuantity: number;
  approvedAmount: number;
  notes?: string;
}

// E-Receipt (E-Reçete) interfaces
export interface EReceipt {
  id: string;
  partyId: string;
  receiptNumber: string;
  prescriptionNumber?: string;
  
  // Doctor and hospital info
  doctorName: string;
  doctorTc?: string;
  hospitalName: string;
  hospitalCode?: string;
  
  // Dates
  prescriptionDate: string;
  validityDate: string;
  savedDate: string;
  
  // Materials
  materials: EReceiptMaterial[];
  
  // Status and processing
  status: 'saved' | 'processing' | 'delivered' | 'completed' | 'cancelled';
  deliveryStatus?: DeliveryStatus;
  
  // Financial
  totalAmount: number;
  vatAmount: number;
  discountAmount?: number;
  
  // SGK submission
  sgkSubmissionId?: string;
  sgkStatus?: SGKStatus;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface EReceiptMaterial {
  id: string;
  materialCode: string;
  materialName: string;
  materialType: MaterialType;
  
  // Quantity and pricing
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vatRate: number;
  vatAmount: number;
  
  // Delivery information
  deliveryStatus: DeliveryStatus;
  deliveryDate?: string;
  deliveredQuantity?: number;
  
  // Device specific (for hearing aids)
  ubbCompanyCode?: string;
  deviceBarcode?: string;
  deviceSerial?: string;
  side?: 'left' | 'right' | 'both';
  
  // Inventory link
  inventoryItemId?: string;
  
  // Notes
  notes?: string;
}

// ÜTS (Ürün Takip Sistemi) interfaces
export interface UTSRecord {
  id: string;
  recordType: 'alma' | 'verme' | 'tuketiciye_verme';
  
  // Device information
  deviceBarcode: string;
  deviceSerial?: string;
  deviceName: string;
  deviceCode: string;
  
  // Company information
  ubbCompanyCode: string;
  companyName: string;
  
  // Transaction details
  transactionDate: string;
  quantity: number;
  unitPrice?: number;
  totalAmount?: number;
  
  // Related records
  partyId?: string;
  eReceiptId?: string;
  materialId?: string;
  
  // Status
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  utsTransactionId?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  notes?: string;
}

// SGK Party Information (extended from Party type)
export interface SGKPartyInfo {
  hasInsurance: boolean;
  insuranceNumber?: string;
  insuranceType?: InsuranceType;
  coveragePercentage?: number;
  
  // Approval and validity
  approvalNumber?: string;
  approvalDate?: string;
  expiryDate?: string;
  
  // Entitlements
  deviceEntitlement?: SGKEntitlement;
  batteryEntitlement?: SGKEntitlement;
  
  // Current status
  currentStatus?: SGKStatus;
  lastSubmissionDate?: string;
  nextEligibilityDate?: string;
}

export interface SGKEntitlement {
  hasEntitlement: boolean;
  validFrom?: string;
  validUntil?: string;
  remainingQuantity?: number;
  maxQuantity?: number;
  lastUsedDate?: string;
  notes?: string;
}

// Search and filtering
export interface SGKDocumentFilters {
  partyId?: string;
  documentType?: SGKDocumentType;
  status?: SGKWorkflowStatus;
  dateRange?: { start: string; end: string };
  search?: string;
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  hasWorkflow?: boolean;
}

export interface SGKSearchResult {
  documents: SGKDocument[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Statistics and reporting
export interface SGKStats {
  totalDocuments: number;
  byType: Record<SGKDocumentType, number>;
  byStatus: Record<SGKWorkflowStatus, number>;
  pendingApprovals: number;
  expiringSoon: number;
  totalValue: number;
  monthlySubmissions: number;
  approvalRate: number;
}

// OCR Processing
export interface OCRProcessingRequest {
  imageUrl?: string;
  imagePath?: string;
  documentType?: SGKDocumentType;
  partyId?: string;
  autoCrop?: boolean;
  enhanceImage?: boolean;
}

export interface OCRProcessingResult {
  success: boolean;
  extractedText: string;
  extractedInfo?: SGKExtractedInfo;
  confidence: number;
  processingTime: number;
  error?: string;
  
  // Party matching
  partyMatches?: PartyMatch[];
  suggestedPartyId?: string;
}

export interface PartyMatch {
  partyId: string;
  partyName: string;
  matchScore: number;
  matchedFields: string[];
  confidence: 'high' | 'medium' | 'low';
}

// Form data types
export interface SGKDocumentFormData {
  partyId: string;
  documentType: SGKDocumentType;
  file?: File;
  notes?: string;
  autoProcess?: boolean;
}

export interface EReceiptFormData {
  partyId: string;
  tcNumber: string;
  prescriptionNumber: string;
  doctorName?: string;
  hospitalName?: string;
  prescriptionDate?: string;
  materials?: Partial<EReceiptMaterial>[];
}

// Validation
export interface SGKValidation {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

// Bulk operations
export interface BulkSGKOperation {
  type: 'process' | 'approve' | 'reject' | 'submit';
  documentIds: string[];
  data?: {
    notes?: string;
    approvalData?: Partial<SGKApprovalData>;
    rejectionReason?: string;
  };
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    documentId: string;
    error: string;
  }>;
}

// Export types
export type CreateSGKDocumentData = Omit<SGKDocument, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateSGKDocumentData = Partial<Omit<SGKDocument, 'id' | 'createdAt'>> & { id: string };
export type CreateEReceiptData = Omit<EReceipt, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateEReceiptData = Partial<Omit<EReceipt, 'id' | 'createdAt'>> & { id: string };