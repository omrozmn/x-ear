/**
 * Cargo Integrations API Client
 */
import { customInstance } from '@/api/orval-mutator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface CargoIntegration {
  id: string;
  platform: string;
  name?: string;
  customerId?: string;
  isActive: boolean;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CargoIntegrationCreate {
  platform: string;
  name?: string;
  apiKey?: string;
  apiSecret?: string;
  customerId?: string;
  otherParams?: string;
}

export interface CargoIntegrationUpdate {
  name?: string;
  apiKey?: string;
  apiSecret?: string;
  customerId?: string;
  otherParams?: string;
  isActive?: boolean;
}

// API
export const listCargoIntegrations = () =>
  customInstance<{ data: CargoIntegration[] }>({ url: '/api/cargo-integrations', method: 'GET' });

export const createCargoIntegration = (data: CargoIntegrationCreate) =>
  customInstance<{ data: CargoIntegration }>({ url: '/api/cargo-integrations', method: 'POST', data });

export const updateCargoIntegration = (id: string, data: CargoIntegrationUpdate) =>
  customInstance<{ data: CargoIntegration }>({ url: `/api/cargo-integrations/${id}`, method: 'PUT', data });

export const deleteCargoIntegration = (id: string) =>
  customInstance<{ success: boolean }>({ url: `/api/cargo-integrations/${id}`, method: 'DELETE' });

export const testCargoIntegration = (id: string) =>
  customInstance<{ success: boolean; status: string }>({ url: `/api/cargo-integrations/${id}/test`, method: 'POST' });

// Query key
export const getCargoIntegrationsQueryKey = () => ['cargo-integrations'];

// Hooks
export function useListCargoIntegrations() {
  return useQuery({
    queryKey: getCargoIntegrationsQueryKey(),
    queryFn: () => listCargoIntegrations(),
  });
}

export function useCreateCargoIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CargoIntegrationCreate) => createCargoIntegration(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getCargoIntegrationsQueryKey() }),
  });
}

export function useUpdateCargoIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CargoIntegrationUpdate }) => updateCargoIntegration(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getCargoIntegrationsQueryKey() }),
  });
}

export function useDeleteCargoIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCargoIntegration(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getCargoIntegrationsQueryKey() }),
  });
}

export function useTestCargoIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => testCargoIntegration(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getCargoIntegrationsQueryKey() }),
  });
}
