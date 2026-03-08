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
        return data.permissions.includes(permission) ? <>{children}</> : <>{fallback}</>;
    }

    if (permissions) {
        const hasAccess = mode === 'any'
            ? permissions.some((item) => data.permissions.includes(item))
            : permissions.every((item) => data.permissions.includes(item));

        return hasAccess ? <>{children}</> : <>{fallback}</>;
    }

    return <>{children}</>;
}
