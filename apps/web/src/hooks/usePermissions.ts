import { useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { useCallback, useMemo } from 'react';
import {
  useListPermissionMy,
  useListPermissions,
  useGetPermissionRole,
  useUpdatePermissionRole,
  ListPermissionsQueryResult,
  GetPermissionRoleQueryResult
} from '../api/generated/permissions/permissions';

// Permission categories
export const PERMISSION_CATEGORIES = {
  parties: { label: 'Hastalar', icon: 'users' },
  sales: { label: 'Satışlar', icon: 'shopping-cart' },
  finance: { label: 'Finans', icon: 'dollar-sign' },
  invoices: { label: 'Faturalar', icon: 'file-text' },
  devices: { label: 'Cihazlar', icon: 'headphones' },
  inventory: { label: 'Stok', icon: 'package' },
  campaigns: { label: 'Kampanyalar', icon: 'megaphone' },
  personnel: { label: 'Personel', icon: 'briefcase' },
  sgk: { label: 'SGK', icon: 'shield' },
  settings: { label: 'Ayarlar', icon: 'settings' },
  team: { label: 'Ekip', icon: 'users-round' },
  reports: { label: 'Raporlar', icon: 'bar-chart' },
  dashboard: { label: 'Dashboard', icon: 'layout-dashboard' },
} as const;

export type PermissionCategory = keyof typeof PERMISSION_CATEGORIES;

const normalizeRole = (role?: string | null): string => (role || '').trim().toLowerCase();

const PERMISSION_ALIASES: Record<string, string[]> = {
  'patient:read': ['parties.view', 'patients.view'],
  'patient:write': ['parties.create', 'parties.edit'],
  'patient:delete': ['parties.delete'],
  'appointment:read': ['appointments.view'],
  'appointment:write': ['appointments.create', 'appointments.edit'],
  'sale:read': ['sales.view'],
  'sale:write': ['sales.create', 'sales.edit'],
  'branches:read': ['branches.view'],
  'branches:write': ['branches.create', 'branches.edit'],
  'activity_logs:read': ['activity_logs.view', 'reports.activity.view'],
  'activity_logs.view': ['reports.activity.view'],
  'reports.view': [
    'reports.overview.view',
    'reports.sales.view',
    'reports.parties.view',
    'reports.promissory.view',
    'reports.remaining.view',
    'reports.pos_movements.view',
    'reports.report_tracking.view',
  ],
  'dashboard:read': ['dashboard.view', 'dashboard.analytics'],
};

function expandPermissions(rawPermissions: string[]): string[] {
  const expanded = new Set<string>();

  rawPermissions.forEach((permission) => {
    expanded.add(permission);
    const aliases = PERMISSION_ALIASES[permission];
    aliases?.forEach((alias) => expanded.add(alias));
  });

  return Array.from(expanded);
}

/**
 * Hook to check and manage user permissions
 */
export function usePermissions() {
  const { isAuthenticated, user } = useAuthStore();
  const normalizedRole = normalizeRole(user?.role);
  const isTenantAdminRole = normalizedRole === 'admin' || normalizedRole === 'tenant_admin' || normalizedRole === 'owner';

  // Fetch current user's permissions
  const {
    data: myPermissions,
    isLoading,
    error,
    refetch
  } = useListPermissionMy({
    query: {
      enabled: isAuthenticated,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    }
  });

  const permissions = useMemo(() => {
    const serverPermissions = myPermissions?.data?.permissions || [];

    if (serverPermissions.length > 0) {
      return expandPermissions(serverPermissions);
    }

    if (isTenantAdminRole) {
      return ['*'];
    }

    return [];
  }, [isTenantAdminRole, myPermissions]);

  const isSuperAdmin = myPermissions?.data?.isSuperAdmin || normalizedRole === 'super_admin' || user?.is_super_admin === true;
  const role = myPermissions?.data?.role || user?.role;

  /**
   * Check if user has a specific permission
   * Supports wildcard (*) permission which grants all permissions
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (isSuperAdmin) return true;
    // Check for wildcard permission
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  }, [permissions, isSuperAdmin]);

  /**
   * Check if user has any of the specified permissions
   * Supports wildcard (*) permission which grants all permissions
   */
  const hasAnyPermission = useCallback((perms: string[]): boolean => {
    if (isSuperAdmin) return true;
    // Check for wildcard permission
    if (permissions.includes('*')) return true;
    return perms.some(p => permissions.includes(p));
  }, [permissions, isSuperAdmin]);

  /**
   * Check if user has all of the specified permissions
   * Supports wildcard (*) permission which grants all permissions
   */
  const hasAllPermissions = useCallback((perms: string[]): boolean => {
    if (isSuperAdmin) return true;
    // Check for wildcard permission
    if (permissions.includes('*')) return true;
    return perms.every(p => permissions.includes(p));
  }, [permissions, isSuperAdmin]);

  /**
   * Check if user can access a specific category (has at least view permission)
   * Supports wildcard (*) permission which grants all permissions
   */
  const canAccessCategory = useCallback((category: PermissionCategory): boolean => {
    if (isSuperAdmin) return true;
    // Check for wildcard permission
    if (permissions.includes('*')) return true;
    return permissions.some(p => p.startsWith(`${category}.`));
  }, [permissions, isSuperAdmin]);

  /**
   * Get all permissions for a category
   */
  const getCategoryPermissions = useCallback((category: PermissionCategory): string[] => {
    return permissions.filter(p => p.startsWith(`${category}.`));
  }, [permissions]);

  return {
    // State
    permissions,
    role,
    isSuperAdmin,
    isLoading,
    error,

    // Methods
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessCategory,
    getCategoryPermissions,
    refetch,
  };
}

/**
 * Hook to fetch all permissions (admin only)
 */
export function useAllPermissions(): UseQueryResult<ListPermissionsQueryResult | undefined, unknown> {
  const { isAuthenticated, user } = useAuthStore();
  const role = normalizeRole(user?.role);
  const isAdmin = role === 'admin' || role === 'tenant_admin';

  return useListPermissions({
    query: {
      enabled: isAuthenticated && isAdmin,
      staleTime: 5 * 60 * 1000,
    }
  });
}

/**
 * Hook to fetch permissions for a specific role (admin only)
 */
export function useRolePermissions(roleName: string | null): UseQueryResult<GetPermissionRoleQueryResult | undefined, unknown> {
  const { isAuthenticated, user } = useAuthStore();
  const role = normalizeRole(user?.role);
  const isAdmin = role === 'admin' || role === 'tenant_admin';

  return useGetPermissionRole(roleName || '', {
    query: {
      enabled: isAuthenticated && isAdmin && !!roleName,
      staleTime: 5 * 60 * 1000,
    }
  });
}

/**
 * Hook to update role permissions (admin only)
 */
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useUpdatePermissionRole({
    mutation: {
      onSuccess: (_, variables) => {
        // Invalidate role permissions cache
        queryClient.invalidateQueries({ queryKey: [`/api/permissions/role/${variables.roleName}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/permissions/my`] });
      },
    }
  });
}
