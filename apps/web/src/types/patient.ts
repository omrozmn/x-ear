export interface Patient {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  tcNumber?: string;
  birthDate?: string;
  email?: string;
  address?: string;
  
  // Status and classification
  status: 'active' | 'inactive' | 'archived';
  segment: 'new' | 'trial' | 'purchased' | 'control' | 'renewal';
  label: 'yeni' | 'arama-bekliyor' | 'randevu-verildi' | 'deneme-yapildi' | 'kontrol-hastasi' | 'satis-tamamlandi';
  acquisitionType: 'tabela' | 'sosyal-medya' | 'tanitim' | 'referans' | 'diger';
  
  // Tags and priority
  tags: string[];
  priorityScore?: number;
  
  // Device information
  devices: PatientDevice[];
  deviceTrial?: boolean;
  trialDevice?: string;
  trialDate?: string;
  priceGiven?: boolean;
  purchased?: boolean;
  purchaseDate?: string;
  deviceType?: 'hearing_aid' | 'cochlear_implant' | 'bone_anchored';
  deviceModel?: string;
  
  // Financial information
  installments?: Installment[];
  overdueAmount?: number;
  
  // SGK information
  sgkInfo: SGKInfo;
  sgkStatus?: 'pending' | 'approved' | 'rejected' | 'paid';
  sgkSubmittedDate?: string;
  sgkDeadline?: string;
  sgkWorkflow?: SGKWorkflow;
  deviceReportRequired?: boolean;
  batteryReportRequired?: boolean;
  batteryReportDue?: string;
  
  // Appointments and communication
  lastContactDate?: string;
  lastAppointmentDate?: string;
  missedAppointments?: number;
  lastPriorityTaskDate?: string;
  renewalContactMade?: boolean;
  
  // Clinical information
  assignedClinician?: string;
  notes: PatientNote[];
  communications?: Communication[];
  reports?: PatientReport[];
  ereceiptHistory?: EReceiptRecord[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface PatientDevice {
  id: string;
  brand: string;
  model: string;
  serialNumber?: string;
  side: 'left' | 'right' | 'both';
  type: 'hearing_aid' | 'cochlear_implant' | 'bone_anchored';
  status: 'active' | 'trial' | 'returned' | 'replaced';
  purchaseDate?: string;
  warrantyExpiry?: string;
  lastServiceDate?: string;
  batteryType?: string;
  settings?: Record<string, unknown>;
}

export interface Installment {
  id: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue';
  notes?: string;
}

export interface SGKInfo {
  hasInsurance: boolean;
  insuranceNumber?: string;
  insuranceType?: 'sgk' | 'private' | 'other';
  coveragePercentage?: number;
  approvalNumber?: string;
  approvalDate?: string;
  expiryDate?: string;
}

export interface SGKWorkflow {
  currentStatus: string;
  statusHistory: SGKStatusEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface SGKStatusEntry {
  status: string;
  timestamp: string;
  notes?: string;
  userId?: string;
}

export interface PatientNote {
  id: string;
  text: string;
  date: string;
  author: string;
  type?: 'general' | 'clinical' | 'financial' | 'sgk';
  isPrivate?: boolean;
}

export interface Communication {
  id: string;
  type: 'sms' | 'email' | 'call' | 'whatsapp';
  direction: 'inbound' | 'outbound';
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  templateId?: string;
  variables?: Record<string, unknown>;
}

export interface PatientReport {
  id: string;
  type: 'audiogram' | 'battery' | 'device' | 'sgk' | 'medical';
  title: string;
  content?: string;
  fileUrl?: string;
  createdAt: string;
  createdBy: string;
  validUntil?: string;
}

export interface EReceiptRecord {
  id: string;
  receiptNumber: string;
  date: string;
  materials: EReceiptMaterial[];
  totalAmount: number;
  vatAmount: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  sgkSubmissionId?: string;
}

export interface EReceiptMaterial {
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  totalPrice: number;
}

// Patient search and filtering
export interface PatientFilters {
  search?: string;
  status?: Patient['status'];
  segment?: Patient['segment'];
  label?: Patient['label'];
  acquisitionType?: Patient['acquisitionType'];
  tags?: string[];
  hasDevices?: boolean;
  sgkStatus?: Patient['sgkStatus'];
  priorityScore?: { min?: number; max?: number };
  dateRange?: { start: string; end: string };
  page?: number;
  limit?: number;
}

export interface PatientSearchResult {
  patients: Patient[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Patient statistics
export interface PatientStats {
  total: number;
  byStatus: Record<Patient['status'], number>;
  bySegment: Record<Patient['segment'], number>;
  byLabel: Record<Patient['label'], number>;
  highPriority: number;
  withDevices: number;
  sgkPending: number;
  overduePayments: number;
}

// Patient matching for OCR/document processing
export interface PatientMatchCandidate {
  patient: Patient;
  score: number;
  matchedFields: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface PatientMatchRequest {
  name?: string;
  tcNo?: string;
  birthDate?: string;
  phone?: string;
  extractedText?: string;
}