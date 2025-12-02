import { ReactNode } from 'react';
import { usePermissions, PermissionCategory } from '../hooks/usePermissions';

interface PermissionGateProps {
  /** Single permission to check */
  permission?: string;
  /** Array of permissions - user needs ANY of these */
  anyOf?: string[];
  /** Array of permissions - user needs ALL of these */
  allOf?: string[];
  /** Category to check access for */
  category?: PermissionCategory;
  /** Content to render when user has permission */
  children: ReactNode;
  /** Fallback content when permission denied (defaults to null) */
  fallback?: ReactNode;
  /** Show loading state while checking permissions */
  showLoading?: boolean;
  /** Custom loading component */
  loadingComponent?: ReactNode;
}

/**
 * Component to conditionally render content based on user permissions.
 * 
 * @example
 * // Single permission
 * <PermissionGate permission="patients.create">
 *   <CreatePatientButton />
 * </PermissionGate>
 * 
 * @example
 * // Any of multiple permissions
 * <PermissionGate anyOf={['patients.edit', 'patients.delete']}>
 *   <PatientActions />
 * </PermissionGate>
 * 
 * @example
 * // All permissions required
 * <PermissionGate allOf={['finance.view', 'finance.reports']}>
 *   <FinancialReports />
 * </PermissionGate>
 * 
 * @example
 * // Category access
 * <PermissionGate category="settings">
 *   <SettingsPanel />
 * </PermissionGate>
 * 
 * @example
 * // With fallback
 * <PermissionGate permission="team.delete" fallback={<DisabledButton />}>
 *   <DeleteTeamMemberButton />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  anyOf,
  allOf,
  category,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, canAccessCategory, isLoading, isSuperAdmin } = usePermissions();

  // Show loading state if requested
  if (isLoading && showLoading) {
    return <>{loadingComponent || <PermissionLoadingSkeleton />}</>;
  }

  // Super admin bypass
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Check permissions based on provided props
  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (anyOf && anyOf.length > 0) {
    hasAccess = hasAnyPermission(anyOf);
  } else if (allOf && allOf.length > 0) {
    hasAccess = hasAllPermissions(allOf);
  } else if (category) {
    hasAccess = canAccessCategory(category);
  } else {
    // No permission specified - allow access
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Default loading skeleton for permission checks
 */
function PermissionLoadingSkeleton() {
  return (
    <div className="animate-pulse bg-gray-200 rounded h-8 w-24" />
  );
}

/**
 * HOC version of PermissionGate for wrapping components
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permissionConfig: Omit<PermissionGateProps, 'children'>
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGate {...permissionConfig}>
        <WrappedComponent {...props} />
      </PermissionGate>
    );
  };
}

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

export default PermissionGate;
