import { useQuery, useMutation, UseMutationOptions, MutationFunction, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { adminApi } from './apiMutator';

// Import generated hooks needed for aliases or usage within this file
import { useGetAdminSettings } from './api/settings/settings';
import { usePostAdminAddons, usePutAdminAddonsId, useDeleteAdminAddonsId } from './api/add-ons/add-ons';
import {
  useGetAdminTenantsIdUsers,
  usePostAdminTenants,
  usePutAdminTenantsId,
  usePutAdminTenantsIdStatus
} from './api/tenants/tenants';
import { useGetAdminUsers } from './api/users/users';
import { usePostAdminTickets, usePutAdminTicketsId } from './api/support/support';
import {
  useGetAdminInvoices,
  useGetAdminInvoicesId,
  usePostAdminInvoices,
  usePostAdminInvoicesIdPayment
} from './api/billing/billing';

// Export generated hooks
export * from './api/activity-logs/activity-logs';
export * from './api/add-ons/add-ons';
export * from './api/admin/admin';
export * from './api/affiliate/affiliate';
export * from './api/analytics/analytics';
export * from './api/auth/auth';
export * from './api/billing/billing';
export * from './api/dashboard/dashboard';
export * from './api/plans/plans';
export * from './api/settings/settings';
export * from './api/support/support';
export * from './api/tenants/tenants';
export * from './api/users/users';
export * from './api/index.schemas';

// ============================================================================
// ALIASES (Mapping generated names to legacy/manual names)
// ============================================================================

// Addons
export { usePostAdminAddons as useCreateAdminAddon };
export { usePutAdminAddonsId as useUpdateAdminAddon };
export { useDeleteAdminAddonsId as useDeleteAdminAddon };

// Tenants
export { useGetAdminTenantsIdUsers as useGetTenantUsers };
export { usePostAdminTenants as useCreateTenant };
export { usePutAdminTenantsId as useUpdateTenant };
export { usePutAdminTenantsIdStatus as useUpdateTenantStatus };

// Users
export { useGetAdminUsers as useGetAllTenantUsers };

// Support
export { usePostAdminTickets as useCreateAdminTicket };
export { usePutAdminTicketsId as useUpdateAdminTicket };

// Billing
export { useGetAdminInvoices as useGetAdminInvoices };
export { useGetAdminInvoicesId as useGetAdminInvoice };
export { usePostAdminInvoices as useCreateAdminInvoice };
export { usePostAdminInvoicesIdPayment as useRecordAdminInvoicePayment };

export const getAdminInvoicePdf = (id: string) => {
  return adminApi({
    url: `/admin/invoices/${id}/pdf`,
    method: 'GET',
    responseType: 'blob'
  });
};

// ============================================================================
// MANUAL OVERRIDES & MISSING FUNCTIONS
// ============================================================================

// Tenants Manual Override (Fixing void return type from generated code)
export const useGetTenant = (id: string, options?: any): UseQueryResult<{ data: { tenant: any } }, unknown> => {
  return useQuery({
    queryKey: [`/api/admin/tenants/${id}`],
    queryFn: () => adminApi<{ data: { tenant: any } }>({ url: `/api/admin/tenants/${id}` }),
    enabled: !!id,
    ...options?.query
  }) as UseQueryResult<{ data: { tenant: any } }, unknown>;
}

// Appointments
export const useGetAdminAppointments = (params?: any, options?: any) => {
  return useQuery({ queryKey: ['adminAppointments', params], queryFn: () => adminApi({ url: '/api/admin/appointments', params }), ...options?.query });
}

// Patients
export const useGetAdminPatients = (params?: any, options?: any) => {
  return useQuery({ queryKey: ['adminPatients', params], queryFn: () => adminApi({ url: '/api/admin/patients', params }), ...options?.query });
}

// Inventory
export const useGetAdminInventory = (params?: any, options?: any) => {
  return useQuery({ queryKey: ['adminInventory', params], queryFn: () => adminApi({ url: '/api/admin/inventory', params }), ...options?.query });
}

// Settings (mutations only - GET already exists)
export const useUpdateAdminSettings = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: UseMutationOptions<TData, TError, any, TContext> }) => {
  return useMutation({ mutationFn: (data: any) => adminApi<TData>({ url: '/api/admin/settings', method: 'PUT', data }), ...options?.mutation });
}

export const usePatchAdminSettings = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: UseMutationOptions<TData, TError, any, TContext> }) => {
  return useMutation({ mutationFn: (data: any) => adminApi<TData>({ url: '/api/admin/settings', method: 'PATCH', data }), ...options?.mutation });
}

// Files
export const useListFiles = (params?: any, options?: any): UseQueryResult<{ data: any }, unknown> => {
  return useQuery({ queryKey: ['files', params], queryFn: () => adminApi({ url: '/api/admin/files', params }), ...options?.query }) as UseQueryResult<{ data: any }, unknown>;
}

export const useGetPresignedUploadUrl = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: UseMutationOptions<TData, TError, { data: any }, TContext> }) => {
  return useMutation({ mutationFn: ({ data }: { data: any }) => adminApi<TData>({ url: '/api/admin/files/upload-url', method: 'POST', data }), ...options?.mutation });
}

export const useDeleteFile = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: UseMutationOptions<TData, TError, { fileId: string }, TContext> }) => {
  return useMutation({ mutationFn: ({ fileId }: { fileId: string }) => adminApi<TData>({ url: `/api/admin/files/${fileId}`, method: 'DELETE' }), ...options?.mutation });
}

// OCR
export const useListOCRJobs = (params?: any, options?: any) => {
  return useQuery({ queryKey: ['ocrJobs', params], queryFn: () => adminApi({ url: '/api/admin/ocr/jobs', params }), ...options?.query });
}

export const useProcessDocumentOcr = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: UseMutationOptions<TData, TError, any, TContext> }) => {
  return useMutation({ mutationFn: (data: any) => adminApi<TData>({ url: '/api/admin/ocr/process', method: 'POST', data }), ...options?.mutation });
}

// Integrations
export const useGetAdminIntegrations = (params?: any, options?: any): UseQueryResult<{ data: any }, unknown> => {
  return useQuery({ queryKey: ['adminIntegrations', params], queryFn: () => adminApi({ url: '/api/admin/integrations', params }), ...options?.query }) as UseQueryResult<{ data: any }, unknown>;
}

// SMS PACKAGES CRUD
export const getApiAdminSmsPackages = (params?: any, signal?: AbortSignal) => {
  return adminApi<{ data: any }>({ url: '/api/admin/sms/packages', params, signal });
};

export const useGetApiAdminSmsPackages = <TData = Awaited<ReturnType<typeof getApiAdminSmsPackages>>, TError = unknown>(options?: { query?: any }): UseQueryResult<{ data: any }, TError> => {
  return useQuery({ queryKey: ['adminSmsPackages', {}], queryFn: () => getApiAdminSmsPackages(), ...options?.query }) as UseQueryResult<{ data: any }, TError>;
};

export const createAdminSmsPackage = (data: any, signal?: AbortSignal) => {
  return adminApi<{ success: boolean }>({ url: '/api/admin/sms/packages', method: 'POST', data, signal });
};

export const useCreateAdminSmsPackage = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: any }) => {
  return useMutation({ mutationFn: (data: any) => createAdminSmsPackage(data.data), ...options?.mutation });
};

export const updateAdminSmsPackage = (id: string, data: any, signal?: AbortSignal) => {
  return adminApi<{ success: boolean }>({ url: `/api/admin/sms/packages/${id}`, method: 'PUT', data, signal });
};

export const useUpdateAdminSmsPackage = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: any }) => {
  return useMutation({ mutationFn: ({ id, data }: { id: string, data: any }) => updateAdminSmsPackage(id, data), ...options?.mutation });
};

export const deleteAdminSmsPackage = (id: string, signal?: AbortSignal) => {
  return adminApi<{ success: boolean }>({ url: `/api/admin/sms/packages/${id}`, method: 'DELETE', signal });
};

export const useDeleteAdminSmsPackage = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: any }) => {
  return useMutation({ mutationFn: ({ id }: { id: string }) => deleteAdminSmsPackage(id), ...options?.mutation });
};

// SMS HEADERS CRUD
export const getApiAdminSmsHeaders = (params?: any) => adminApi<{ data: any }>({ url: '/api/admin/sms/headers', params });
export const useGetApiAdminSmsHeaders = (params?: any, options?: any): UseQueryResult<{ data: any }, unknown> => useQuery({ queryKey: ['smsHeaders', params], queryFn: () => getApiAdminSmsHeaders(params), ...options?.query }) as UseQueryResult<{ data: any }, unknown>;

export const updateSmsHeaderStatus = (id: string, data: { status: string, rejectionReason?: string }) => adminApi<any>({ url: `/api/admin/sms/headers/${id}/status`, method: 'PUT', data });
export const usePutApiAdminSmsHeadersHeaderIdStatus = (options?: any) => useMutation({ mutationFn: ({ headerId, data }: { headerId: string, data: { status: string, rejectionReason?: string } }) => updateSmsHeaderStatus(headerId, data), ...options?.mutation });

// PLANS CRUD
export const createPlan = (data: any) => adminApi<any>({ url: '/api/admin/plans', method: 'POST', data });
export const useCreatePlan = (options?: any) => useMutation({ mutationFn: (data: any) => createPlan(data.data), ...options?.mutation });

export const updatePlan = (id: string, data: any) => adminApi<any>({ url: `/api/admin/plans/${id}`, method: 'PUT', data });
export const useUpdatePlan = (options?: any) => useMutation({ mutationFn: ({ id, data }: { id: string, data: any }) => updatePlan(id, data), ...options?.mutation });

export const deletePlan = (id: string) => adminApi<any>({ url: `/api/admin/plans/${id}`, method: 'DELETE' });
export const useDeletePlan = (options?: any) => useMutation({ mutationFn: ({ id }: { id: string }) => deletePlan(id), ...options?.mutation });

// VatanSms
export const getVatanSmsConfig = () => adminApi<{ data: any }>({ url: '/api/admin/integrations/sms/vatan' });
export const useGetVatanSmsConfig = (options?: any): UseQueryResult<{ data: any }, unknown> => useQuery({ queryKey: ['vatanSmsConfig'], queryFn: () => getVatanSmsConfig(), ...options?.query }) as UseQueryResult<{ data: any }, unknown>;

export const updateVatanSmsConfig = (data: any) => adminApi<any>({ url: '/api/admin/integrations/sms/vatan', method: 'PUT', data });
export const useUpdateVatanSmsConfig = (options?: any) => useMutation({ mutationFn: (data: any) => updateVatanSmsConfig(data.data), ...options?.mutation });

// Tenant Users & Actions
export const useCreateTenantUser = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: UseMutationOptions<TData, TError, { id: string, data: any }, TContext> }) => {
  return useMutation({ mutationFn: ({ id, data }: { id: string, data: any }) => adminApi<TData>({ url: `/api/admin/tenants/${id}/users`, method: 'POST', data }), ...options?.mutation });
}

export const useUpdateTenantUser = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: UseMutationOptions<TData, TError, { id: string, userId: string, data: any }, TContext> }) => {
  return useMutation({ mutationFn: ({ id, userId, data }: { id: string, userId: string, data: any }) => adminApi<TData>({ url: `/api/admin/tenants/${id}/users/${userId}`, method: 'PUT', data }), ...options?.mutation });
}

export const useSubscribeTenant = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: UseMutationOptions<TData, TError, { id: string, data: any }, TContext> }) => {
  return useMutation({ mutationFn: ({ id, data }: { id: string, data: any }) => adminApi<TData>({ url: `/api/admin/tenants/${id}/subscribe`, method: 'POST', data }), ...options?.mutation });
}

export const useAddTenantAddon = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: UseMutationOptions<TData, TError, { id: string, data: any }, TContext> }) => {
  return useMutation({ mutationFn: ({ id, data }: { id: string, data: any }) => adminApi<TData>({ url: `/api/admin/tenants/${id}/addons`, method: 'POST', data }), ...options?.mutation });
}

// Admin User Management
export const useCreateAdminUser = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: UseMutationOptions<TData, TError, { data: any }, TContext> }) => {
  return useMutation({ mutationFn: ({ data }: { data: any }) => adminApi<TData>({ url: `/api/admin/users`, method: 'POST', data }), ...options?.mutation });
}

export const useUpdateAnyTenantUser = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: UseMutationOptions<TData, TError, { id: string, data: any }, TContext> }) => {
  return useMutation({ mutationFn: ({ id, data }: { id: string, data: any }) => adminApi<TData>({ url: `/api/admin/users/${id}`, method: 'PUT', data }), ...options?.mutation });
}

// Support Manual
export const useCreateTicketResponse = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: UseMutationOptions<TData, TError, { ticketId: string, data: any }, TContext> }) => {
  return useMutation({ mutationFn: ({ ticketId, data }: { ticketId: string, data: any }) => adminApi<TData>({ url: `/api/admin/tickets/${ticketId}/response`, method: 'POST', data }), ...options?.mutation });
}

// Settings Aliases
export const useGetSystemSettings = useGetAdminSettings;
export const useUpdateSystemSettings = useUpdateAdminSettings;
export const useClearCache = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: UseMutationOptions<TData, TError, void, TContext> }) => {
  return useMutation({ mutationFn: () => adminApi<TData>({ url: '/api/admin/settings/cache/clear', method: 'POST' }), ...options?.mutation });
}
export const useTriggerBackup = <TData = any, TError = unknown, TContext = unknown>(options?: { mutation?: UseMutationOptions<TData, TError, void, TContext> }) => {
  return useMutation({ mutationFn: () => adminApi<TData>({ url: '/api/admin/settings/backup', method: 'POST' }), ...options?.mutation });
}

// Roles
export const getRoles = (params?: any) => adminApi<{ data: any }>({ url: '/api/admin/roles', params });
export const useGetRoles = (params?: any, options?: any): UseQueryResult<{ data: any }, unknown> => useQuery({ queryKey: ['roles', params], queryFn: () => getRoles(params), ...options?.query }) as UseQueryResult<{ data: any }, unknown>;

export const createRole = (data: any) => adminApi<any>({ url: '/api/admin/roles', method: 'POST', data });
export const useCreateRole = (options?: any) => useMutation({ mutationFn: (data: any) => createRole(data.data), ...options?.mutation });

export const updateRole = (id: string, data: any) => adminApi<any>({ url: `/api/admin/roles/${id}`, method: 'PUT', data });
export const useUpdateRole = (options?: any) => useMutation({ mutationFn: ({ id, data }: { id: string, data: any }) => updateRole(id, data), ...options?.mutation });

export const deleteRole = (id: string) => adminApi<any>({ url: `/api/admin/roles/${id}`, method: 'DELETE' });
export const useDeleteRole = (options?: any) => useMutation({ mutationFn: ({ id }: { id: string }) => deleteRole(id), ...options?.mutation });

export const getPermissions = (params?: any) => adminApi<{ data: any }>({ url: '/api/admin/permissions', params });
export const useGetPermissions = (params?: any, options?: any): UseQueryResult<{ data: any }, unknown> => useQuery({ queryKey: ['permissions', params], queryFn: () => getPermissions(params), ...options?.query }) as UseQueryResult<{ data: any }, unknown>;

export const updateRolePermissions = (id: string, permissions: string[]) => adminApi<any>({ url: `/api/admin/roles/${id}/permissions`, method: 'PUT', data: { permissions } });
export const useUpdateRolePermissions = (options?: any) => useMutation({ mutationFn: ({ id, permissions }: { id: string, permissions: string[] }) => updateRolePermissions(id, permissions), ...options?.mutation });

// Scan Queue
export const getScanQueue = (params?: any) => adminApi<{ data: any }>({ url: '/api/admin/scan-queue', params });
export const useGetScanQueue = (params?: any, options?: any): UseQueryResult<{ data: any }, unknown> => useQuery({ queryKey: ['scanQueue', params], queryFn: () => getScanQueue(params), ...options?.query }) as UseQueryResult<{ data: any }, unknown>;

export const retryScan = (id: string) => adminApi<any>({ url: `/api/admin/scan-queue/${id}/retry`, method: 'POST' });
export const useRetryScan = (options?: any) => useMutation({ mutationFn: ({ id }: { id: string }) => retryScan(id), ...options?.mutation });

// Notifications
export const sendNotification = (data: any) => adminApi<any>({ url: '/api/admin/notifications/send', method: 'POST', data });
export const useSendNotification = (options?: any) => useMutation({ mutationFn: (data: any) => sendNotification(data.data), ...options?.mutation });

// Production
export const getProductionOrders = (params?: any) => adminApi<{ data: any }>({ url: '/api/admin/production/orders', params });
export const useGetProductionOrders = (params?: any, options?: any): UseQueryResult<{ data: any }, unknown> => useQuery({ queryKey: ['productionOrders', params], queryFn: () => getProductionOrders(params), ...options?.query }) as UseQueryResult<{ data: any }, unknown>;

export const updateProductionOrderStatus = (id: string, status: string) => adminApi<any>({ url: `/api/admin/production/orders/${id}/status`, method: 'PUT', data: { status } });
export const useUpdateProductionOrderStatus = (options?: any) => useMutation({ mutationFn: ({ id, status }: { id: string, status: string }) => updateProductionOrderStatus(id, status), ...options?.mutation });

// API Keys
export const getApiKeys = (params?: any) => adminApi<{ data: any }>({ url: '/api/admin/api-keys', params });
export const useGetApiKeys = (params?: any, options?: any): UseQueryResult<{ data: any }, unknown> => useQuery({ queryKey: ['apiKeys', params], queryFn: () => getApiKeys(params), ...options?.query }) as UseQueryResult<{ data: any }, unknown>;

export const createApiKey = (data: any) => adminApi<any>({ url: '/api/admin/api-keys', method: 'POST', data });
export const useCreateApiKey = (options?: any) => useMutation({ mutationFn: (data: any) => createApiKey(data.data), ...options?.mutation });

export const revokeApiKey = (id: string) => adminApi<any>({ url: `/api/admin/api-keys/${id}/revoke`, method: 'POST' });
export const useRevokeApiKey = (options?: any) => useMutation({ mutationFn: ({ id }: { id: string }) => revokeApiKey(id), ...options?.mutation });

// BirFatura
export const getBirFaturaStats = () => adminApi<{ data: any }>({ url: '/api/admin/integrations/birfatura/stats' });
export const useGetBirFaturaStats = (options?: any): UseQueryResult<{ data: any }, unknown> => useQuery({ queryKey: ['birFaturaStats'], queryFn: () => getBirFaturaStats(), ...options?.query }) as UseQueryResult<{ data: any }, unknown>;

export const getBirFaturaInvoices = (params?: any) => adminApi<{ data: any }>({ url: '/api/admin/integrations/birfatura/invoices', params });
export const useGetBirFaturaInvoices = (params?: any, options?: any): UseQueryResult<{ data: any }, unknown> => useQuery({ queryKey: ['birFaturaInvoices', params], queryFn: () => getBirFaturaInvoices(params), ...options?.query }) as UseQueryResult<{ data: any }, unknown>;

export const getBirFaturaLogs = (params?: any) => adminApi<{ data: any }>({ url: '/api/admin/integrations/birfatura/logs', params });
export const useGetBirFaturaLogs = (params?: any, options?: any): UseQueryResult<{ data: any }, unknown> => useQuery({ queryKey: ['birFaturaLogs', params], queryFn: () => getBirFaturaLogs(params), ...options?.query }) as UseQueryResult<{ data: any }, unknown>;

// Marketplaces
export const getMarketplaceIntegrations = (params?: any) => adminApi<{ data: any }>({ url: '/api/admin/marketplaces', params });
export const useGetMarketplaceIntegrations = (params?: any, options?: any): UseQueryResult<{ data: any }, unknown> => useQuery({ queryKey: ['marketplaceIntegrations', params], queryFn: () => getMarketplaceIntegrations(params), ...options?.query }) as UseQueryResult<{ data: any }, unknown>;

export const createMarketplaceIntegration = (data: any) => adminApi<any>({ url: '/api/admin/marketplaces', method: 'POST', data });
export const useCreateMarketplaceIntegration = (options?: any) => useMutation({ mutationFn: (data: any) => createMarketplaceIntegration(data.data), ...options?.mutation });

export const syncMarketplaceIntegration = (id: string) => adminApi<any>({ url: `/api/admin/marketplaces/${id}/sync`, method: 'POST' });
export const useSyncMarketplaceIntegration = (options?: any) => useMutation({ mutationFn: ({ id }: { id: string }) => syncMarketplaceIntegration(id), ...options?.mutation });

// Notification Templates
export const getNotificationTemplates = (params?: any) => adminApi<{ data: any }>({ url: '/api/admin/notifications/templates', params });
export const useGetNotificationTemplates = (params?: any, options?: any): UseQueryResult<{ data: any }, unknown> => useQuery({ queryKey: ['notificationTemplates', params], queryFn: () => getNotificationTemplates(params), ...options?.query }) as UseQueryResult<{ data: any }, unknown>;

// User Notifications
export const getApiNotifications = (params?: any) => adminApi<{ data: any }>({ url: '/api/admin/notifications', params });
export const useGetApiNotifications = (params?: any, options?: any): UseQueryResult<{ data: any }, unknown> => useQuery({ queryKey: ['apiNotifications', params], queryFn: () => getApiNotifications(params), ...options?.query }) as UseQueryResult<{ data: any }, unknown>;

export const markNotificationRead = (id: string) => adminApi<any>({ url: `/api/admin/notifications/${id}/read`, method: 'PUT' });
export const usePutApiNotificationsNotificationIdRead = (options?: any) => useMutation({ mutationFn: ({ id }: { id: string }) => markNotificationRead(id), ...options?.mutation });

// Auth
export const adminLogin = (credentials: any) => adminApi<any>({ url: '/admin/auth/login', method: 'POST', data: credentials });
export const useAdminLogin = (options?: any) => useMutation({ mutationFn: (credentials: any) => adminLogin(credentials), ...options?.mutation });


