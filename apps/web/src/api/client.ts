/// <reference types="vite/client" />
// API Client for X-Ear Web Application

// Re-export Patient from generated schemas for consistency
export type { Patient } from '@/api/generated/schemas';
import { tokenManager } from '../utils/token-manager';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:5003';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token?: string;
  refreshToken?: string;
  data: {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    role?: string;
    phone?: string;
    isPhoneVerified?: boolean;
    isActive?: boolean;
    lastLogin?: string;
  };
  success: boolean;
  requires_otp?: boolean;
  requires_phone?: boolean;
  masked_phone?: string;
  requestId: string;
  timestamp: string;
}

// Legacy Patient type - use generated type instead
export interface LegacyPatient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PatientsResponse {
  success: boolean;
  data: {
    patients: LegacyPatient[];
    total: number;
    page: number;
    limit: number;
  };
  meta?: Record<string, unknown>;
  requestId: string;
  timestamp: string;
}

export interface CreatePatientRequest {
  name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
}

export interface UpdatePatientRequest {
  name?: string;
  email?: string;
  phone?: string;
  birth_date?: string;
}

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Use TokenManager for token access (single source of truth)
    const token = tokenManager.accessToken;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      credentials: 'same-origin',
      ...options,
      headers,
    });

    const data = await response.json();

    return {
      status: response.status,
      data,
    };
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    });
  }

  async refreshToken(): Promise<ApiResponse<LoginResponse>> {
    // Use TokenManager for refresh token access (single source of truth)
    const refreshToken = tokenManager.refreshToken;
    return this.request<LoginResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  // Patient management methods
  async getPatients(params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<ApiResponse<PatientsResponse>> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);

    const queryString = searchParams.toString();
    const endpoint = `/api/patients${queryString ? `?${queryString}` : ''}`;

    return this.request<PatientsResponse>(endpoint);
  }

  async getPatient(id: string): Promise<ApiResponse<{ patient: LegacyPatient }>> {
    return this.request<{ patient: LegacyPatient }>(`/api/patients/${id}`);
  }

  async createPatient(patient: CreatePatientRequest): Promise<ApiResponse<{ patient: LegacyPatient }>> {
    return this.request<{ patient: LegacyPatient }>('/api/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    });
  }

  async updatePatient(id: string, patient: UpdatePatientRequest): Promise<ApiResponse<{ patient: LegacyPatient }>> {
    return this.request<{ patient: LegacyPatient }>(`/api/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patient),
    });
  }

  async deletePatient(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/api/patients/${id}`, {
      method: 'DELETE',
    });
  }

  // Tenant User Management
  async getTenantUsers(): Promise<ApiResponse<{ data: any[] }>> {
    return this.request<{ data: any[] }>('/api/tenant/users');
  }

  async inviteTenantUser(data: { email: string; firstName: string; lastName: string; role: string }): Promise<ApiResponse<{ data: any; tempPassword?: string }>> {
    return this.request<{ data: any; tempPassword?: string }>('/api/tenant/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTenantUser(userId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/api/tenant/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async updateTenantUser(userId: string, data: any): Promise<ApiResponse<{ data: any }>> {
    return this.request<{ data: any }>(`/api/tenant/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);