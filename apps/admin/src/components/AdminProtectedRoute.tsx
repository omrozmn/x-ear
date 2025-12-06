/**
 * Admin Protected Route Component
 * 
 * İzin bazlı route koruma wrapper'ı.
 * Kullanıcının belirli bir izni yoksa erişimi engeller.
 */

import { Navigate, useLocation } from '@tanstack/react-router';
import { useAdminPermissions } from '@/hooks/useAdminPermission';
import { AdminPermissionCode } from '@/types';
import { Loader2 } from 'lucide-react';

interface AdminProtectedRouteProps {
    permission?: AdminPermissionCode;
    permissions?: AdminPermissionCode[];
    mode?: 'any' | 'all';
    requireSuperAdmin?: boolean;
    children: React.ReactNode;
    redirectTo?: string;
}

/**
 * İzin bazlı route koruma component'i
 * 
 * @example
 * // Tek izin kontrolü
 * <AdminProtectedRoute permission={AdminPermissions.TENANTS_MANAGE}>
 *   <TenantsPage />
 * </AdminProtectedRoute>
 * 
 * @example
 * // Birden fazla izin (herhangi biri yeterli)
 * <AdminProtectedRoute 
 *   permissions={[AdminPermissions.BILLING_READ, AdminPermissions.BILLING_MANAGE]} 
 *   mode="any"
 * >
 *   <BillingPage />
 * </AdminProtectedRoute>
 * 
 * @example
 * // SuperAdmin zorunlu
 * <AdminProtectedRoute requireSuperAdmin>
 *   <SystemSettingsPage />
 * </AdminProtectedRoute>
 */
export function AdminProtectedRoute({
    permission,
    permissions,
    mode = 'any',
    requireSuperAdmin = false,
    children,
    redirectTo = '/unauthorized',
}: AdminProtectedRouteProps) {
    const { data, isLoading, isError } = useAdminPermissions();
    const location = useLocation();

    // Loading durumu
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Hata veya data yok
    if (isError || !data) {
        return <Navigate to="/login" search={{ redirect: location.pathname }} />;
    }

    // SuperAdmin kontrolü
    if (requireSuperAdmin) {
        if (!data.is_super_admin) {
            return <Navigate to={redirectTo} />;
        }
        return <>{children}</>;
    }

    // SuperAdmin her şeye erişebilir
    if (data.is_super_admin) {
        return <>{children}</>;
    }

    // Tek izin kontrolü
    if (permission) {
        if (!data.permissions.includes(permission)) {
            return <Navigate to={redirectTo} />;
        }
        return <>{children}</>;
    }

    // Çoklu izin kontrolü
    if (permissions && permissions.length > 0) {
        const hasAccess = mode === 'any'
            ? permissions.some(p => data.permissions.includes(p))
            : permissions.every(p => data.permissions.includes(p));

        if (!hasAccess) {
            return <Navigate to={redirectTo} />;
        }
    }

    return <>{children}</>;
}

export default AdminProtectedRoute;
