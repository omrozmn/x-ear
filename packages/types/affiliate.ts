export interface Affiliate {
  id: number;
  email: string;
  iban: string;
  account_holder_name?: string;
  phone_number?: string;
  is_active: boolean;
  created_at: string;
}

export interface AffiliateRegisterRequest {
  email: string;
  password: string;
  iban: string;
}

export interface AffiliateLoginRequest {
  email: string;
  password: string;
}

export interface AffiliateListResponse extends Array<Affiliate> {}
