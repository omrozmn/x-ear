/// <reference types="vite/client" />
// API Client for X-Ear Web Application
import { tokenManager } from '../utils/token-manager';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:5003';

// API response wrapper type
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  meta?: Record<string, unknown>;
  requestId?: string;
  timestamp?: string;
}

// Legacy Party type - use generated type instead
// Legacy Party type - use generated type instead
import { PartyRead, TenantUserUpdate } from '@/api/generated/schemas';
export type LegacyParty = PartyRead;
export { type PartyRead as Party } from '@/api/generated/schemas';

export interface PartiesResponse {
  success: boolean;
  data: LegacyParty[];
  total?: number;
  meta?: {
    total?: number;
    count?: number;
    [key: string]: unknown;
  };
  requestId?: string;
  timestamp?: string;
}

export interface CreatePartyRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  tcNumber?: string;
  birthDate?: string;
  birth_date?: string;
}

export interface UpdatePartyRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tcNumber?: string;
  birthDate?: string;
  birth_date?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = tokenManager.accessToken;

    const headers = new Headers(options.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'API Request failed');
    }

    return data as ApiResponse<T>;
  }

  // Party management methods
  async getParties(params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<ApiResponse<PartiesResponse>> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);

    const queryString = searchParams.toString();
    const endpoint = `/api/parties${queryString ? `?${queryString}` : ''}`;

    return this.request<PartiesResponse>(endpoint);
  }

  async getParty(id: string): Promise<ApiResponse<{ party: LegacyParty }>> {
    return this.request<{ party: LegacyParty }>(`/api/parties/${id}`);
  }

  async createParty(party: CreatePartyRequest): Promise<ApiResponse<{ party: LegacyParty }>> {
    return this.request<{ party: LegacyParty }>('/api/parties', {
      method: 'POST',
      body: JSON.stringify(party),
    });
  }

  async updateParty(id: string, party: UpdatePartyRequest): Promise<ApiResponse<{ party: LegacyParty }>> {
    return this.request<{ party: LegacyParty }>(`/api/parties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(party),
    });
  }

  async deleteParty(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/api/parties/${id}`, {
      method: 'DELETE',
    });
  }

  // Tenant User Management
  async getTenantUsers(): Promise<ApiResponse<{ data: Record<string, unknown>[] }>> {
    return this.request<{ data: Record<string, unknown>[] }>('/api/tenant/users');
  }

  async inviteTenantUser(data: { email: string; firstName: string; lastName: string; role: string }): Promise<ApiResponse<{ data: Record<string, unknown>; tempPassword?: string }>> {
    return this.request<{ data: Record<string, unknown>; tempPassword?: string }>('/api/tenant/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTenantUser(userId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/api/tenant/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async updateTenantUser(userId: string, data: TenantUserUpdate): Promise<ApiResponse<{ data: Record<string, unknown> }>> {
    return this.request<{ data: Record<string, unknown> }>(`/api/tenant/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);