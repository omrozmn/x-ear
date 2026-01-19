// Thin Orval adapter for appointments
// Keep this file < 300 LOC. It must only wrap generated Orval client methods.
import { appointmentsApi } from '@/generated/orval';

export type Appointment = {
  id: string;
  partyId: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  notes?: string;
  clinicianId?: string;
};

export type CreateAppointmentBody = Omit<Appointment, 'id'>;

export const appointmentsService = {
  list: (params: { page?: number; per_page?: number; search?: string }) =>
    appointmentsApi.getAppointments(params),

  get: (id: string) => appointmentsApi.getAppointment(id),

  create: (body: CreateAppointmentBody, opts?: { idempotencyKey?: string }) =>
    appointmentsApi.createAppointment(body, { headers: { 'Idempotency-Key': opts?.idempotencyKey } }),

  update: (id: string, body: Partial<CreateAppointmentBody>, opts?: { idempotencyKey?: string }) =>
    appointmentsApi.updateAppointment(id, body, { headers: { 'Idempotency-Key': opts?.idempotencyKey } }),

  remove: (id: string, opts?: { idempotencyKey?: string }) =>
    appointmentsApi.deleteAppointment(id, { headers: { 'Idempotency-Key': opts?.idempotencyKey } }),
};
