import { Appointment, AppointmentFormData } from '../types/appointment';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5003/api';

// API response wrapper type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: any;
  requestId: string;
  timestamp: string;
}

// HTTP client with proper error handling
class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    idempotencyKey?: string
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add idempotency key for mutations
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ApiResponse<T> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'API request failed');
      }

      return result.data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any, idempotencyKey?: string): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      idempotencyKey
    );
  }

  async put<T>(endpoint: string, data: any, idempotencyKey?: string): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      idempotencyKey
    );
  }

  async delete<T>(endpoint: string, idempotencyKey?: string): Promise<T> {
    return this.request<T>(
      endpoint,
      { method: 'DELETE' },
      idempotencyKey
    );
  }
}

const apiClient = new ApiClient();

// Appointments API
export const appointmentsApi = {
  // Get appointments with optional filters
  async getAppointments(filters: {
    date?: string;
    patientId?: string;
    status?: string;
    type?: string;
    branchId?: string;
  } = {}): Promise<Appointment[]> {
    const searchParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        searchParams.append(key, value);
      }
    });

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/appointments?${queryString}` : '/appointments';
    
    return apiClient.get<Appointment[]>(endpoint);
  },

  // Get single appointment
  async getAppointment(id: string): Promise<Appointment> {
    return apiClient.get<Appointment>(`/appointments/${id}`);
  },

  // Get calendar appointments for date range
  async getCalendarAppointments(date: string): Promise<Appointment[]> {
    return apiClient.get<Appointment[]>(`/appointments/calendar?date=${date}`);
  },

  // Create new appointment
  async createAppointment(
    data: AppointmentFormData,
    idempotencyKey: string
  ): Promise<Appointment> {
    return apiClient.post<Appointment>('/appointments', data, idempotencyKey);
  },

  // Update appointment
  async updateAppointment(
    id: string,
    data: Partial<AppointmentFormData>,
    idempotencyKey: string
  ): Promise<Appointment> {
    return apiClient.put<Appointment>(`/appointments/${id}`, data, idempotencyKey);
  },

  // Delete appointment
  async deleteAppointment(id: string, idempotencyKey: string): Promise<void> {
    return apiClient.delete<void>(`/appointments/${id}`, idempotencyKey);
  },

  // Bulk update appointments
  async bulkUpdateAppointments(
    ids: string[],
    data: Partial<AppointmentFormData>,
    idempotencyKey: string
  ): Promise<Appointment[]> {
    return apiClient.put<Appointment[]>(
      '/appointments/bulk',
      { ids, data },
      idempotencyKey
    );
  },

  // Get available time slots for a date
  async getAvailableTimeSlots(date: string, branchId?: string): Promise<string[]> {
    const endpoint = branchId 
      ? `/appointments/available-slots?date=${date}&branchId=${branchId}`
      : `/appointments/available-slots?date=${date}`;
    
    return apiClient.get<string[]>(endpoint);
  },

  // Search patients for appointment booking
  async searchPatients(query: string): Promise<Array<{
    id: string;
    name: string;
    phone?: string;
    email?: string;
  }>> {
    return apiClient.get<Array<{
      id: string;
      name: string;
      phone?: string;
      email?: string;
    }>>(`/patients/search?q=${encodeURIComponent(query)}`);
  },
};