import React from 'react';
import type { AdminPermissionCode } from '@/types';
import { useAdminPermissions } from './useAdminPermission';

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
    const userPermissions = Array.isArray(data?.permissions) ? data.permissions : [];

    if (isLoading || !data) {
        return <>{fallback}</>;
    }

    if (requireSuperAdmin) {
        return data.is_super_admin ? <>{children}</> : <>{fallback}</>;
    }

    if (data.is_super_admin) {
        return <>{children}</>;
    }

    if (permission) {
        return userPermissions.includes(permission) ? <>{children}</> : <>{fallback}</>;
    }

    if (permissions) {
        const hasAccess = mode === 'any'
            ? permissions.some((item) => userPermissions.includes(item))
            : permissions.every((item) => userPermissions.includes(item));

        return hasAccess ? <>{children}</> : <>{fallback}</>;
    }

    // No permission specified — deny access by default
    return <>{fallback}</>;
}
