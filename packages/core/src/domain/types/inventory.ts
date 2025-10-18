import { BaseEntity, Money, Status } from './common';

export interface InventoryItem extends BaseEntity {
  name: string;
  description?: string;
  sku: string;
  category: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  quantity: number;
  minQuantity: number;
  maxQuantity?: number;
  unitPrice: Money;
  totalValue: Money;
  location?: string;
  status: InventoryStatus;
  expiryDate?: string;
  supplier?: Supplier;
}

export type InventoryStatus = 
  | 'in-stock'
  | 'low-stock'
  | 'out-of-stock'
  | 'discontinued'
  | 'expired';

export interface Supplier extends BaseEntity {
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  status: Status;
}

export interface InventoryTransaction extends BaseEntity {
  itemId: string;
  type: TransactionType;
  quantity: number;
  unitPrice?: Money;
  totalAmount?: Money;
  reference?: string;
  notes?: string;
  performedBy: string;
}

export type TransactionType = 
  | 'purchase'
  | 'sale'
  | 'adjustment'
  | 'transfer'
  | 'return'
  | 'waste';

export interface InventoryCreateRequest {
  name: string;
  description?: string;
  sku: string;
  category: string;
  brand?: string;
  model?: string;
  quantity: number;
  minQuantity: number;
  maxQuantity?: number;
  unitPrice: Money;
  location?: string;
  expiryDate?: string;
  supplierId?: string;
}

export interface InventoryUpdateRequest extends Partial<InventoryCreateRequest> {
  id: string;
  status?: InventoryStatus;
}

export interface InventorySearchFilters {
  search?: string;
  category?: string;
  status?: InventoryStatus;
  lowStock?: boolean;
  expiringSoon?: boolean;
  supplierId?: string;
}