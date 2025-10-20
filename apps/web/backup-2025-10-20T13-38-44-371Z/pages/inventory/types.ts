export interface InventoryFilters {
  search: string;
  category: string;
  brand: string;
  status: string;
}

export interface InventoryStats {
  totalProducts: number;
  lowStock: number;
  totalValue: number;
  outOfStock: number;
}

export interface BulkOperation {
  type: 'category' | 'price' | 'stock' | 'supplier' | 'delete';
  value?: string | number;
}