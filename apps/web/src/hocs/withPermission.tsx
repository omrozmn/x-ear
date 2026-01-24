import React from 'react';
import { PermissionGate } from '../components/PermissionGate';
import { PermissionCategory } from '../hooks/usePermissions';
import { ReactNode } from 'react';

// Re-defining props interface to avoid circular dependency or import issues
// Ideally we should export this from PermissionGate.tsx but HMR might complain if we export interface alongside component
// But interfaces are erased at runtime so it should be fine.
// However, let's just import it if possible, or redefine a subset.

// Actually, importing the component PermissionGate is fine.
// But we need the Props type.
// Let's import PermissionGate and try to use `React.ComponentProps<typeof PermissionGate>`.

type PermissionGateProps = React.ComponentProps<typeof PermissionGate>;

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
