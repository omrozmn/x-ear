/**
 * Storage Keys Registry
 * 
 * MUST: All localStorage/sessionStorage keys come from this single registry file
 * MUST: New keys are added exclusively via the CLI generator (npm run gen:key CONST_NAME feature [vN])
 * MUST: CI linter rejects literal string keys in localStorage calls
 * SHOULD: Legacy keys must be mapped in storage-migrator.ts with idempotent migration
 * SHOULD: Version changes in storage key format increment @vN suffix and include a migration rule
 */

// TODO: Import generated storage keys from OpenAPI when available
// import {
//   ALL_GENERATED_STORAGE_KEYS,
//   STORAGE_KEYS_METADATA,
//   type GeneratedStorageKey,
//   type StorageKeyDefinition
// } from '@/api/generated-storage-keys'

// Re-export generated keys for convenience
// export * from '@/api/generated-storage-keys'

// Authentication & Session
export const AUTH_TOKEN = 'x-ear.auth.token@v1'
export const REFRESH_TOKEN = 'x-ear.auth.refresh@v1'
export const USER_PREFERENCES = 'x-ear.user.preferences@v1'

// Offline & Sync
export const OUTBOX_QUEUE = 'x-ear.sync.outbox@v1'
export const LAST_SYNC_TIMESTAMP = 'x-ear.sync.lastSync@v1'
export const OFFLINE_MODE = 'x-ear.app.offlineMode@v1'

// UI State
export const SIDEBAR_COLLAPSED = 'x-ear.ui.sidebarCollapsed@v1'
export const THEME_MODE = 'x-ear.ui.themeMode@v1'
export const LANGUAGE_PREFERENCE = 'x-ear.ui.language@v1'

// Form Drafts
export const PARTY_FORM_DRAFT = 'x-ear.forms.party.draft@v1'
export const APPOINTMENT_FORM_DRAFT = 'x-ear.forms.appointment.draft@v1'
export const INVOICE_FORM_DRAFT = 'x-ear.forms.invoice.draft@v1'

// Party-specific Storage Keys
export const PARTY_SEARCH_FILTERS = 'x-ear.parties.searchFilters@v1'
export const PARTY_PAGINATION_STATE = 'x-ear.parties.paginationState@v1'
export const PARTY_SORT_PREFERENCES = 'x-ear.parties.sortPreferences@v1'
export const PARTY_VIEW_MODE = 'x-ear.parties.viewMode@v1'
export const PARTY_SELECTED_COLUMNS = 'x-ear.parties.selectedColumns@v1'
export const PARTY_BULK_ACTIONS_STATE = 'x-ear.parties.bulkActionsState@v1'
export const PARTY_DETAILS_TAB = 'x-ear.parties.detailsTab@v1'
export const PARTY_FORM_VALIDATION_STATE = 'x-ear.parties.formValidationState@v1'

// Legacy aliases for backward compatibility
export const PARTY_SEARCH_FILTERS_LEGACY = PARTY_SEARCH_FILTERS
export const PARTY_PAGINATION_STATE_LEGACY = PARTY_PAGINATION_STATE
export const PARTY_SORT_PREFERENCES_LEGACY = PARTY_SORT_PREFERENCES
export const PARTY_VIEW_MODE_LEGACY = PARTY_VIEW_MODE
export const PARTY_SELECTED_COLUMNS_LEGACY = PARTY_SELECTED_COLUMNS
export const PARTY_BULK_ACTIONS_STATE_LEGACY = PARTY_BULK_ACTIONS_STATE
export const PARTY_DETAILS_TAB_LEGACY = PARTY_DETAILS_TAB
export const PARTY_FORM_VALIDATION_STATE_LEGACY = PARTY_FORM_VALIDATION_STATE

// Cache & Performance
export const API_CACHE_PREFIX = 'x-ear.cache.api@v1'
export const QUERY_CACHE_TIMESTAMP = 'x-ear.cache.queryTimestamp@v1'

// Demo Mode
export const DEMO_MODE_ENABLED = 'x-ear.demo.enabled@v1'
export const DEMO_DATA_VERSION = 'x-ear.demo.dataVersion@v1'

// Feature Flags
export const FEATURE_FLAGS = 'x-ear.features.flags@v1'

// Idempotency
export const IDEMPOTENCY_CACHE = 'x-ear.api.idempotencyCache@v1'

// Legacy Migration Keys (mapped from legacy storage keys)
export const PARTYS_DATA = 'x-ear.parties.data@v1' // Legacy: xear_parties_data
export const PARTYS_LEGACY = 'x-ear.parties.legacy@v1' // Legacy: xear_parties
export const CRM_PARTYS = 'x-ear.parties.crm@v1' // Legacy: xear_crm_parties
export const SMS_MESSAGES = 'x-ear.sms.messages@v1' // Legacy: sms_messages
export const SGK_DATA = 'x-ear.sgk.data@v1' // Legacy: sgkData
export const SGK_DOCUMENTS = 'x-ear.sgk.documents@v1' // Legacy: sgk_documents, xear_sgk_documents
export const PARTY_DOCUMENTS = 'x-ear.parties.documents@v1' // Legacy: party_documents, xear_parties_documents
export const UNMATCHED_DOCUMENTS = 'x-ear.sgk.unmatchedDocs@v1' // Legacy: unmatched_documents
export const INVENTORY_FILTER_PRESET = 'x-ear.inventory.filterPreset@v1' // Legacy: inventoryFilterPreset
export const CASH_RECORDS = 'x-ear.cashflow.records@v1' // Legacy: cashRecords, dashboardCashRecords
export const APPOINTMENTS = 'x-ear.appointments.data@v1' // Legacy: appointments
export const APPOINTMENT_FILTER_PRESETS = 'x-ear.appointments.filterPresets@v1' // Legacy: appointmentFilterPresets
export const SGK_REPORTS = 'x-ear.sgk.reports@v1' // Legacy: sgk_reports
export const INCOME_RECORD_TYPES = 'x-ear.cashflow.incomeTypes@v1' // Legacy: incomeRecordTypes
export const EXPENSE_RECORD_TYPES = 'x-ear.cashflow.expenseTypes@v1' // Legacy: expenseRecordTypes
export const DEVICE_MAINTENANCE = 'x-ear.devices.maintenance@v1' // Legacy: xear_deviceMaintenance
export const NOTIFICATIONS = 'x-ear.notifications.data@v1' // Legacy: notifications
export const AUTOMATION_RULES = 'x-ear.automation.rules@v1' // Legacy: automationRules
export const SMS_LOGS = 'x-ear.sms.logs@v1' // Legacy: smsLogs
export const AUTOMATION_LOGS = 'x-ear.automation.logs@v1' // Legacy: automationLogs
export const INVENTORY_DATA = 'x-ear.inventory.data@v1' // Legacy: inventoryData, xear_crm_inventory
export const INVOICES_DATA = 'x-ear.invoices.data@v1' // Legacy: invoices, xear_invoices
export const PURCHASES_DATA = 'x-ear.purchases.data@v1' // Purchase invoices data
export const PARTY_SALES_DATA = 'x-ear.parties.salesData@v1' // Party sales data cache
export const SAVED_VIEWS = 'x-ear.parties.savedViews@v1' // Legacy: xear_saved_views
export const OCR_DYNAMIC_NAMES = 'x-ear.ocr.dynamicNames@v1' // Legacy: ocrDynamicNames
export const CURRENT_USER = 'x-ear.auth.currentUser@v1' // Legacy: currentUser, currentUserId
export const SYSTEM_SETTINGS = 'x-ear.system.settings@v1' // Legacy: systemSettings
export const BACKGROUND_PROCESSING_STATUS = 'x-ear.sgk.backgroundStatus@v1' // Legacy: background_processing_status
export const SGK_SUBMENU_EXPANDED = 'x-ear.ui.sgkSubmenuExpanded@v1' // Legacy: sgkSubmenuExpanded
export const FATURA_SUBMENU_EXPANDED = 'x-ear.ui.faturaSubmenuExpanded@v1' // Legacy: faturaSubmenuExpanded
export const REPORTS_SUBMENU_EXPANDED = 'x-ear.ui.reportsSubmenuExpanded@v1' // Legacy: reportsSubmenuExpanded
export const ACCESS_TOKEN = 'x-ear.auth.accessToken@v1' // Legacy: xear_access_token
export const JWT_TOKEN = 'x-ear.auth.jwt@v1' // Legacy: jwt, token

// All storage keys for validation
export const ALL_STORAGE_KEYS = [
  AUTH_TOKEN,
  REFRESH_TOKEN,
  USER_PREFERENCES,
  OUTBOX_QUEUE,
  LAST_SYNC_TIMESTAMP,
  OFFLINE_MODE,
  SIDEBAR_COLLAPSED,
  THEME_MODE,
  LANGUAGE_PREFERENCE,
  PARTY_FORM_DRAFT,
  APPOINTMENT_FORM_DRAFT,
  INVOICE_FORM_DRAFT,
  // TODO: Use generated keys from OpenAPI when available
  // ...ALL_GENERATED_STORAGE_KEYS,
  API_CACHE_PREFIX,
  QUERY_CACHE_TIMESTAMP,
  DEMO_MODE_ENABLED,
  DEMO_DATA_VERSION,
  FEATURE_FLAGS,
  IDEMPOTENCY_CACHE,
  // Legacy migration keys
  PARTYS_DATA,
  PARTYS_LEGACY,
  CRM_PARTYS,
  SMS_MESSAGES,
  SGK_DATA,
  SGK_DOCUMENTS,
  PARTY_DOCUMENTS,
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
  INVOICES_DATA,
  PURCHASES_DATA,
  PARTY_SALES_DATA,
  SAVED_VIEWS,
  OCR_DYNAMIC_NAMES,
  CURRENT_USER,
  SYSTEM_SETTINGS,
  BACKGROUND_PROCESSING_STATUS,
  SGK_SUBMENU_EXPANDED,
  FATURA_SUBMENU_EXPANDED,
  REPORTS_SUBMENU_EXPANDED,
  ACCESS_TOKEN,
  JWT_TOKEN,
] as const

export type StorageKey = typeof ALL_STORAGE_KEYS[number]
