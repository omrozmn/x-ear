/**
 * Admin Panel Permission Hooks
 * 
 * Frontend tarafında izin kontrolü için kullanılan hook'lar.
 * Backend'deki permission sistemi ile senkronize çalışır.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { adminApiInstance } from '@/lib/api';
import { AdminPermissionCode, AdminPermissions } from '@/types';

interface MyPermissionsResponse {
    is_super_admin: boolean;
    permissions: string[];
    roles: string[];
}

/**
 * Mevcut admin kullanıcısının izinlerini getirir
 */
export function useAdminPermissions() {
    const { isAuthenticated } = useAuth();

    return useQuery<MyPermissionsResponse>({
        queryKey: ['admin-my-permissions'],
        queryFn: async () => {
            const response = await adminApiInstance.get('/api/admin/my-permissions');
            return response.data?.data || response.data;
        },
        enabled: isAuthenticated,
        staleTime: 5 * 60 * 1000, // 5 dakika cache
        gcTime: 10 * 60 * 1000,
    });
}

/**
 * Tek bir izin kontrolü için hook
 * 
 * @example
 * const canManageTenants = useHasPermission(AdminPermissions.TENANTS_MANAGE);
 */
export function useHasPermission(permission: AdminPermissionCode): boolean {
    const { data, isLoading } = useAdminPermissions();

    if (isLoading || !data) return false;

    // SuperAdmin her şeye erişebilir
    if (data.is_super_admin) return true;

    return data.permissions.includes(permission);
}

/**
 * Birden fazla izin kontrolü için hook
 * 
 * @param permissions - Kontrol edilecek izin kodları
 * @param mode - 'any': herhangi biri yeterli, 'all': hepsi gerekli
 * 
 * @example
 * const canReadOrManage = useHasAnyPermission([
 *   AdminPermissions.TENANTS_READ,
 *   AdminPermissions.TENANTS_MANAGE
 * ], 'any');
 */
export function useHasAnyPermission(
    permissions: AdminPermissionCode[],
    mode: 'any' | 'all' = 'any'
): boolean {
    const { data, isLoading } = useAdminPermissions();

    if (isLoading || !data) return false;

    // SuperAdmin her şeye erişebilir
    if (data.is_super_admin) return true;

    if (mode === 'any') {
        return permissions.some(p => data.permissions.includes(p));
    } else {
        return permissions.every(p => data.permissions.includes(p));
    }
}

/**
 * SuperAdmin kontrolü
 */
export function useIsSuperAdmin(): boolean {
    const { data, isLoading } = useAdminPermissions();

    if (isLoading || !data) return false;

    return data.is_super_admin;
}

/**
 * İzin bazlı component gizleme için wrapper
 * 
 * @example
 * <PermissionGate permission={AdminPermissions.TENANTS_MANAGE}>
 *   <DeleteButton />
 * </PermissionGate>
 */
interface PermissionGateProps {
    permission?: AdminPermissionCode;
    permissions?: AdminPermissionCode[];
    mode?: 'any' | 'all';
    requireSuperAdmin?: boolean;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function PermissionGate({
    permission,
    permissions,
    mode = 'any',
    requireSuperAdmin = false,
    children,
    fallback = null,
}: PermissionGateProps) {
    const { data, isLoading } = useAdminPermissions();

    if (isLoading) {
        return fallback;
    }

    if (!data) {
        return fallback;
    }

    // SuperAdmin check
    if (requireSuperAdmin) {
        return data.is_super_admin ? <>{children}</> : <>{fallback}</>;
    }

    // SuperAdmin her şeye erişebilir
    if (data.is_super_admin) {
        return <>{children}</>;
    }

    // Single permission check
    if (permission) {
        return data.permissions.includes(permission) ? <>{children}</> : <>{fallback}</>;
    }

    // Multiple permissions check
    if (permissions) {
        const hasAccess = mode === 'any'
            ? permissions.some(p => data.permissions.includes(p))
            : permissions.every(p => data.permissions.includes(p));

        return hasAccess ? <>{children}</> : <>{fallback}</>;
    }

    // No permission specified, allow access
    return <>{children}</>;
}

// Re-export permission constants
export { AdminPermissions };
