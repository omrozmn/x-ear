import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsService, CreateAppointmentBody } from '@/services/appointments/appointments.service';

const QUERY_KEY = ['appointments'] as const;

export function useAppointmentsList(params?: { page?: number; per_page?: number; search?: string }) {
  return useQuery({ queryKey: QUERY_KEY, queryFn: () => appointmentsService.list(params ?? {}) });
}

export function useAppointment(id: string) {
  return useQuery({ queryKey: ['appointments', id], queryFn: () => appointmentsService.get(id) });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAppointmentBody & { idempotencyKey?: string }) => appointmentsService.create(body, { idempotencyKey: body.idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, idempotencyKey }: { id: string; body: Partial<CreateAppointmentBody>; idempotencyKey?: string }) => appointmentsService.update(id, body, { idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, idempotencyKey }: { id: string; idempotencyKey?: string }) => appointmentsService.remove(id, { idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
