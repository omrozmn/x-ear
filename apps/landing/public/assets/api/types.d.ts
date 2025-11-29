// Type declarations for public API files
// This file extends the Window interface for TypeScript files in the public directory

declare global {
  interface Window {
    // Storage keys registry for centralized localStorage key management
    STORAGE_KEYS: {
      PATIENTS: string;
      PATIENTS_DATA: string;
      CRM_PATIENTS: string;
      CRM_APPOINTMENTS: string;
      CRM_CALENDAR_APPOINTMENTS: string;
      CRM_SAVEDERECEIPTS: string;
      CRM_UTSDEVICES: string;
      CRM_INVENTORY: string;
      CRM_DEVICEASSIGNMENTS: string;
      CRM_AUDITLOG: string;
      CRM_UTS_DEVICES: string;
      INVENTORYMOVEMENTS: string;
      DEVICEASSIGNMENTS: string;
      DATA_CHANGE: string;
      CRM_UTSNOTIFICATIONS: string;
      PATIENTS_DOCUMENTS: string;
      DEVICES_DATA: string;
      DEVICES_TRIALS: string;
      DEVICES_ASSIGNMENTS: string;
      SGK_INTEGRATIONS: string;
      SGK_DOCUMENTS: string;
      UTS_RECORDS: string;
      INVENTORY_ITEMS: string;
      APPOINTMENTS_DATA: string;
      SMS_CAMPAIGNS: string;
      ACQUISITION_TYPES: string;
      SYSTEM_SETTINGS: string;
      AUTOMATION_RULES: string;
      ACCESS_TOKEN: string;
      X_EAR_DARK_MODE: string;
      ACTIVITY_LOGS: string;
      PATIENTS_LIST: string;
      INVENTORY: string;
      SUPPLIERS: string;
      CASH_REGISTER: string;
      INVOICES: string;
      DEVICEMAINTENANCE: string;
      DEVICETRIALS: string;
      INVENTORY_DATABASE: string;
      X_EAR_PATIENTS: string;
      SAVED_VIEWS: string;
      SAVED_TAGS: string;
      LOCAL_ERECEIPTS: string;
      PATIENT_DOCUMENTS_XEAR: string;
      DEVICES: string;
      SALES: string;
      PROFORMAS: string;
      PATIENTS_DATA_V2: string;
      PATIENTS_LOCAL: string;
      SETTINGS: string;
      TEST_: string;
      CRM_UTSCONSUMERNOTIFICATIONS: string;
      CRM_UTSHISTORY: string;
      CRM_UTSMOVEMENTS: string;
      CRM_: string;
      'xear_': string;
      SGK_REPORTS: string;
      SGK_DOCUMENTS_PLAIN: string;
      SGK_SETTINGS: string;
      PATIENT_DOCUMENTS_PLAIN: string;
      CURRENT_USER: string;
      SIDEBAR_COLLAPSED: string;
      PATIENT_LIST_COLLAPSED: string;
      SGK_SUBMENU_EXPANDED: string;
      FATURA_SUBMENU_EXPANDED: string;
      REPORTS_SUBMENU_EXPANDED: string;
      SGK_SUBMENU_EXPANDED_COLLAPSED: string;
      FATURA_SUBMENU_EXPANDED_COLLAPSED: string;
      REPORTS_SUBMENU_EXPANDED_COLLAPSED: string;
      NOTIFICATIONS: string;
      SETTINGS_GENERAL_COMPANY_INFO: string;
      SETTINGS_GENERAL_SYSTEM_PREFS: string;
      SETTINGS_GENERAL_NOTIFICATION_SETTINGS: string;
      SETTINGS_PATIENT_PRICING: string;
      SETTINGS_PRICING_FULL: string;
      SETTINGS_SUBSCRIPTION_PLAN: string;
      SETTINGS_SUBSCRIPTION_PLANS: string;
      SETTINGS_SUBSCRIPTION_USAGE: string;
      SETTINGS_SUBSCRIPTION_ADDONS: string;
      SETTINGS_SGK: string;
      SETTINGS_USERS_TYPES: string;
      SETTINGS_FEATURES: string;
      SETTINGS_INVOICE_LOGO: string;
      SETTINGS_INVOICE_SIGNATURE: string;
      ETIKET_SETTINGS: string;
      SYSTEM_SETTINGS_PLAIN: string;
      MIGRATION_FLAGS: string;
      USE_GENERATED_CLIENT: string;
      ENABLE_SHADOW_VALIDATION: string;
      DEMO_MODE: string;
      DEMO_WRITES_SIMULATED: string;
      DEMO_STATE_V1: string;
      SMS_MESSAGES: string;
      CASH_RECORDS: string;
      APPOINTMENTS: string;
      SALES_DATA: string;
      INVOICE_DATA: string;
      ALL_DOCUMENTS: string;
      PATIENT_TIMELINE: string;
      SGK_DATA: string;
      INVENTORY_FILTER_PRESET: string;
    };
    
    // API configuration
    API_BASE_URL?: string;
    
    // Legacy compatibility properties that may be referenced
    XEar?: any;
    XEarStorageManager?: any;
  }
}

// This export is required to make this file a module
export {};