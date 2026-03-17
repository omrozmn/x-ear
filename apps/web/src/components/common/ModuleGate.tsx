import type { ReactNode } from 'react';
import { useSector } from '../../hooks/useSector';

interface ModuleGateProps {
  /** Module ID to check (e.g., 'sgk', 'devices', 'hearing_tests') */
  module: string;
  /** Content to render when module is enabled */
  children: ReactNode;
  /** Fallback content when module is disabled (defaults to null) */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on whether a module is enabled
 * for the current tenant's sector.
 *
 * @example
 * <ModuleGate module="sgk">
 *   <SGKPanel />
 * </ModuleGate>
 *
 * @example
 * <ModuleGate module="hearing_tests" fallback={<p>Not available</p>}>
 *   <HearingTestsTab />
 * </ModuleGate>
 */
export function ModuleGate({ module, children, fallback = null }: ModuleGateProps) {
  const { isModuleEnabled } = useSector();

  if (!isModuleEnabled(module)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default ModuleGate;
