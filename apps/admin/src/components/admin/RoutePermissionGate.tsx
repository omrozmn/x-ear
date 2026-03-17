import React, { useState, useEffect } from 'react';
import { useRouterState, Navigate } from '@tanstack/react-router';
import { useAdminPermissions } from '@/hooks/useAdminPermission';
import type { AdminPermissionCode } from '@/types';
import { AdminPermissions } from '@/types';

/**
 * Maps route path prefixes to required permissions.
 * Routes not listed here are accessible to any authenticated user.
 * Super admins bypass all permission checks.
 */
const ROUTE_PERMISSIONS: Record<string, AdminPermissionCode[]> = {
    '/tenants': [AdminPermissions.TENANTS_READ],
    '/users': [AdminPermissions.USERS_READ],
    '/roles': [AdminPermissions.ROLES_READ],
    '/billing': [AdminPermissions.BILLING_READ],
    '/payments': [AdminPermissions.BILLING_READ],
    '/plans': [AdminPermissions.BILLING_MANAGE],
    '/settings': [AdminPermissions.SETTINGS_READ],
    '/integrations': [AdminPermissions.INTEGRATIONS_READ],
    '/activity-logs': [AdminPermissions.ACTIVITY_LOGS_READ],
    '/api-keys': [AdminPermissions.SYSTEM_MANAGE],
    '/features': [AdminPermissions.SYSTEM_MANAGE],
    '/ai': [AdminPermissions.AI_READ],
    '/sms': [AdminPermissions.SMS_MANAGE],
    '/countries': [AdminPermissions.SYSTEM_MANAGE],
};

interface RoutePermissionGateProps {
    children: React.ReactNode;
}

export function RoutePermissionGate({ children }: RoutePermissionGateProps) {
    const router = useRouterState();
    const currentPath = router.location.pathname;
    const { data: permissions, isLoading, isError } = useAdminPermissions();
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            setTimedOut(false);
            return;
        }

        const timer = setTimeout(() => {
            setTimedOut(true);
        }, 10_000);

        return () => clearTimeout(timer);
    }, [isLoading]);

    // If error or timed out, redirect to unauthorized
    if (isError || timedOut) {
        return <Navigate to="/unauthorized" />;
    }

    // While loading, show nothing (prevents flash)
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
            </div>
        );
    }

    // Super admins can access everything
    if (permissions?.is_super_admin) {
        return <>{children}</>;
    }

    // Find matching route permission requirement
    const requiredPermissions = Object.entries(ROUTE_PERMISSIONS).find(
        ([prefix]) => currentPath === prefix || currentPath.startsWith(prefix + '/')
    );

    // No permission requirement for this route
    if (!requiredPermissions) {
        return <>{children}</>;
    }

    const [, perms] = requiredPermissions;
    const userPermissions = permissions?.permissions || [];
    const hasAccess = perms.some(perm => userPermissions.includes(perm));

    if (!hasAccess) {
        return <Navigate to="/unauthorized" />;
    }

    return <>{children}</>;
}
