import axios from 'axios';
import { Affiliate, AffiliateRegisterRequest, AffiliateLoginRequest } from 'x-ear/packages/types/affiliate';

const API_BASE = '/api/affiliate';

export const registerAffiliate = async (data: AffiliateRegisterRequest): Promise<Affiliate> => {
  const res = await axios.post(`${API_BASE}/register`, data);
  return res.data;
};

export const loginAffiliate = async (data: AffiliateLoginRequest): Promise<Affiliate> => {
  const res = await axios.post(`${API_BASE}/login`, data);
  return res.data;
};

export const getAffiliate = async (affiliate_id: number): Promise<Affiliate> => {
  const res = await axios.get(`${API_BASE}/me`, { params: { affiliate_id } });
  return res.data;
};
