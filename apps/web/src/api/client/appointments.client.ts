/**
 * Appointments API Client Adapter
 * 
 * This adapter provides a single point of import for all appointment-related API operations.
 * Instead of importing directly from @/api/generated/appointments/appointments, use this adapter.
 * 
 * Usage:
 *   import { listAppointments, createAppointment } from '@/api/client/appointments.client';
 */

export {
  listAppointments,
  getAppointment,
  createAppointments as createAppointment,
  createAppointmentCancel,
  createAppointmentComplete,
  createAppointmentReschedule,
  updateAppointment,
  deleteAppointment,
  getListAppointmentsQueryKey,
  useListAppointments,
  useGetAppointment,
  useCreateAppointments as useCreateAppointment,
  useCreateAppointmentCancel,
  useCreateAppointmentComplete,
  useCreateAppointmentReschedule,
  useUpdateAppointment,
  useDeleteAppointment,
} from '@/api/generated/index';

export type { AppointmentCreate, AppointmentUpdate } from '@/api/generated/schemas';
