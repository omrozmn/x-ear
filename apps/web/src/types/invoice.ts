// Invoice Types for X-Ear CRM
// Based on legacy EFatura structure and OpenAPI schema

export type InvoiceStatus = 
  | 'draft'        // taslak
  | 'sent'         // gonderildi
  | 'approved'     // onaylandi
  | 'rejected'     // reddedildi
  | 'cancelled'    // iptal
  | 'paid'         // odendi
  | 'overdue';     // gecikmiş

export type InvoiceType = 
  | 'sale'         // satış faturası
  | 'service'      // hizmet faturası
  | 'proforma'     // proforma fatura
  | 'return'       // iade faturası
  | 'replacement'  // değişim faturası
  | 'sgk';         // SGK faturası

// Backwards-compatible aliases used in some legacy services
export type InvoiceTypeLegacy = InvoiceType | 'standard' | 'credit_note' | 'debit_note';

export type PaymentMethod = 
  | 'cash'         // nakit
  | 'credit_card'  // kredi kartı
  | 'bank_transfer'// havale
  | 'installment'  // taksit
  | 'sgk'          // SGK
  | 'check';       // çek

export type TaxType = 
  | 'kdv'          // KDV
  | 'otv'          // ÖTV
  | 'tevkifat'     // Tevkifat
  | 'stopaj';      // Stopaj

export interface InvoiceItem {
  id: string;
  productId?: string;
  inventoryItemId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
  
  // SGK specific fields
  sgkCode?: string;
  isMinistryTracked?: boolean;
  
  // Device specific fields
  serialNumber?: string;
  warrantyPeriod?: number;
  // legacy/category used by some services
  category?: string;
}

export interface InvoiceAddress {
  name: string;
  address: string;
  city: string;
  district?: string;
  postalCode?: string;
  country?: string;
  taxNumber?: string;
  taxOffice?: string;
}

export interface InvoiceTax {
  type: TaxType;
  rate: number;
  baseAmount: number;
  taxAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceTypeLegacy;
  status: InvoiceStatus;
  
  // Patient/Customer information
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  patientTcNumber?: string;
  // Legacy customer fields (some services use customer* names)
  customerId?: string;
  customerName?: string;
  customerTaxNumber?: string;
  customerAddress?: any;
  
  // Address information
  billingAddress?: InvoiceAddress;
  shippingAddress?: InvoiceAddress;
  issueDate?: string;
  dueDate?: string;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  
  subtotal?: number;
  totalDiscount?: number;
  taxes?: InvoiceTax[] | Array<{ type: string; rate: number; amount: number }>;
  totalTax?: number;
  // legacy name used in some services
  totalAmount?: number;
  grandTotal?: number;
  
  // Currency
  currency: string; // Default: 'TRY'
  exchangeRate?: number;
  
  // Notes and references
  notes?: string;
  internalNotes?: string;
  referenceNumber?: string;
  orderNumber?: string;
  
  // E-Fatura specific fields
  ettn?: string; // E-Fatura ETTN
  gibStatus?: 'not_sent' | 'sent' | 'accepted' | 'rejected';
  gibSentDate?: string;
  gibResponseDate?: string;
  gibErrorMessage?: string;
  
  // SGK specific fields
  sgkSubmissionId?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  attachments?: InvoiceAttachment[];
}

export interface InvoiceAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  type: InvoiceType;
  description?: string;
  category: string;
  isDefault?: boolean;
  isActive?: boolean;
  usageCount?: number;

  // Template data
  templateData: unknown; // Full invoice form data
  items: Partial<InvoiceItem>[];
  defaultPaymentMethod?: PaymentMethod;
  defaultDueDays?: number;
  defaultNotes?: string;

  // Template settings
  autoCalculateTax?: boolean;
  requireApproval?: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CreateInvoiceTemplateData {
  name: string;
  description?: string;
  category: string;
  templateData: unknown;
  isActive?: boolean;
}

export interface UpdateInvoiceTemplateData {
  name?: string;
  description?: string;
  category?: string;
  templateData?: unknown;
  isActive?: boolean;
}

export interface InvoiceFilters {
  search?: string;
  status?: InvoiceStatus[];
  type?: InvoiceType[];
  paymentMethod?: PaymentMethod[];
  patientId?: string;
  patientName?: string;
  // legacy
  customerId?: string;
  customerName?: string;
  invoiceNumber?: string;
  
  // Date filters
  issueDateFrom?: string;
  issueDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  paymentDateFrom?: string;
  paymentDateTo?: string;
  
  // Amount filters
  amountMin?: number;
  amountMax?: number;
  
  // Status filters
  isPaid?: boolean;
  isOverdue?: boolean;
  hasSgkSubmission?: boolean;
  gibStatus?: Invoice['gibStatus'];
  
  // Pagination
  page?: number;
  limit?: number;
}

export interface InvoiceSearchResult {
  invoices: Invoice[];
  total: number;
  totalPages: number;
  page: number;
  pageSize?: number;
  limit?: number;
  hasMore: boolean;
  filters: InvoiceFilters;
}

export interface InvoiceStats {
  total: number;
  // provide both structured and legacy keyed stats to match service returns
  byStatus?: Partial<Record<string, number>>;
  byType?: Partial<Record<string, number>>;
  byPaymentMethod?: Partial<Record<string, number>>;

  // Financial stats (optional to allow legacy shapes)
  totalAmount?: number;
  paidAmount?: number;
  pendingAmount?: number;
  overdueAmount?: number;

  // Monthly stats
  monthlyRevenue?: number;
  monthlyCount?: number;

  // SGK stats
  sgkSubmitted?: number;
  sgkApproved?: number;
  sgkPending?: number;
}

export interface CreateInvoiceData {
  type: InvoiceTypeLegacy | InvoiceType;
  // Legacy customer fields
  customerId?: string;
  customerName?: string;
  customerTaxNumber?: string;
  customerAddress?: any;

  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  patientTcNumber?: string;
  deviceId?: string;

  invoiceNumber?: string;
  billingAddress?: InvoiceAddress;
  shippingAddress?: InvoiceAddress;

  issueDate?: string;
  dueDate?: string;
  paymentMethod?: PaymentMethod;

  items?: Omit<InvoiceItem, 'id' | 'taxAmount' | 'totalPrice'>[];

  // Legacy calculation fields
  subtotal?: number;
  taxes?: Array<{ type: string; rate: number; amount: number }>;
  totalAmount?: number;
  status?: InvoiceStatus;

  notes?: string;
  internalNotes?: string;
  referenceNumber?: string;
  orderNumber?: string;

  currency?: string;
  exchangeRate?: number;

  // Template options
  templateId?: string;
  saveAsTemplate?: boolean;
  templateName?: string;
}

export interface UpdateInvoiceData extends Partial<CreateInvoiceData> {
  id: string;
  status?: InvoiceStatus;
  gibSentDate?: string;
  paymentDate?: string;
  ettn?: string;
}

export interface InvoiceFormData {
  type: InvoiceType;
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  patientTcNumber?: string;
  
  // Address forms
  billingAddress: InvoiceAddress;
  shippingAddress?: InvoiceAddress;
  sameAsbilling?: boolean;
  
  // Date and payment
  issueDate: string;
  dueDate?: string;
  paymentMethod?: PaymentMethod;
  
  // Items
  items: InvoiceItem[];
  
  // Calculations (computed)
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  
  // Notes
  notes?: string;
  internalNotes?: string;
  referenceNumber?: string;
  draft?: number;
  sent?: number;
  paid?: number;
  overdue?: number;
  orderNumber?: string;
  
  // Options
  currency: string;
  exchangeRate?: number;
  autoCalculateTax: boolean;
  
  // Template
  templateId?: string;
  saveAsTemplate?: boolean;
  templateName?: string;
}

export interface InvoiceValidation {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export interface InvoiceCalculation {
  subtotal: number;
  totalDiscount: number;
  taxes: InvoiceTax[];
  totalTax: number;
  grandTotal: number;
}

export interface InvoiceAction {
  type: 'send' | 'cancel' | 'approve' | 'reject' | 'pay' | 'send_to_gib' | 'print' | 'download';
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface InvoiceBulkAction {
  type: 'send' | 'cancel' | 'send_to_gib' | 'export' | 'delete';
  label: string;
  icon?: string;
  requiresConfirmation: boolean;
  confirmationMessage: string;
}

export interface InvoiceExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'xml';
  includeItems?: boolean;
  includePayments?: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
  filters?: InvoiceFilters;
}

// E-Fatura Integration Types
export interface EFaturaSubmission {
  invoiceId: string;
  ettn: string;
  submissionDate: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected';
  responseDate?: string;
  errorMessage?: string;
  xmlContent?: string;
}

export interface EFaturaBulkSubmission {
  invoiceIds: string[];
  submissionDate: string;
  results: Array<{
    invoiceId: string;
    success: boolean;
    ettn?: string;
    error?: string;
  }>;
}

// Payment Integration Types
export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
  
  // Credit card specific
  cardLast4?: string;
  cardType?: string;
  transactionId?: string;
  
  // Bank transfer specific
  bankName?: string;
  accountNumber?: string;
  
  // Installment specific
  installmentNumber?: number;
  totalInstallments?: number;
  
  createdAt: string;
  createdBy: string;
}

export interface InvoicePaymentPlan {
  invoiceId: string;
  totalAmount: number;
  installments: Array<{
    number: number;
    amount: number;
    dueDate: string;
    paidDate?: string;
    status: 'pending' | 'paid' | 'overdue';
  }>;
  createdAt: string;
  updatedAt: string;
}