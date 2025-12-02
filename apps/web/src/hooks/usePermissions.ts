import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { useCallback, useMemo } from 'react';

// Permission categories
export const PERMISSION_CATEGORIES = {
  patients: { label: 'Hastalar', icon: 'users' },
  sales: { label: 'Satışlar', icon: 'shopping-cart' },
  finance: { label: 'Finans', icon: 'dollar-sign' },
  invoices: { label: 'Faturalar', icon: 'file-text' },
  devices: { label: 'Cihazlar', icon: 'headphones' },
  inventory: { label: 'Stok', icon: 'package' },
  campaigns: { label: 'Kampanyalar', icon: 'megaphone' },
  sgk: { label: 'SGK', icon: 'shield' },
  settings: { label: 'Ayarlar', icon: 'settings' },
  team: { label: 'Ekip', icon: 'users-round' },
  reports: { label: 'Raporlar', icon: 'bar-chart' },
  dashboard: { label: 'Dashboard', icon: 'layout-dashboard' },
} as const;

export type PermissionCategory = keyof typeof PERMISSION_CATEGORIES;

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';

// Helper function to make authenticated requests
async function authFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token: string | null = null;
  try {
    if (typeof window !== 'undefined') {
      token = (window as Window & { __AUTH_TOKEN__?: string }).__AUTH_TOKEN__ || 
              localStorage.getItem('x-ear.auth.token@v1') || 
              localStorage.getItem('auth_token');
    }
  } catch {
    token = localStorage.getItem('auth_token');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'same-origin',
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Permission response from API
interface MyPermissionsResponse {
  success: boolean;
  data: {
    permissions: string[];
    role: string;
    isSuperAdmin: boolean;
  };
}

interface PermissionGroup {
  category: string;
  label: string;
  icon: string;
  permissions: {
    id: string;
    name: string;
    description: string | null;
  }[];
}

interface AllPermissionsResponse {
  success: boolean;
  data: PermissionGroup[];
  all: {
    id: string;
    name: string;
    description: string | null;
  }[];
}

interface RolePermissionsResponse {
  success: boolean;
  data: {
    role: {
      id: string;
      name: string;
      description: string | null;
      isSystem: boolean;
    };
    permissions: string[];
  };
}

/**
 * Hook to check and manage user permissions
 */
export function usePermissions() {
  const { isAuthenticated, user } = useAuthStore();
  
  // Fetch current user's permissions
  const {
    data: myPermissions,
    isLoading,
    error,
    refetch
  } = useQuery<MyPermissionsResponse>({
    queryKey: ['permissions', 'my'],
    queryFn: () => authFetch<MyPermissionsResponse>('/permissions/my'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const permissions = useMemo(() => 
    myPermissions?.data?.permissions || [], 
    [myPermissions]
  );
  
  const isSuperAdmin = myPermissions?.data?.isSuperAdmin || false;
  const role = myPermissions?.data?.role || user?.role;

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions.includes(permission);
  }, [permissions, isSuperAdmin]);

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback((perms: string[]): boolean => {
    if (isSuperAdmin) return true;
    return perms.some(p => permissions.includes(p));
  }, [permissions, isSuperAdmin]);

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback((perms: string[]): boolean => {
    if (isSuperAdmin) return true;
    return perms.every(p => permissions.includes(p));
  }, [permissions, isSuperAdmin]);

  /**
   * Check if user can access a specific category (has at least view permission)
   */
  const canAccessCategory = useCallback((category: PermissionCategory): boolean => {
    if (isSuperAdmin) return true;
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
export function useAllPermissions() {
  const { isAuthenticated, user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'tenant_admin';

  return useQuery<AllPermissionsResponse>({
    queryKey: ['permissions', 'all'],
    queryFn: () => authFetch<AllPermissionsResponse>('/permissions'),
    enabled: isAuthenticated && isAdmin,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch permissions for a specific role (admin only)
 */
export function useRolePermissions(roleName: string | null) {
  const { isAuthenticated, user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'tenant_admin';

  return useQuery<RolePermissionsResponse>({
    queryKey: ['permissions', 'role', roleName],
    queryFn: () => authFetch<RolePermissionsResponse>(`/permissions/role/${roleName}`),
    enabled: isAuthenticated && isAdmin && !!roleName,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to update role permissions (admin only)
 */
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ roleName, permissions }: { roleName: string; permissions: string[] }) => {
      return authFetch(`/permissions/role/${roleName}`, {
        method: 'PUT',
        body: JSON.stringify({ permissions }),
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate role permissions cache
      queryClient.invalidateQueries({ queryKey: ['permissions', 'role', variables.roleName] });
      queryClient.invalidateQueries({ queryKey: ['permissions', 'my'] });
    },
  });
}
