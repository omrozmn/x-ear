// Inventory Types for X-Ear CRM
// Based on legacy inventory structure and OpenAPI schema

export type InventoryCategory = 
  | 'hearing_aid' 
  | 'battery' 
  | 'accessory' 
  | 'ear_mold' 
  | 'cleaning_supplies'
  | 'amplifiers';

export type InventoryType = 
  | 'digital_programmable'
  | 'rechargeable_digital'
  | 'zinc_air'
  | 'custom_silicone'
  | 'maintenance_kit'
  | 'wireless_amplifier';

export type InventoryStatus = 
  | 'available'
  | 'assigned'
  | 'maintenance'
  | 'retired'
  | 'low_stock'
  | 'out_of_stock';

export type EarDirection = 'left' | 'right' | 'both';

export interface InventoryItem {
  id: string;
  name: string;
  brand: string;
  model?: string;
  category: InventoryCategory;
  type?: InventoryType;
  barcode?: string;
  stockCode?: string;
  supplier?: string;
  unit?: string;
  description?: string;
  
  // Stock tracking
  availableInventory: number;
  totalInventory: number;
  usedInventory: number;
  onTrial?: number;
  reorderLevel: number;
  
  // Serial numbers and barcodes
  availableSerials?: string[];
  availableBarcodes?: string[];
  
  // Pricing
  price: number;
  cost?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  vatIncludedPrice?: number;
  totalValue?: number;
  
  // Features
  features?: string[];
  
  // Hearing aid specific
  ear?: EarDirection;
  direction?: EarDirection;
  
  // SGK and tracking
  sgkCode?: string;
  isMinistryTracked?: boolean;
  
  // Warranty
  warranty?: number; // months
  
  // Invoice related fields
  taxRate?: number; // KDV oranı
  productServiceCode?: string; // Mal/Hizmet kodu
  gtipCode?: string; // GTİP kodu (ihracat için)
  
  // Status and metadata
  status?: InventoryStatus;
  notes?: string;
  location?: string;
  
  // Timestamps
  createdAt: string;
  lastUpdated: string;
}

export interface InventoryFilters {
  search?: string;
  category?: InventoryCategory;
  brand?: string;
  status?: InventoryStatus;
  lowStock?: boolean;
  outOfStock?: boolean;
  supplier?: string;
  minPrice?: number;
  maxPrice?: number;
  hasSerials?: boolean;
  isMinistryTracked?: boolean;
  // Extended filters for advanced filtering
  priceRange?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    start?: string;
    end?: string;
  };
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_trial';
  features?: string[];
  warrantyPeriod?: string;
}

export interface InventoryStats {
  total: number;
  available: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
  activeTrials: number;
  byCategory: Record<InventoryCategory, number>;
  byBrand: Record<string, number>;
  byStatus: Record<InventoryStatus, number>;
  recentlyUpdated: number;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  type: TransactionType;
  quantity: number;
  unitPrice?: number;
  totalAmount?: number;
  reference?: string;
  notes?: string;
  performedBy: string;
  createdAt: string;
}

export type TransactionType = 
  | 'purchase'
  | 'sale'
  | 'adjustment'
  | 'transfer'
  | 'return'
  | 'waste'
  | 'assignment'
  | 'trial';

export interface StockUpdate {
  itemId: string;
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
  reason?: string;
  notes?: string;
  serialNumbers?: string[];
}

export interface InventorySearchResult {
  items: InventoryItem[];
  total: number;
  filters: InventoryFilters;
  stats: InventoryStats;
}

export interface LowStockAlert {
  item: InventoryItem;
  currentStock: number;
  reorderLevel: number;
  daysUntilEmpty?: number;
  suggestedOrderQuantity?: number;
}

export interface InventoryReport {
  type: 'stock' | 'movement' | 'valuation' | 'low_stock';
  dateRange: {
    from: string;
    to: string;
  };
  filters?: InventoryFilters;
  data: InventoryItem[];
  summary: {
    totalItems: number;
    totalValue: number;
    movements: number;
    alerts: number;
  };
}

export interface SerialNumberAssignment {
  serialNumber: string;
  itemId: string;
  patientId?: string;
  assignedAt?: string;
  status: 'available' | 'assigned' | 'trial' | 'sold' | 'returned';
  notes?: string;
}

export interface BulkInventoryOperation {
  type: 'import' | 'update' | 'delete' | 'stock_adjustment';
  items: Partial<InventoryItem>[];
  options?: {
    skipValidation?: boolean;
    updateExisting?: boolean;
    createMissing?: boolean;
  };
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{
    index: number;
    item: Partial<InventoryItem>;
    error: string;
  }>;
}

export interface InventoryFormData {
  name: string;
  brand: string;
  model?: string;
  category: InventoryCategory;
  type?: InventoryType;
  barcode?: string;
  stockCode?: string;
  supplier?: string;
  unit?: string;
  description?: string;
  availableInventory: number;
  reorderLevel: number;
  price: number;
  cost?: number;
  features?: string[];
  ear?: EarDirection;
  sgkCode?: string;
  isMinistryTracked?: boolean;
  warranty?: number;
  location?: string;
  notes?: string;
}

export interface InventoryValidation {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export interface CreateInventoryData {
  name: string;
  brand: string;
  category: InventoryCategory;
  availableInventory: number;
  reorderLevel: number;
  price: number;
  model?: string;
  type?: InventoryType;
  barcode?: string;
  stockCode?: string;
  supplier?: string;
  unit?: string;
  description?: string;
  cost?: number;
  features?: string[];
  availableSerials?: string[];
  ear?: EarDirection;
  sgkCode?: string;
  isMinistryTracked?: boolean;
  warranty?: number;
  location?: string;
  notes?: string;
}

export interface UpdateInventoryData extends Partial<CreateInventoryData> {
  id: string;
  status?: InventoryStatus;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  reference?: string;
  serialNumbers?: string[];
  performedBy: string;
  createdAt: string;
  notes?: string;
}

export interface InventoryAudit {
  id: string;
  itemId: string;
  action: 'create' | 'update' | 'delete' | 'stock_change' | 'assignment';
  changes: Record<string, { old: unknown; new: unknown }>;
  performedBy: string;
  timestamp: string;
  notes?: string;
}