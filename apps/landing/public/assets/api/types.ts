// Shared Type Definitions for API Client

// Standard API Response Envelope
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  requestId?: string;
  timestamp?: string;
}

// Error Response
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  status?: number;
}

// Patient Types
export interface Patient {
  id?: string;
  tcNumber?: string;
  tc_number?: string;
  identityNumber?: string;
  identity_number?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  birth_date?: string;
  gender?: 'M' | 'F';
  addressCity?: string;
  address_city?: string;
  addressDistrict?: string;
  address_district?: string;
  addressFull?: string;
  address_full?: string;
  status?: 'active' | 'inactive';
  segment?: string;
  acquisitionType?: string;
  acquisition_type?: string;
  conversionStep?: string;
  conversion_step?: string;
  referredBy?: string;
  referred_by?: string;
  priorityScore?: number;
  priority_score?: number;
  tags?: string[];
  sgkInfo?: any;
  sgk_info?: any;
  customData?: any;
  custom_data?: any;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

// Query Parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SearchParams {
  q?: string;
  search?: string;
}

export interface PatientQueryParams extends PaginationParams, SearchParams {
  status?: 'active' | 'inactive';
  segment?: string;
}

// Request Options
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// Client Status
export interface ClientStatus {
  useGeneratedClient: boolean;
  hasGeneratedClient: boolean;
  enableShadowValidation: boolean;
  timestamp: string;
}