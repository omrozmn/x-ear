import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { Appointment, AppointmentFormData } from '../types/appointment';
import { appointmentsApi } from '../api/appointments';
import { useOutbox } from './outbox.hooks';
import { generateIdempotencyKey } from '../utils/idempotency';

// Query keys for React Query
export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...appointmentKeys.lists(), filters] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
  calendar: (date: string) => [...appointmentKeys.all, 'calendar', date] as const,
};

// Fetch appointments with filters
export const useAppointments = (filters: {
  date?: string;
  patientId?: string;
  status?: string;
  type?: string;
  branchId?: string;
} = {}) => {
  return useQuery({
    queryKey: appointmentKeys.list(filters),
    queryFn: () => appointmentsApi.getAppointments(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Fetch single appointment
export const useAppointment = (id: string) => {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => appointmentsApi.getAppointment(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch calendar appointments for a specific date range
export const useCalendarAppointments = (date: string) => {
  return useQuery({
    queryKey: appointmentKeys.calendar(date),
    queryFn: () => appointmentsApi.getCalendarAppointments(date),
    staleTime: 2 * 60 * 1000, // 2 minutes for calendar view
  });
};

// Create appointment mutation with offline-first support
export const useCreateAppointment = () => {
  const queryClient = useQueryClient();
  const { addToOutbox } = useOutbox();

  return useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const idempotencyKey = generateIdempotencyKey();
      const tempId = uuidv4();

      // Optimistic update
      const optimisticAppointment: Appointment = {
        id: tempId,
        ...data,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add to outbox for offline support
      await addToOutbox({
        type: 'CREATE_APPOINTMENT',
        endpoint: '/api/appointments',
        method: 'POST',
        data,
        idempotencyKey,
        retryCount: 0,
        createdAt: new Date().toISOString(),
      });

      // Try immediate sync if online
      try {
        const result = await appointmentsApi.createAppointment(data, idempotencyKey);
        return result;
      } catch (error) {
        // If offline, return optimistic result
        if (!navigator.onLine) {
          return optimisticAppointment;
        }
        throw error;
      }
    },
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: appointmentKeys.all });

      // Snapshot previous value
      const previousAppointments = queryClient.getQueryData(appointmentKeys.lists());

      // Optimistically update
      const tempId = uuidv4();
      const optimisticAppointment: Appointment = {
        id: tempId,
        ...data,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData(appointmentKeys.lists(), (old: Appointment[] | undefined) => {
        if (!old) return [optimisticAppointment];
        return [...old, optimisticAppointment];
      });

      return { previousAppointments, optimisticAppointment };
    },
    onError: (err, data, context) => {
      // Rollback on error
      if (context?.previousAppointments) {
        queryClient.setQueryData(appointmentKeys.lists(), context.previousAppointments);
      }
    },
    onSuccess: (result, data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
};

// Update appointment mutation with offline-first support
export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  const { addToOutbox } = useOutbox();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AppointmentFormData> }) => {
      const idempotencyKey = generateIdempotencyKey();

      // Add to outbox for offline support
      await addToOutbox({
        type: 'UPDATE_APPOINTMENT',
        endpoint: `/api/appointments/${id}`,
        method: 'PUT',
        data,
        idempotencyKey,
        retryCount: 0,
        createdAt: new Date().toISOString(),
      });

      // Try immediate sync if online
      try {
        const result = await appointmentsApi.updateAppointment(id, data, idempotencyKey);
        return result;
      } catch (error) {
        // If offline, return optimistic result
        if (!navigator.onLine) {
          const existing = queryClient.getQueryData(appointmentKeys.detail(id)) as Appointment;
          return { ...existing, ...data, updatedAt: new Date().toISOString() };
        }
        throw error;
      }
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: appointmentKeys.detail(id) });

      // Snapshot previous value
      const previousAppointment = queryClient.getQueryData(appointmentKeys.detail(id));

      // Optimistically update
      queryClient.setQueryData(appointmentKeys.detail(id), (old: Appointment | undefined) => {
        if (!old) return old;
        return { ...old, ...data, updatedAt: new Date().toISOString() };
      });

      return { previousAppointment };
    },
    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousAppointment) {
        queryClient.setQueryData(appointmentKeys.detail(id), context.previousAppointment);
      }
    },
    onSuccess: (result, { id }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
  });
};

// Delete appointment mutation with offline-first support
export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();
  const { addToOutbox } = useOutbox();

  return useMutation({
    mutationFn: async (id: string) => {
      const idempotencyKey = generateIdempotencyKey();

      // Add to outbox for offline support
      await addToOutbox({
        type: 'DELETE_APPOINTMENT',
        endpoint: `/api/appointments/${id}`,
        method: 'DELETE',
        data: {},
        idempotencyKey,
        retryCount: 0,
        createdAt: new Date().toISOString(),
      });

      // Try immediate sync if online
      try {
        await appointmentsApi.deleteAppointment(id, idempotencyKey);
        return { id };
      } catch (error) {
        // If offline, return success
        if (!navigator.onLine) {
          return { id };
        }
        throw error;
      }
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: appointmentKeys.all });

      // Snapshot previous values
      const previousAppointment = queryClient.getQueryData(appointmentKeys.detail(id));
      const previousAppointments = queryClient.getQueryData(appointmentKeys.lists());

      // Optimistically remove
      queryClient.setQueryData(appointmentKeys.lists(), (old: Appointment[] | undefined) => {
        if (!old) return old;
        return old.filter((appointment: Appointment) => appointment.id !== id);
      });

      queryClient.removeQueries({ queryKey: appointmentKeys.detail(id) });

      return { previousAppointment, previousAppointments };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousAppointments) {
        queryClient.setQueryData(appointmentKeys.lists(), context.previousAppointments);
      }
      if (context?.previousAppointment) {
        queryClient.setQueryData(appointmentKeys.detail(id), context.previousAppointment);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
};

// Reschedule appointment (special case of update)
export const useRescheduleAppointment = () => {
  const updateMutation = useUpdateAppointment();

  return useMutation({
    mutationFn: async ({
      id,
      newDate,
      newTime
    }: {
      id: string;
      newDate: string;
      newTime: string;
    }) => {
      return updateMutation.mutateAsync({
        id,
        data: {
          date: newDate,
          time: newTime,
        },
      });
    },
  });
};

// Bulk operations
export const useBulkUpdateAppointments = () => {
  const queryClient = useQueryClient();
  const { addToOutbox } = useOutbox();

  return useMutation({
    mutationFn: async ({
      ids,
      data
    }: {
      ids: string[];
      data: Partial<AppointmentFormData>;
    }) => {
      const idempotencyKey = generateIdempotencyKey();

      // Add to outbox for offline support
      await addToOutbox({
        type: 'BULK_UPDATE_APPOINTMENTS',
        endpoint: '/api/appointments/bulk',
        method: 'PUT',
        data: { ids, data },
        idempotencyKey,
        retryCount: 0,
        createdAt: new Date().toISOString(),
      });

      // Try immediate sync if online
      try {
        const result = await appointmentsApi.bulkUpdateAppointments(ids, data, idempotencyKey);
        return result;
      } catch (error) {
        // If offline, return optimistic result
        if (!navigator.onLine) {
          return ids.map(id => ({ id, ...data }));
        }
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all appointment queries
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
};

// Sync status hook for offline indicator
export const useAppointmentSyncStatus = () => {
  const { outboxItems, isOnline } = useOutbox();

  const pendingAppointmentOperations = outboxItems.filter(item =>
    item.type.includes('APPOINTMENT')
  );

  return {
    isOnline,
    hasPendingOperations: pendingAppointmentOperations.length > 0,
    pendingCount: pendingAppointmentOperations.length,
    pendingOperations: pendingAppointmentOperations,
  };
};