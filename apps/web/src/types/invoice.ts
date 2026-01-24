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

// Extended invoice types for government and special cases
export type ExtendedInvoiceType = InvoiceType
  | 'government'   // kamu faturası
  | 'withholding'  // tevkifatlı fatura
  | 'export_registered'; // ihraç kayıtlı

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

  // Withholding (Tevkifat) fields
  withholdingRate?: number;
  withholdingAmount?: number;

  // Export / customs fields
  gtipCode?: string;
  // License number for medical/drug items
  licenseNumber?: string;

  // Extended features (Legacy parity)
  unit?: ExtendedUnitType | string; // Extended unit types
  serviceCode?: string; // Mal hizmet kodu
  lineWithholding?: LineWithholdingData; // Satır bazında tevkifat
  specialTaxBase?: number; // Özel matrah
  taxFreeAmount?: number;

  // KRİTİK EKSİK ALAN
  aliciStokKodu?: string; // Alıcı Stok Kodu

  // İlaç/Tıbbi Cihaz Bilgileri
  medicalDeviceData?: MedicalDeviceData;
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
  /**
   * If this invoice has been created on the server, the numeric server id.
   * Local-only invoices may have a temporary id like `inv-001` — in that
   * case `serverId` will be undefined until the invoice is synced.
   */
  serverId?: number;
  saleId?: string;
  invoiceNumber: string;
  type: InvoiceTypeLegacy;
  status: InvoiceStatus;

  // Party/Customer information
  partyId?: string;
  partyName: string;
  partyPhone?: string;
  partyTcNumber?: string;
  // Legacy customer fields (some services use customer* names)
  customerId?: string;
  customerName?: string;
  customerTaxNumber?: string;
  /**
   * Legacy customer address field.
   * Using InvoiceAddress type for proper structure.
   * Some legacy services may pass unstructured address data.
   */
  customerAddress?: InvoiceAddress;

  // Items
  items?: InvoiceItem[];

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

  // Government invoice fields
  governmentData?: GovernmentInvoiceData;

  // Withholding fields
  withholdingData?: WithholdingData;

  // SGK Data
  sgkData?: SGKInvoiceData;

  // Medical Device Data
  medicalDeviceData?: MedicalDeviceData;

  // Export Details
  exportDetails?: ExportDetailsData;



  // Additional info
  orderInfo?: OrderInfo;
  deliveryInfo?: DeliveryInfo;
  internetSalesInfo?: InternetSalesInfo;
  periodInfo?: PeriodInfo;

  // Extended features (Legacy parity)
  scenarioData?: InvoiceScenarioData;
  specialTaxBase?: SpecialTaxBaseData;
  backdatedInvoice?: BackdatedInvoiceData;
  returnInvoiceDetails?: ReturnInvoiceDetailsData;
  customerLabel?: CustomerLabelData;
  shipmentInfo?: ShipmentInfoData;
  bankInfo?: BankInfoData;
  paymentTerms?: PaymentTermsData;
  issueTime?: string; // HH:mm format
  isTechnologySupport?: boolean;
  isMedicalDevice?: boolean;

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
  fields?: string[]; // Template fields
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
  partyId?: string;
  partyName?: string;
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

  // Legacy individual status counts
  draft?: number;
  sent?: number;
  paid?: number;
  overdue?: number;
  cancelled?: number;

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
  /**
   * Legacy customer address field.
   * Using InvoiceAddress type for proper structure.
   * Some legacy services may pass unstructured address data.
   */
  customerAddress?: InvoiceAddress;

  partyId?: string;
  partyName?: string;
  partyPhone?: string;
  partyTcNumber?: string;
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

  // Attachments
  attachments?: InvoiceAttachment[];

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
  partyId?: string;
  partyName: string;
  // Legacy/customer aliases used by invoice UI
  customerId?: string;
  customerName?: string;
  governmentPayingCustomer?: boolean;
  customerTaxNumber?: string;
  partyPhone?: string;
  partyTcNumber?: string;

  // Address forms
  billingAddress: InvoiceAddress;
  shippingAddress?: InvoiceAddress;
  sameAsbilling?: boolean;
  // Selected customer address id (from address list)
  customerAddressId?: string;

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

  // UI helper fields
  customerLabel?: string;

  // Legacy/extended fields used by validation and various flows
  scenario?: InvoiceScenario | string;
  invoiceType?: string; // legacy invoice type code
  withholdingRate?: number;
  specialBaseAmount?: number;
  specialBaseRate?: number;
  governmentExemptionReason?: string;
  governmentExportRegisteredReason?: string;
  customerTcNumber?: string;
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
  items?: InvoiceItem[]; // Calculated items
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
  results?: Array<{
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
  id?: string;
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

// Government Invoice (Kamu Faturası) Types
export interface GovernmentInvoiceData {
  exemptionReason?: string;
  exemptionCode?: string;
  exemptionDescription?: string;
  exportReason?: string;
  exportCode?: string;
  exportDescription?: string;
  isExempt?: boolean;
  isExportRegistered?: boolean;
}

export interface ExemptionReason {
  code: string;
  description: string;
  category: 'diplomatic' | 'military' | 'export' | 'other';
}

export interface ExportReason {
  code: string;
  description: string;
  category: 'export_registered' | 'temporary_import' | 'inward_processing' | 'other';
}

// Withholding (Tevkifat) Types
export interface WithholdingData {
  withholdingRate: number;
  withholdingAmount: number;
  taxFreeAmount: number;
  withholdingType?: 'partial' | 'full';
  withholdingCode?: string;
}

export interface WithholdingCalculation {
  baseAmount: number;
  withholdingRate: number;
  withholdingAmount: number;
  taxFreeAmount: number;
  netAmount: number;
}

// Additional Invoice Info Types
export interface OrderInfo {
  orderNumber?: string;
  orderDate?: string;
  orderReference?: string;
}

export interface DeliveryInfo {
  deliveryNumber?: string;
  deliveryDate?: string;
  deliveryReference?: string;
  carrierName?: string;
  trackingNumber?: string;
}

export interface InternetSalesInfo {
  websiteUrl?: string;
  paymentPlatform?: string;
  paymentDate?: string;
  paymentReference?: string;
  customerIpAddress?: string;
}

export interface ExportDetailsData {
  customsDeclarationNumber?: string;
  customsDeclarationDate?: string;
  transportMode?: string;
  deliveryTerms?: string;
  gtipCode?: string;
  exportCountry?: string;
  exportPort?: string;
  containerNumber?: string;
  vehicleNumber?: string;
}

export interface PeriodInfo {
  periodStart?: string;
  periodEnd?: string;
  periodDescription?: string;
}

// ============================================
// EXTENDED INVOICE FEATURES (Legacy Parity)
// ============================================

// Scenario Types
export type InvoiceScenario = 'other' | 'export' | 'government' | 'medical' | 'device_sale';

export interface InvoiceScenarioData {
  scenario: InvoiceScenario;
  scenarioCode: number;
  scenarioName: string;
  scenarioDescription?: string;
  currentScenarioType?: '2' | '3'; // Temel (2) veya Ticari (3) - Senaryo 36 için
}

// Special Tax Base (Özel Matrah)
export interface SpecialTaxBaseData {
  hasSpecialTaxBase: boolean;
  amount?: number;
  description?: string;
  taxRate?: number;
}

// Backdated Invoice (Geriye Fatura)
export interface BackdatedInvoiceData {
  isBackdated: boolean;
  originalDate?: string;
  reason?: string;
}

// Return Invoice Details (İade Fatura Detayları)
export interface ReturnInvoiceDetailsData {
  returnInvoiceNumber?: string;
  returnInvoiceDate?: string;
  returnReason?: string;
}

// Customer Label (Alıcı Etiketi)
export interface CustomerLabelData {
  labelId?: string;
  labelName?: string;
  color?: string;
}

// Shipment Info (Sevk Bilgileri)
export interface ShipmentInfoData {
  shipmentDate?: string;
  shipmentAddress?: InvoiceAddress;
  carrier?: string;
  trackingNumber?: string;
}

// Bank Info (Banka Bilgileri)
export interface BankInfoData {
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
}

// Payment Terms (Ödeme Koşulları)
export interface PaymentTermsData {
  paymentTerm?: string;
  paymentDays?: number;
  earlyPaymentDiscount?: number;
  latePaymentPenalty?: number;
}

// Line Withholding (Satır Bazında Tevkifat)
export interface LineWithholdingData {
  code: string;
  rate: number;
  amount: number;
}

// Extended Unit Types
export type ExtendedUnitType =
  | 'Adet' | 'Kg' | 'Lt' | 'M' | 'M2' | 'M3'
  | 'Ton' | 'Paket' | 'Koli' | 'Kutu' | 'Saat'
  | 'Gün' | 'Ay' | 'Yıl' | 'Kişi' | 'Takım';

// Product Service Code (Mal Hizmet Kodu)
export interface ProductServiceCodeData {
  code: string;
  description: string;
  category: string;
}

// ============================================
// KRİTİK EKSİK TYPE TANIMLARI
// ============================================

// SGK Invoice Data (Güncellenmiş)
export interface SGKInvoiceData {
  // Dönem Bilgileri
  periodYear?: string;
  periodMonth?: string;
  periodStartDate?: string;
  periodEndDate?: string;

  // Tesis Bilgileri
  facilityCode?: string;
  facilityName?: string;

  // Referans Bilgileri
  referenceNumber?: string;
  protocolNumber?: string;

  // Ödeme Bilgileri
  paymentAmount?: number;
  paymentDate?: string;
  paymentDescription?: string;

  // SGK Özel Alanlar
  sgkInstitutionCode?: string;
  branchCode?: string;

  // İlave Fatura Bilgileri (KRİTİK EKSİK ALANLAR)
  additionalInfo?: 'E' | 'H' | 'O' | 'M' | 'A' | 'MH' | 'D';
  mukellefKodu?: string;      // Eczane, Hastane, Optik, Medikal için zorunlu
  mukellefAdi?: string;       // Eczane, Hastane, Optik, Medikal için zorunlu
  dosyaNo?: string;           // E, H, O, M, A, MH için zorunlu
  aboneNo?: string;           // Sadece Abonelik (A) için zorunlu
}

// Medical Device Data (Güncellenmiş)
export interface MedicalDeviceData {
  // Ürün Türü Seçimi (KRİTİK EKSİK ALAN)
  productType?: 'ilac' | 'tibbicihaz';

  // Dinamik Alanlar (label'lar productType'a göre değişir)
  urunNo?: string;      // İlaç: GTIN, Tıbbi Cihaz: UNO
  partiNo?: string;     // İlaç: Parti No, Tıbbi Cihaz: LNO
  seriNo?: string;      // İlaç: SN (zorunlu), Tıbbi Cihaz: SNO (LNO boşsa zorunlu)
  tarih?: string;       // İlaç: Son Kullanma, Tıbbi Cihaz: Üretim Tarihi

  // Legacy alanlar (geriye dönük uyumluluk)
  licenseNumber?: string;
  serialNumber?: string;
  lotNumber?: string;
  deviceCode?: string;
  deviceType?: string;
  expiryDate?: string;
  manufacturer?: string;
}
