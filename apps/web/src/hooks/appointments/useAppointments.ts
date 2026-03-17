import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsService, CreateAppointmentBody } from '@/services/appointments/appointments.service';
import { useAuthStore } from '@/stores/authStore';

function useAppointmentsQueryKey() {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.effectiveTenantId || user?.tenantId || 'no-tenant';
  return ['appointments', tenantId] as const;
}

export function useAppointmentsList(params?: { page?: number; per_page?: number; search?: string }) {
  const queryKey = useAppointmentsQueryKey();
  return useQuery({ queryKey, queryFn: () => appointmentsService.list(params ?? {}) });
}

export function useAppointment(id: string) {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.effectiveTenantId || user?.tenantId || 'no-tenant';
  return useQuery({ queryKey: ['appointments', tenantId, id], queryFn: () => appointmentsService.get(id) });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  const queryKey = useAppointmentsQueryKey();
  return useMutation({
    mutationFn: (body: CreateAppointmentBody & { idempotencyKey?: string }) => appointmentsService.create(body, { idempotencyKey: body.idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  const queryKey = useAppointmentsQueryKey();
  return useMutation({
    mutationFn: ({ id, body, idempotencyKey }: { id: string; body: Partial<CreateAppointmentBody>; idempotencyKey?: string }) => appointmentsService.update(id, body, { idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  const queryKey = useAppointmentsQueryKey();
  return useMutation({
    mutationFn: ({ id, idempotencyKey }: { id: string; idempotencyKey?: string }) => appointmentsService.remove(id, { idempotencyKey }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
}
