import { 
  // NOTE: AUTH_TOKEN, REFRESH_TOKEN, ACCESS_TOKEN, JWT_TOKEN are now handled by TokenManager
  USER_PREFERENCES,
  SIDEBAR_COLLAPSED,
  THEME_MODE,
  PATIENT_FORM_DRAFT,
  APPOINTMENT_FORM_DRAFT,
  API_CACHE_PREFIX,
  // Legacy migration keys
  PATIENTS_DATA,
  PATIENTS_LEGACY,
  CRM_PATIENTS,
  SMS_MESSAGES,
  SGK_DATA,
  SGK_DOCUMENTS,
  PATIENT_DOCUMENTS,
  UNMATCHED_DOCUMENTS,
  INVENTORY_FILTER_PRESET,
  CASH_RECORDS,
  APPOINTMENTS,
  APPOINTMENT_FILTER_PRESETS,
  SGK_REPORTS,
  INCOME_RECORD_TYPES,
  EXPENSE_RECORD_TYPES,
  DEVICE_MAINTENANCE,
  NOTIFICATIONS,
  AUTOMATION_RULES,
  SMS_LOGS,
  AUTOMATION_LOGS,
  INVENTORY_DATA,
  SAVED_VIEWS,
  OCR_DYNAMIC_NAMES,
  CURRENT_USER,
  SYSTEM_SETTINGS,
  BACKGROUND_PROCESSING_STATUS,
  SGK_SUBMENU_EXPANDED,
  FATURA_SUBMENU_EXPANDED,
  REPORTS_SUBMENU_EXPANDED,
} from '../constants/storage-keys';

interface MigrationRule {
  from: string;
  to: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform?: (value: any) => any;
  version: string;
}

// Legacy key mappings and migration rules
// NOTE: Auth token migrations are now handled by TokenManager (single source of truth)
// Only non-auth data migrations should be here
const MIGRATION_RULES: MigrationRule[] = [
  // Auth migrations - REMOVED: Now handled by TokenManager
  // TokenManager handles: auth_token, refresh_token, token, jwt, etc.
  
  {
    from: 'user_session',
    to: USER_PREFERENCES,
    version: 'v1'
  },
  {
    from: 'currentUser',
    to: CURRENT_USER,
    version: 'v1'
  },
  {
    from: 'currentUserId',
    to: CURRENT_USER,
    transform: (userId: string) => ({ id: userId, timestamp: Date.now() }),
    version: 'v1'
  },
  
  // UI State migrations
  {
    from: 'sidebar_collapsed',
    to: SIDEBAR_COLLAPSED,
    transform: (collapsed: boolean) => ({ collapsed, timestamp: Date.now() }),
    version: 'v1'
  },
  {
    from: 'sidebarCollapsed',
    to: SIDEBAR_COLLAPSED,
    transform: (collapsed: string) => ({ collapsed: collapsed === 'true', timestamp: Date.now() }),
    version: 'v1'
  },
  {
    from: 'sgkSubmenuExpanded',
    to: SGK_SUBMENU_EXPANDED,
    transform: (expanded: string) => expanded === 'true',
    version: 'v1'
  },
  {
    from: 'faturaSubmenuExpanded',
    to: FATURA_SUBMENU_EXPANDED,
    transform: (expanded: string) => expanded === 'true',
    version: 'v1'
  },
  {
    from: 'reportsSubmenuExpanded',
    to: REPORTS_SUBMENU_EXPANDED,
    transform: (expanded: string) => expanded === 'true',
    version: 'v1'
  },
  {
    from: 'theme_preference',
    to: THEME_MODE,
    version: 'v1'
  },
  {
    from: 'systemSettings',
    to: SYSTEM_SETTINGS,
    version: 'v1'
  },
  
  // Patient data migrations
  {
    from: 'xear_patients_data',
    to: PATIENTS_DATA,
    version: 'v1'
  },
  {
    from: 'xear_patients',
    to: PATIENTS_LEGACY,
    version: 'v1'
  },
  {
    from: 'patients',
    to: PATIENTS_LEGACY,
    version: 'v1'
  },
  {
    from: 'xear_crm_patients',
    to: CRM_PATIENTS,
    version: 'v1'
  },
  {
    from: 'patient_documents',
    to: PATIENT_DOCUMENTS,
    version: 'v1'
  },
  {
    from: 'xear_patients_documents',
    to: PATIENT_DOCUMENTS,
    version: 'v1'
  },
  {
    from: 'xear_saved_views',
    to: SAVED_VIEWS,
    version: 'v1'
  },
  
  // Appointments migrations
  {
    from: 'appointments',
    to: APPOINTMENTS,
    version: 'v1'
  },
  {
    from: 'appointmentFilterPresets',
    to: APPOINTMENT_FILTER_PRESETS,
    version: 'v1'
  },
  
  // SGK migrations
  {
    from: 'sgkData',
    to: SGK_DATA,
    version: 'v1'
  },
  {
    from: 'sgk_documents',
    to: SGK_DOCUMENTS,
    version: 'v1'
  },
  {
    from: 'xear_sgk_documents',
    to: SGK_DOCUMENTS,
    version: 'v1'
  },
  {
    from: 'sgk_reports',
    to: SGK_REPORTS,
    version: 'v1'
  },
  {
    from: 'unmatched_documents',
    to: UNMATCHED_DOCUMENTS,
    version: 'v1'
  },
  {
    from: 'background_processing_status',
    to: BACKGROUND_PROCESSING_STATUS,
    version: 'v1'
  },
  
  // Inventory migrations
  {
    from: 'inventoryData',
    to: INVENTORY_DATA,
    version: 'v1'
  },
  {
    from: 'xear_crm_inventory',
    to: INVENTORY_DATA,
    version: 'v1'
  },
  {
    from: 'inventoryFilterPreset',
    to: INVENTORY_FILTER_PRESET,
    version: 'v1'
  },
  
  // Cashflow migrations
  {
    from: 'cashRecords',
    to: CASH_RECORDS,
    version: 'v1'
  },
  {
    from: 'dashboardCashRecords',
    to: CASH_RECORDS,
    version: 'v1'
  },
  {
    from: 'incomeRecordTypes',
    to: INCOME_RECORD_TYPES,
    version: 'v1'
  },
  {
    from: 'expenseRecordTypes',
    to: EXPENSE_RECORD_TYPES,
    version: 'v1'
  },
  
  // Communication migrations
  {
    from: 'sms_messages',
    to: SMS_MESSAGES,
    version: 'v1'
  },
  {
    from: 'smsLogs',
    to: SMS_LOGS,
    version: 'v1'
  },
  {
    from: 'notifications',
    to: NOTIFICATIONS,
    version: 'v1'
  },
  
  // Automation migrations
  {
    from: 'automationRules',
    to: AUTOMATION_RULES,
    version: 'v1'
  },
  {
    from: 'automationLogs',
    to: AUTOMATION_LOGS,
    version: 'v1'
  },
  
  // Device migrations
  {
    from: 'xear_deviceMaintenance',
    to: DEVICE_MAINTENANCE,
    version: 'v1'
  },
  
  // OCR migrations
  {
    from: 'ocrDynamicNames',
    to: OCR_DYNAMIC_NAMES,
    version: 'v1'
  },
  
  // Form drafts
  {
    from: 'patient_form_draft',
    to: PATIENT_FORM_DRAFT,
    version: 'v1'
  },
  {
    from: 'appointment_form_draft',
    to: APPOINTMENT_FORM_DRAFT,
    version: 'v1'
  },
  
  // Cache migrations
  {
    from: 'patients_cache',
    to: API_CACHE_PREFIX + '.patients',
    version: 'v1'
  },
  {
    from: 'appointments_cache',
    to: API_CACHE_PREFIX + '.appointments',
    version: 'v1'
  }
];

class StorageMigrator {
  private static instance: StorageMigrator;
  private migrationVersion = 'storage_migration_v1';

  static getInstance(): StorageMigrator {
    if (!StorageMigrator.instance) {
      StorageMigrator.instance = new StorageMigrator();
    }
    return StorageMigrator.instance;
  }

  /**
   * Run all pending migrations idempotently
   */
  async migrate(): Promise<void> {
    const hasMigrated = localStorage.getItem(this.migrationVersion);
    
    if (hasMigrated) {
      return; // Already migrated
    }

    console.log('🔄 Starting storage migration...');
    
    let migratedCount = 0;
    
    for (const rule of MIGRATION_RULES) {
      if (this.migrateKey(rule)) {
        migratedCount++;
      }
    }
    
    // Mark migration as complete
    localStorage.setItem(this.migrationVersion, JSON.stringify({
      completed: true,
      timestamp: Date.now(),
      migratedKeys: migratedCount
    }));
    
    console.log(`✅ Storage migration completed. Migrated ${migratedCount} keys.`);
  }

  /**
   * Migrate a single key according to its rule
   */
  private migrateKey(rule: MigrationRule): boolean {
    const oldValue = localStorage.getItem(rule.from);
    const newValue = localStorage.getItem(rule.to);
    
    // If new key already exists, just remove old key (idempotent)
    if (newValue !== null && oldValue !== null) {
      localStorage.removeItem(rule.from);
      console.log(`📦 Cleaned up old key: ${rule.from} (new key exists)`);
      return true;
    }
    
    if (oldValue === null) {
      return false; // Nothing to migrate
    }
    
    try {
      let transformedValue = oldValue;
      
      // Apply transformation if provided
      if (rule.transform) {
        const parsed = JSON.parse(oldValue);
        transformedValue = JSON.stringify(rule.transform(parsed));
      }
      
      // Set new key
      localStorage.setItem(rule.to, transformedValue);
      
      // Remove old key
      localStorage.removeItem(rule.from);
      
      console.log(`📦 Migrated: ${rule.from} → ${rule.to}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to migrate ${rule.from}:`, error);
      return false;
    }
  }

  /**
   * Get migration status
   */
  getMigrationStatus(): { completed: boolean; timestamp?: number; migratedKeys?: number } {
    const status = localStorage.getItem(this.migrationVersion);
    
    if (!status) {
      return { completed: false };
    }
    
    try {
      return JSON.parse(status);
    } catch {
      return { completed: false };
    }
  }

  /**
   * Reset migration (for testing purposes)
   */
  resetMigration(): void {
    localStorage.removeItem(this.migrationVersion);
    console.log('🔄 Migration status reset');
  }
}

export const storageMigrator = StorageMigrator.getInstance();
export default storageMigrator;