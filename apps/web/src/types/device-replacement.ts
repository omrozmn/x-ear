export interface DeviceReplacementHistory {
  id: string;
  patientId: string;
  oldDeviceId: string;
  newDeviceId: string;
  oldDeviceInfo: DeviceInfo;
  newDeviceInfo: DeviceInfo;
  replacementReason: string;
  replacementDate: string;
  replacedBy: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  returnInvoiceId?: string;
  returnInvoiceStatus?: 'pending' | 'created' | 'sent_to_gib' | 'completed';
  priceDifference?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceInfo {
  brand: string;
  model: string;
  serialNumber: string;
  deviceType: string;
  price: number;
  warrantyEndDate?: string;
  condition?: string;
}

export interface DeviceReplacementRequest {
  patientId: string;
  saleId?: string;
  oldDeviceId: string;
  oldDeviceInfo?: Partial<DeviceInfo>;
  newInventoryId?: string;
  newDeviceInfo?: Partial<DeviceInfo>;
  replacementReason: string;
  priceDifference?: number;
  notes?: string;
  createReturnInvoice?: boolean;
  invoiceType?: 'individual' | 'corporate' | 'e_archive';
}

export interface DeviceReplacementResponse {
  success: boolean;
  data?: DeviceReplacementHistory;
  error?: string;
  warning?: string;
  timestamp: string;
}

export const REPLACEMENT_REASONS = [
  'defective',
  'upgrade',
  'warranty_replacement',
  'patient_request',
  'technical_issue',
  'compatibility_issue',
  'other'
] as const;

export type ReplacementReason = typeof REPLACEMENT_REASONS[number];

export const REPLACEMENT_REASON_LABELS: Record<ReplacementReason, string> = {
  defective: 'Arızalı Cihaz',
  upgrade: 'Yükseltme',
  warranty_replacement: 'Garanti Değişimi',
  patient_request: 'Hasta Talebi',
  technical_issue: 'Teknik Sorun',
  compatibility_issue: 'Uyumluluk Sorunu',
  other: 'Diğer'
};