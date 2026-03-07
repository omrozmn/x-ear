import { Affiliate, AffiliateRegisterRequest, AffiliateLoginRequest } from 'x-ear/packages/types/affiliate';

const API_BASE = '/api/affiliate';

export const registerAffiliate = async (data: AffiliateRegisterRequest): Promise<Affiliate> => {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const loginAffiliate = async (data: AffiliateLoginRequest): Promise<Affiliate> => {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const getAffiliate = async (affiliate_id: number): Promise<Affiliate> => {
  const url = new URL(`${API_BASE}/me`, window?.location.origin || 'http://localhost');
  url.searchParams.set('affiliate_id', String(affiliate_id));
  const res = await fetch(url.toString());
  return res.json();
};
