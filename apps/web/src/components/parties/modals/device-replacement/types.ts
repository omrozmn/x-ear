import type { InventoryItem } from '@/types/inventory';
import type { SelectedReturnSource } from './components/InvoiceSearchStep';

export type { SelectedReturnSource };

export interface Device {
  id: string;
  brand: string;
  model: string;
  serialNumber?: string;
  price: number;
  ear?: 'left' | 'right' | 'both';
}

export interface Party {
  id: string;
  name: string;
}

export interface DeviceInfo {
  id?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  price?: number;
}

export interface ReplacementCreatedData {
  oldDeviceId?: string;
  newInventoryId?: string;
  oldDeviceInfo: DeviceInfo;
  newDeviceInfo?: DeviceInfo;
  replacementReason: string;
  priceDifference?: number;
  notes: string;
  createReturnInvoice: boolean;
  invoiceType: 'individual' | 'corporate' | 'e_archive';
  timestamp: string;
  /** Populated when user selects a source invoice/inventory for return invoice */
  returnSource?: SelectedReturnSource;
}

export interface DeviceReplacementModalProps {
  isOpen: boolean;
  device: Device | null;
  party: Party;
  onClose: () => void;
  onReplacementCreate: (replacement: ReplacementCreatedData) => void;
}

export interface ReplacementFormData {
  replacementReason: string;
  notes: string;
  selectedInventoryItem: InventoryItem | null;
  createReturnInvoice: boolean;
  invoiceType: 'individual' | 'corporate' | 'e_archive';
  /** The selected invoice/inventory source for return invoice pre-fill */
  returnSource: SelectedReturnSource | null;
}

export interface ReplacementFormState {
  isLoading: boolean;
  error: string;
  success: boolean;
  searchTerm: string;
  inventoryItems: InventoryItem[];
}