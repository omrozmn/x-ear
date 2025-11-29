import { Appointment, AppointmentFormData } from '../types/appointment';
import { customInstance } from './orval-mutator';

// API response wrapper type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: any;
  requestId: string;
  timestamp: string;
}

// Appointments API using Orval axios
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
    const endpoint = queryString ? `/api/appointments?${queryString}` : '/api/appointments';

    const response = await customInstance<ApiResponse<Appointment[]>>({
      url: endpoint,
      method: 'GET',
    });
    return response.data.data || [];
  },

  // Get single appointment
  async getAppointment(id: string): Promise<Appointment> {
    const response = await customInstance<ApiResponse<Appointment>>({
      url: `/api/appointments/${id}`,
      method: 'GET',
    });
    return response.data.data!;
  },

  // Get calendar appointments for date range
  async getCalendarAppointments(date: string): Promise<Appointment[]> {
    const response = await customInstance<ApiResponse<Appointment[]>>({
      url: `/api/appointments/calendar?date=${date}`,
      method: 'GET',
    });
    return response.data.data || [];
  },

  // Create new appointment
  async createAppointment(
    data: AppointmentFormData,
    idempotencyKey: string
  ): Promise<Appointment> {
    const response = await customInstance<ApiResponse<Appointment>>({
      url: '/api/appointments',
      method: 'POST',
      data,
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return response.data.data!;
  },

  // Update appointment
  async updateAppointment(
    id: string,
    data: Partial<AppointmentFormData>,
    idempotencyKey: string
  ): Promise<Appointment> {
    const response = await customInstance<ApiResponse<Appointment>>({
      url: `/api/appointments/${id}`,
      method: 'PUT',
      data,
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return response.data.data!;
  },

  // Delete appointment
  async deleteAppointment(id: string, idempotencyKey: string): Promise<void> {
    await customInstance({
      url: `/api/appointments/${id}`,
      method: 'DELETE',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
  },

  // Bulk update appointments
  async bulkUpdateAppointments(
    ids: string[],
    data: Partial<AppointmentFormData>,
    idempotencyKey: string
  ): Promise<Appointment[]> {
    const response = await customInstance<ApiResponse<Appointment[]>>({
      url: '/api/appointments/bulk',
      method: 'PUT',
      data: { ids, data },
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return response.data.data || [];
  },

  // Get available time slots for a date
  async getAvailableTimeSlots(date: string, branchId?: string): Promise<string[]> {
    const endpoint = branchId
      ? `/api/appointments/available-slots?date=${date}&branchId=${branchId}`
      : `/api/appointments/available-slots?date=${date}`;

    const response = await customInstance<ApiResponse<string[]>>({
      url: endpoint,
      method: 'GET',
    });
    return response.data.data || [];
  },

  // Search patients for appointment booking
  async searchPatients(query: string): Promise<Array<{
    id: string;
    name: string;
    phone?: string;
    email?: string;
  }>> {
    const response = await customInstance<ApiResponse<Array<{
      id: string;
      name: string;
      phone?: string;
      email?: string;
    }>>>({
      url: `/api/patients/search?q=${encodeURIComponent(query)}`,
      method: 'GET',
    });
    return response.data.data || [];
  },
};