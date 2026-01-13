import { apiClient, tokenManager } from './api-client';
import { Affiliate, AffiliateRegisterRequest, AffiliateLoginRequest } from '@packages/types/affiliate';

const API_BASE = '/api/affiliate';

// Helper to unwrap backend response format { success: true, data: ... }
const unwrap = (responseBody: any) => {
  if (responseBody && responseBody.success && responseBody.data) {
    return responseBody.data;
  }
  return responseBody;
};

export const registerAffiliate = async (data: Omit<AffiliateRegisterRequest, 'iban'> & { iban?: string }): Promise<Affiliate> => {
  const res = await apiClient.post(`${API_BASE}/register`, {
    ...data,
    iban: data.iban || undefined
  });
  return unwrap(res.data);
};

export const loginAffiliate = async (data: AffiliateLoginRequest): Promise<Affiliate> => {
  const res = await apiClient.post(`${API_BASE}/login`, data);
  const result = unwrap(res.data);
  
  // Save token to TokenManager if present
  if (result.token || result.access_token) {
    tokenManager.setToken(result.token || result.access_token);
  }
  
  return result;
};

export const getAffiliate = async (affiliate_id: number): Promise<Affiliate> => {
  const res = await apiClient.get(`${API_BASE}/me`, { params: { affiliate_id } });
  return unwrap(res.data);
};

export const updateAffiliatePaymentInfo = async (affiliate_id: number, iban: string, account_holder_name?: string, phone_number?: string): Promise<Affiliate> => {
  const res = await apiClient.patch(`${API_BASE}/${affiliate_id}`, { iban, account_holder_name, phone_number });
  return unwrap(res.data);
};

export interface Commission {
  id: number;
  event: string;
  amount: number;
  status: string;
  created_at: string;
}

export const getAffiliateCommissions = async (affiliate_id: number): Promise<Commission[]> => {
  const res = await apiClient.get(`${API_BASE}/${affiliate_id}/commissions`);
  return unwrap(res.data);
};
