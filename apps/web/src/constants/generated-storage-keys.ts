/**
 * Auto-generated storage keys from OpenAPI specification
 * DO NOT EDIT MANUALLY - Use npm run gen:key to add new keys
 */

// Patient-related storage keys
export const PATIENTS_DATA = 'patients-data' as const;
export const PATIENT_SEARCH_FILTERS = 'patient-search-filters' as const;
export const PATIENT_PAGINATION_STATE = 'patient-pagination-state' as const;
export const PATIENT_SORT_PREFERENCES = 'patient-sort-preferences' as const;
export const PATIENT_VIEW_MODE = 'patient-view-mode' as const;
export const PATIENT_SELECTED_COLUMNS = 'patient-selected-columns' as const;
export const PATIENT_FORM_VALIDATION_STATE = 'patient-form-validation-state' as const;
export const PATIENT_FORM_DRAFT = 'patient-form-draft' as const;
export const PATIENT_DETAILS_TAB = 'patient-details-tab' as const;
export const PATIENT_BULK_ACTIONS_STATE = 'patient-bulk-actions-state' as const;

export type StorageKeyType = 'array' | 'object' | 'string';

export interface StorageKeyDefinition {
  key: string;
  description: string;
  type: StorageKeyType;
  endpoints: Array<{
    path: string;
    method: string;
    operationId: string;
  }>;
}

export const ALL_GENERATED_STORAGE_KEYS = [
  PATIENTS_DATA,
  PATIENT_SEARCH_FILTERS,
  PATIENT_PAGINATION_STATE,
  PATIENT_SORT_PREFERENCES,
  PATIENT_VIEW_MODE,
  PATIENT_SELECTED_COLUMNS,
  PATIENT_FORM_VALIDATION_STATE,
  PATIENT_FORM_DRAFT,
  PATIENT_DETAILS_TAB,
  PATIENT_BULK_ACTIONS_STATE
] as const;

export const STORAGE_KEYS_METADATA: Record<string, StorageKeyDefinition> = {
  PATIENTS_DATA: {
    key: PATIENTS_DATA,
    description: 'Cached patient list data',
    type: 'array',
    endpoints: [
      {
        path: '/api/patients',
        method: 'GET',
        operationId: 'patients_get_patients'
      }
    ]
  },
  PATIENT_SEARCH_FILTERS: {
    key: PATIENT_SEARCH_FILTERS,
    description: 'User search filter preferences',
    type: 'object',
    endpoints: [
      {
        path: '/api/patients',
        method: 'GET',
        operationId: 'patients_get_patients'
      }
    ]
  },
  PATIENT_PAGINATION_STATE: {
    key: PATIENT_PAGINATION_STATE,
    description: 'Current pagination state',
    type: 'object',
    endpoints: [
      {
        path: '/api/patients',
        method: 'GET',
        operationId: 'patients_get_patients'
      }
    ]
  },
  PATIENT_SORT_PREFERENCES: {
    key: PATIENT_SORT_PREFERENCES,
    description: 'User sorting preferences',
    type: 'object',
    endpoints: [
      {
        path: '/api/patients',
        method: 'GET',
        operationId: 'patients_get_patients'
      }
    ]
  },
  PATIENT_VIEW_MODE: {
    key: PATIENT_VIEW_MODE,
    description: 'List/grid view mode preference',
    type: 'string',
    endpoints: [
      {
        path: '/api/patients',
        method: 'GET',
        operationId: 'patients_get_patients'
      }
    ]
  },
  PATIENT_SELECTED_COLUMNS: {
    key: PATIENT_SELECTED_COLUMNS,
    description: 'User column visibility preferences',
    type: 'array',
    endpoints: [
      {
        path: '/api/patients',
        method: 'GET',
        operationId: 'patients_get_patients'
      }
    ]
  },
  PATIENT_FORM_VALIDATION_STATE: {
    key: PATIENT_FORM_VALIDATION_STATE,
    description: 'Form validation state and errors',
    type: 'object',
    endpoints: [
      {
        path: '/api/patients',
        method: 'POST',
        operationId: 'patients_create_patient'
      }
    ]
  },
  PATIENT_FORM_DRAFT: {
    key: PATIENT_FORM_DRAFT,
    description: 'Draft form data for auto-save',
    type: 'object',
    endpoints: [
      {
        path: '/api/patients',
        method: 'POST',
        operationId: 'patients_create_patient'
      }
    ]
  },
  PATIENT_DETAILS_TAB: {
    key: PATIENT_DETAILS_TAB,
    description: 'Active tab in patient details view',
    type: 'string',
    endpoints: [
      {
        path: '/api/patients/{patient_id}',
        method: 'DELETE',
        operationId: 'patients_delete_patient'
      }
    ]
  },
  PATIENT_BULK_ACTIONS_STATE: {
    key: PATIENT_BULK_ACTIONS_STATE,
    description: 'Bulk actions selection state',
    type: 'object',
    endpoints: [
      {
        path: '/api/patients/{patient_id}',
        method: 'DELETE',
        operationId: 'patients_delete_patient'
      }
    ]
  }
} as const;

export type GeneratedStorageKey = typeof ALL_GENERATED_STORAGE_KEYS[number];