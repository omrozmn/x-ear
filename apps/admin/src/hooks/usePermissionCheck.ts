/**
 * Permission Check Hook (Adapter for Admin Panel)
 * 
 * Provides web-app compatible permission checking interface
 * for shared components like ComposerOverlay.
 */

import { useAdminPermissions } from './useAdminPermission';

export function usePermissionCheck() {
    const { data, isLoading } = useAdminPermissions();

    const isSuperAdmin = data?.is_super_admin || false;
    const permissions = data?.permissions || [];

    return {
        can: (permission: string) => {
            if (isLoading) return false;
            if (isSuperAdmin) return true;
            return permissions.includes(permission);
        },
        canAny: (perms: string[]) => {
            if (isLoading) return false;
            if (isSuperAdmin) return true;
            return perms.some(p => permissions.includes(p));
        },
        canAll: (perms: string[]) => {
            if (isLoading) return false;
            if (isSuperAdmin) return true;
            return perms.every(p => permissions.includes(p));
        },
        isSuperAdmin,
    };
}
