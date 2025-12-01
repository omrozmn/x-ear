/// <reference types="vite/client" />
// API Client for X-Ear Web Application
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
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
    isActive?: boolean;
    lastLogin?: string;
  };
  success: boolean;
  requestId: string;
  timestamp: string;
}

export interface Patient {
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
    patients: Patient[];
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
    let token: string | null = null;
    try {
      if (typeof window !== 'undefined') {
        token = (window as any).__AUTH_TOKEN__ || localStorage.getItem('x-ear.auth.token@v1') || localStorage.getItem('auth_token');
      }
    } catch (e) {
      token = localStorage.getItem('auth_token');
    }

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
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  }

  async refreshToken(): Promise<ApiResponse<LoginResponse>> {
    const refreshToken = localStorage.getItem('refresh_token');
    return this.request<LoginResponse>('/auth/refresh', {
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
    const endpoint = `/patients${queryString ? `?${queryString}` : ''}`;

    return this.request<PatientsResponse>(endpoint);
  }

  async getPatient(id: string): Promise<ApiResponse<{ patient: Patient }>> {
    return this.request<{ patient: Patient }>(`/patients/${id}`);
  }

  async createPatient(patient: CreatePatientRequest): Promise<ApiResponse<{ patient: Patient }>> {
    return this.request<{ patient: Patient }>('/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    });
  }

  async updatePatient(id: string, patient: UpdatePatientRequest): Promise<ApiResponse<{ patient: Patient }>> {
    return this.request<{ patient: Patient }>(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patient),
    });
  }

  async deletePatient(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/patients/${id}`, {
      method: 'DELETE',
    });
  }

  // Tenant User Management
  async getTenantUsers(): Promise<ApiResponse<{ data: any[] }>> {
    return this.request<{ data: any[] }>('/tenant/users');
  }

  async inviteTenantUser(data: { email: string; firstName: string; lastName: string; role: string }): Promise<ApiResponse<{ data: any; tempPassword?: string }>> {
    return this.request<{ data: any; tempPassword?: string }>('/tenant/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTenantUser(userId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/tenant/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async updateTenantUser(userId: string, data: any): Promise<ApiResponse<{ data: any }>> {
    return this.request<{ data: any }>(`/tenant/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);