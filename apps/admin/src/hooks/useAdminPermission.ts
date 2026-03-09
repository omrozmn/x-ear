/**
 * Admin Panel Permission Hooks
 * 
 * Frontend tarafında izin kontrolü için kullanılan hook'lar.
 * Backend'deki permission sistemi ile senkronize çalışır.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/useAuth';
import { adminApiInstance } from '@/lib/api';
import { AdminPermissionCode, AdminPermissions } from '@/types';
import { isRecord, unwrapData } from '@/lib/orval-response';

interface MyPermissionsResponse {
    is_super_admin: boolean;
    permissions: string[];
    roles: string[];
}

function normalizePermissionsResponse(value: Partial<MyPermissionsResponse> | undefined): MyPermissionsResponse {
    return {
        is_super_admin: Boolean(value?.is_super_admin),
        permissions: Array.isArray(value?.permissions) ? value.permissions : [],
        roles: Array.isArray(value?.roles) ? value.roles : [],
    };
}

export function useAdminPermissions() {
    const { isAuthenticated } = useAuth();

    return useQuery<MyPermissionsResponse>({
        queryKey: ['admin-my-permissions'],
        queryFn: async () => {
            const response = await adminApiInstance.get<MyPermissionsResponse>('/api/admin/my-permissions');
            const payload = unwrapData<Partial<MyPermissionsResponse>>(response.data);
            return normalizePermissionsResponse(isRecord(payload) ? payload : undefined);
        },
        enabled: isAuthenticated,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}

export function useHasPermission(permission: AdminPermissionCode): boolean {
    const { data, isLoading } = useAdminPermissions();

    if (isLoading || !data) return false;

    if (data.is_super_admin) return true;

    return data.permissions.includes(permission);
}

export function useHasAnyPermission(
    permissions: AdminPermissionCode[],
    mode: 'any' | 'all' = 'any'
): boolean {
    const { data, isLoading } = useAdminPermissions();

    if (isLoading || !data) return false;

    if (data.is_super_admin) return true;

    return mode === 'any'
        ? permissions.some((permission) => data.permissions.includes(permission))
        : permissions.every((permission) => data.permissions.includes(permission));
}

export function useIsSuperAdmin(): boolean {
    const { data, isLoading } = useAdminPermissions();

    if (isLoading || !data) return false;

    return data.is_super_admin;
}

export { AdminPermissions };
