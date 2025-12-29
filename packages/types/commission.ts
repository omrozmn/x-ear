export interface CommissionLedger {
  id: number;
  affiliate_id: number;
  tenant_id: number;
  event: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CommissionCreateRequest {
  affiliate_id: number;
  tenant_id: number;
  event: string;
  amount: number;
}

export interface CommissionUpdateStatusRequest {
  commission_id: number;
  status: string;
}

export interface CommissionListResponse extends Array<CommissionLedger> {}
