/**
 * Auto-generated storage keys from OpenAPI specification
 * DO NOT EDIT MANUALLY - Use npm run gen:key to add new keys
 */

// Party-related storage keys
export const PARTYS_DATA = 'parties-data' as const;
export const PARTY_SEARCH_FILTERS = 'party-search-filters' as const;
export const PARTY_PAGINATION_STATE = 'party-pagination-state' as const;
export const PARTY_SORT_PREFERENCES = 'party-sort-preferences' as const;
export const PARTY_VIEW_MODE = 'party-view-mode' as const;
export const PARTY_SELECTED_COLUMNS = 'party-selected-columns' as const;
export const PARTY_FORM_VALIDATION_STATE = 'party-form-validation-state' as const;
export const PARTY_FORM_DRAFT = 'party-form-draft' as const;
export const PARTY_DETAILS_TAB = 'party-details-tab' as const;
export const PARTY_BULK_ACTIONS_STATE = 'party-bulk-actions-state' as const;

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
  PARTYS_DATA,
  PARTY_SEARCH_FILTERS,
  PARTY_PAGINATION_STATE,
  PARTY_SORT_PREFERENCES,
  PARTY_VIEW_MODE,
  PARTY_SELECTED_COLUMNS,
  PARTY_FORM_VALIDATION_STATE,
  PARTY_FORM_DRAFT,
  PARTY_DETAILS_TAB,
  PARTY_BULK_ACTIONS_STATE
] as const;

export const STORAGE_KEYS_METADATA: Record<string, StorageKeyDefinition> = {
  PARTYS_DATA: {
    key: PARTYS_DATA,
    description: 'Cached party list data',
    type: 'array',
    endpoints: [
      {
        path: '/api/parties',
        method: 'GET',
        operationId: 'parties_get_parties'
      }
    ]
  },
  PARTY_SEARCH_FILTERS: {
    key: PARTY_SEARCH_FILTERS,
    description: 'User search filter preferences',
    type: 'object',
    endpoints: [
      {
        path: '/api/parties',
        method: 'GET',
        operationId: 'parties_get_parties'
      }
    ]
  },
  PARTY_PAGINATION_STATE: {
    key: PARTY_PAGINATION_STATE,
    description: 'Current pagination state',
    type: 'object',
    endpoints: [
      {
        path: '/api/parties',
        method: 'GET',
        operationId: 'parties_get_parties'
      }
    ]
  },
  PARTY_SORT_PREFERENCES: {
    key: PARTY_SORT_PREFERENCES,
    description: 'User sorting preferences',
    type: 'object',
    endpoints: [
      {
        path: '/api/parties',
        method: 'GET',
        operationId: 'parties_get_parties'
      }
    ]
  },
  PARTY_VIEW_MODE: {
    key: PARTY_VIEW_MODE,
    description: 'List/grid view mode preference',
    type: 'string',
    endpoints: [
      {
        path: '/api/parties',
        method: 'GET',
        operationId: 'parties_get_parties'
      }
    ]
  },
  PARTY_SELECTED_COLUMNS: {
    key: PARTY_SELECTED_COLUMNS,
    description: 'User column visibility preferences',
    type: 'array',
    endpoints: [
      {
        path: '/api/parties',
        method: 'GET',
        operationId: 'parties_get_parties'
      }
    ]
  },
  PARTY_FORM_VALIDATION_STATE: {
    key: PARTY_FORM_VALIDATION_STATE,
    description: 'Form validation state and errors',
    type: 'object',
    endpoints: [
      {
        path: '/api/parties',
        method: 'POST',
        operationId: 'parties_create_party'
      }
    ]
  },
  PARTY_FORM_DRAFT: {
    key: PARTY_FORM_DRAFT,
    description: 'Draft form data for auto-save',
    type: 'object',
    endpoints: [
      {
        path: '/api/parties',
        method: 'POST',
        operationId: 'parties_create_party'
      }
    ]
  },
  PARTY_DETAILS_TAB: {
    key: PARTY_DETAILS_TAB,
    description: 'Active tab in party details view',
    type: 'string',
    endpoints: [
      {
        path: '/api/parties/{party_id}',
        method: 'DELETE',
        operationId: 'parties_delete_party'
      }
    ]
  },
  PARTY_BULK_ACTIONS_STATE: {
    key: PARTY_BULK_ACTIONS_STATE,
    description: 'Bulk actions selection state',
    type: 'object',
    endpoints: [
      {
        path: '/api/parties/{party_id}',
        method: 'DELETE',
        operationId: 'parties_delete_party'
      }
    ]
  }
} as const;

export type GeneratedStorageKey = typeof ALL_GENERATED_STORAGE_KEYS[number];