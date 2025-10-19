export interface InventoryItem {
  id: string;
  productName: string;
  brand: string;
  model: string;
  category: string;
  stock: number;
  minStock: number;
  unitPrice: number;
  vatIncludedPrice: number;
  totalValue: number;
  barcode?: string;
  serialNumber?: string;
  supplier?: string;
  warrantyPeriod?: string;
  description?: string;
  features?: string[];
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: string;
  updatedAt: string;
}

export interface InventoryFilters {
  search: string;
  category: string;
  brand: string;
  status: string;
  lowStock: boolean;
}

export interface InventoryStats {
  totalProducts: number;
  lowStockCount: number;
  totalValue: number;
  activeTrials: number;
}