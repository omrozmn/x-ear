import { usePermissions, PermissionCategory } from './usePermissions';

/**
 * Hook-based permission check for more complex scenarios
 * Returns a function that can be used inline
 */
export function usePermissionCheck() {
    const { hasPermission, hasAnyPermission, hasAllPermissions, canAccessCategory, isSuperAdmin } = usePermissions();

    return {
        can: (permission: string) => isSuperAdmin || hasPermission(permission),
        canAny: (permissions: string[]) => isSuperAdmin || hasAnyPermission(permissions),
        canAll: (permissions: string[]) => isSuperAdmin || hasAllPermissions(permissions),
        canAccess: (category: PermissionCategory) => isSuperAdmin || canAccessCategory(category),
    };
}
