import { Party } from '../../../../../types/party/party-base.types';
// import { Sale, PaymentRecord as ImportedPaymentRecord } from '../../../../../types/party/party-communication.types';
import { SaleRead } from '@/api/generated/schemas';

// Export SaleRead as alias if needed, or just usage
export type Sale = SaleRead;

export interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party;
  sale: SaleRead;
  onSaleUpdate: (sale: SaleRead) => void;
  loading?: boolean;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface SGKScheme {
  id: string;
  name: string;
  code: string;
  coveragePercentage: number;
  maxAmount?: number;
  description?: string;
}

export interface ServiceInfo {
  type: 'warranty' | 'maintenance' | 'repair' | 'calibration' | 'fitting';
  description: string;
  duration?: number; // in months
  cost?: number;
  notes?: string;
}

export interface SaleFormData {
  productName: string;
  brand: string;
  model: string;
  serialNumber: string;
  listPrice: number;
  salePrice: number;
  discountAmount: number;
  sgkCoverage: number;
  notes: string;
  saleDate: string;
  deviceId: string;
  ear: 'left' | 'right' | 'both';
  warrantyPeriod: number;
  fittingDate: string;
  deliveryDate: string;
}

export interface EditSaleState {
  saleType: 'device' | 'service' | 'accessory';
  saleStatus: string;
  paymentMethod: string;
  deviceSearchTerm: string;
  showPaymentModal: boolean;
  showSgkModal: boolean;
  showServiceModal: boolean;
  showDeviceSelector: boolean;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
}