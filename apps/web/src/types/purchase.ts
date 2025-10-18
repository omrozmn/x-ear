// Purchase Types
export type PurchaseStatus = 
  | 'draft'
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'cancelled';

export type PurchaseType = 
  | 'standard'
  | 'return'
  | 'credit_note'
  | 'debit_note';

export interface PurchaseItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
  unit?: string;
  productCode?: string;
  barcode?: string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  type: PurchaseType;
  status: PurchaseStatus;
  
  // Supplier information
  supplierId?: string;
  supplierName: string;
  supplierTaxNumber?: string;
  supplierAddress?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  
  // Purchase details
  issueDate: string;
  dueDate?: string;
  paymentMethod?: string;
  
  // Items and totals
  items: PurchaseItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal?: number;
  grandTotal: number;
  
  // Additional information
  notes?: string;
  internalNotes?: string;
  referenceNumber?: string;
  orderNumber?: string;
  
  // XML related
  xmlData?: string;
  xmlFileName?: string;
  xmlImportDate?: string;
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface PurchaseFilters {
  // Basic filters
  search?: string;
  purchaseNumber?: string;
  supplierName?: string;
  supplierId?: string;

  // Date filters
  dateFrom?: string;
  dateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;

  // Status and type filters
  status?: PurchaseStatus;
  type?: PurchaseType;
  isPaid?: boolean;
  isOverdue?: boolean;
  hasXmlData?: boolean;

  // Amount filters
  amountMin?: number;
  amountMax?: number;

  // Pagination
  page?: number;
  limit?: number;
}

export interface PurchaseSearchResult {
  purchases: Purchase[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
  limit: number;
  hasMore: boolean;
  filters: PurchaseFilters;
}

export interface CreatePurchaseData {
  type: PurchaseType;
  supplierName: string;
  supplierTaxNumber?: string;
  supplierAddress?: string;
  supplierPhone?: string;
  supplierEmail?: string;

  issueDate: string;
  dueDate?: string;
  paymentMethod?: string;

  items: Omit<PurchaseItem, 'id' | 'taxAmount' | 'totalPrice'>[];

  notes?: string;
  internalNotes?: string;
  referenceNumber?: string;
  orderNumber?: string;

  xmlData?: string;
  xmlFileName?: string;
  xmlImportDate?: string;
}

export interface UpdatePurchaseData extends Partial<CreatePurchaseData> {
  status?: PurchaseStatus;
}

export interface PurchaseStats {
  total: number;
  draft: number;
  sent: number;
  approved: number;
  rejected: number;
  paid: number;
  cancelled: number;
  totalAmount: number;
  xmlImported: number;
}

export interface PurchaseCalculation {
  items: PurchaseItem[];
  subtotal: number;
  totalTax: number;
  totalAmount: number;
}

export interface PurchaseValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}