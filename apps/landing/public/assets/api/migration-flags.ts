// Migration Feature Flags
// Controls the gradual rollout of the generated API client

export interface MigrationFlags {
  // Core feature flags
  useGeneratedClient: boolean;
  enableShadowValidation: boolean;
  
  // Granular operation flags
  useGeneratedForGET: boolean;
  useGeneratedForPOST: boolean;
  useGeneratedForPUT: boolean;
  useGeneratedForDELETE: boolean;
  
  // Entity-specific flags
  useGeneratedForPatients: boolean;
  useGeneratedForAppointments: boolean;
  useGeneratedForDevices: boolean;
  useGeneratedForPatientNotes: boolean;
  
  // High-risk operation flags
  useGeneratedForSGK: boolean;
  useGeneratedForUploads: boolean;
  
  // Rollback and safety
  emergencyFallback: boolean;
  maxErrorRate: number;
  rollbackThreshold: number;
}

// Default migration configuration - conservative approach
const defaultFlags: MigrationFlags = {
  // Start with legacy client
  useGeneratedClient: false,
  enableShadowValidation: true,
  
  // Gradual rollout: Start with safe GET operations
  useGeneratedForGET: false,
  useGeneratedForPOST: false,
  useGeneratedForPUT: false,
  useGeneratedForDELETE: false,
  
  // Entity rollout: Start with patients (most tested)
  useGeneratedForPatients: false,
  useGeneratedForAppointments: false,
  useGeneratedForDevices: false,
  useGeneratedForPatientNotes: false,
  
  // High-risk operations: Keep disabled initially
  useGeneratedForSGK: false,
  useGeneratedForUploads: false,
  
  // Safety thresholds
  emergencyFallback: false,
  maxErrorRate: 0.05, // 5% error rate triggers rollback
  rollbackThreshold: 10, // 10 consecutive errors triggers rollback
};

// Migration phases configuration
export const MIGRATION_PHASES = {
  PHASE_0_SHADOW: {
    description: 'Shadow validation only',
    flags: {
      ...defaultFlags,
      enableShadowValidation: true,
    }
  },
  
  PHASE_1_GET_PATIENTS: {
    description: 'Enable GET operations for patients',
    flags: {
      ...defaultFlags,
      enableShadowValidation: true,
      useGeneratedForGET: true,
      useGeneratedForPatients: true,
    }
  },
  
  PHASE_2_ALL_GETS: {
    description: 'Enable all GET operations',
    flags: {
      ...defaultFlags,
      enableShadowValidation: true,
      useGeneratedForGET: true,
      useGeneratedForPatients: true,
      useGeneratedForAppointments: true,
      useGeneratedForDevices: true,
      useGeneratedForPatientNotes: true,
    }
  },
  
  PHASE_3_IDEMPOTENT_WRITES: {
    description: 'Enable PUT operations (idempotent)',
    flags: {
      ...defaultFlags,
      enableShadowValidation: true,
      useGeneratedForGET: true,
      useGeneratedForPUT: true,
      useGeneratedForPatients: true,
      useGeneratedForAppointments: true,
      useGeneratedForDevices: true,
      useGeneratedForPatientNotes: true,
    }
  },
  
  PHASE_4_CREATE_OPERATIONS: {
    description: 'Enable POST operations',
    flags: {
      ...defaultFlags,
      enableShadowValidation: true,
      useGeneratedForGET: true,
      useGeneratedForPUT: true,
      useGeneratedForPOST: true,
      useGeneratedForPatients: true,
      useGeneratedForAppointments: true,
      useGeneratedForDevices: true,
      useGeneratedForPatientNotes: true,
    }
  },
  
  PHASE_5_DELETE_OPERATIONS: {
    description: 'Enable DELETE operations',
    flags: {
      ...defaultFlags,
      enableShadowValidation: true,
      useGeneratedForGET: true,
      useGeneratedForPUT: true,
      useGeneratedForPOST: true,
      useGeneratedForDELETE: true,
      useGeneratedForPatients: true,
      useGeneratedForAppointments: true,
      useGeneratedForDevices: true,
      useGeneratedForPatientNotes: true,
    }
  },
  
  PHASE_6_FULL_MIGRATION: {
    description: 'Full migration complete',
    flags: {
      ...defaultFlags,
      useGeneratedClient: true,
      enableShadowValidation: false, // Can disable shadow mode
      useGeneratedForGET: true,
      useGeneratedForPUT: true,
      useGeneratedForPOST: true,
      useGeneratedForDELETE: true,
      useGeneratedForPatients: true,
      useGeneratedForAppointments: true,
      useGeneratedForDevices: true,
      useGeneratedForPatientNotes: true,
    }
  }
};

// Get current migration flags from localStorage with fallbacks
export function getMigrationFlags(): MigrationFlags {
  if (typeof window === 'undefined') {
    return defaultFlags;
  }
  
  try {
    const stored = localStorage.getItem(window.STORAGE_KEYS.MIGRATION_FLAGS);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultFlags, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to parse migration flags from localStorage:', error);
  }
  
  return defaultFlags;
}

// Update migration flags
export function setMigrationFlags(flags: Partial<MigrationFlags>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const current = getMigrationFlags();
    const updated = { ...current, ...flags };
    localStorage.setItem(window.STORAGE_KEYS.MIGRATION_FLAGS, JSON.stringify(updated));
    
    // Dispatch event for components to react
    window.dispatchEvent(new CustomEvent('migration:flags-updated', { 
      detail: updated 
    }));
  } catch (error) {
    console.error('Failed to save migration flags:', error);
  }
}

// Set migration phase
export function setMigrationPhase(phase: keyof typeof MIGRATION_PHASES): void {
  const phaseConfig = MIGRATION_PHASES[phase];
  if (!phaseConfig) {
    throw new Error(`Unknown migration phase: ${phase}`);
  }
  
  console.log(`🚀 Setting migration phase: ${phase} - ${phaseConfig.description}`);
  setMigrationFlags(phaseConfig.flags);
}

// Emergency rollback
export function emergencyRollback(): void {
  console.warn('🚨 EMERGENCY ROLLBACK: Disabling all generated client features');
  setMigrationFlags({
    useGeneratedClient: false,
    useGeneratedForGET: false,
    useGeneratedForPOST: false,
    useGeneratedForPUT: false,
    useGeneratedForDELETE: false,
    useGeneratedForPatients: false,
    useGeneratedForAppointments: false,
    useGeneratedForDevices: false,
    useGeneratedForPatientNotes: false,
    useGeneratedForSGK: false,
    useGeneratedForUploads: false,
    emergencyFallback: true,
  });
}

// Check if operation should use generated client
export function shouldUseGeneratedClient(
  operation: 'GET' | 'POST' | 'PUT' | 'DELETE',
  entity: 'patients' | 'appointments' | 'devices' | 'patientNotes' | 'sgk' | 'uploads'
): boolean {
  const flags = getMigrationFlags();
  
  // Emergency fallback overrides everything
  if (flags.emergencyFallback) {
    return false;
  }
  
  // Global flag check
  if (!flags.useGeneratedClient && !flags.enableShadowValidation) {
    return false;
  }
  
  // Operation-specific checks
  const operationFlag = {
    'GET': flags.useGeneratedForGET,
    'POST': flags.useGeneratedForPOST,
    'PUT': flags.useGeneratedForPUT,
    'DELETE': flags.useGeneratedForDELETE,
  }[operation];
  
  // Entity-specific checks
  const entityFlag = {
    'patients': flags.useGeneratedForPatients,
    'appointments': flags.useGeneratedForAppointments,
    'devices': flags.useGeneratedForDevices,
    'patientNotes': flags.useGeneratedForPatientNotes,
    'sgk': flags.useGeneratedForSGK,
    'uploads': flags.useGeneratedForUploads,
  }[entity];
  
  return operationFlag && entityFlag;
}