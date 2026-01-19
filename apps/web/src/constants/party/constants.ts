// Party-related constants and configuration
// Following the storage keys registry pattern from user rules

export const PARTY_CONSTANTS = {
  // API endpoints
  API_BASE: '/api/parties',
  
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 25, // Reduced from 50 to 25 to reduce resource usage
    MAX_PAGE_SIZE: 50, // Reduced from 100 to 50
  },
  
  // Cache settings - Optimized for better performance
  CACHE: {
    STALE_TIME: 10 * 60 * 1000, // Increased to 10 minutes to match App.tsx
    GC_TIME: 60 * 60 * 1000, // Increased to 60 minutes for longer retention
  },
  
  // Validation
  TC_NUMBER_LENGTH: 11,
  MIN_NAME_LENGTH: 1,
  
  // Status options
  STATUS_OPTIONS: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ] as const,
  
  // Gender options
  GENDER_OPTIONS: [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
  ] as const,
  
  // Sort options
  SORT_OPTIONS: [
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'priorityScore', label: 'Priority Score' },
  ] as const,
  
  // Form field names
  FORM_FIELDS: {
    TC_NUMBER: 'tcNumber',
    FIRST_NAME: 'firstName',
    LAST_NAME: 'lastName',
    PHONE: 'phone',
    EMAIL: 'email',
    BIRTH_DATE: 'birthDate',
    GENDER: 'gender',
    ADDRESS_CITY: 'addressCity',
    ADDRESS_DISTRICT: 'addressDistrict',
    ADDRESS_FULL: 'addressFull',
    STATUS: 'status',
    SEGMENT: 'segment',
    ACQUISITION_TYPE: 'acquisitionType',
    CONVERSION_STEP: 'conversionStep',
    REFERRED_BY: 'referredBy',
    PRIORITY_SCORE: 'priorityScore',
    TAGS: 'tags',
  } as const,
  
  // Error messages
  ERROR_MESSAGES: {
    TC_NUMBER_REQUIRED: 'TC Number is required',
    TC_NUMBER_INVALID: 'TC Number must be 11 digits',
    TC_NUMBER_FORMAT: 'Invalid TC Number format',
    FIRST_NAME_REQUIRED: 'First name is required',
    LAST_NAME_REQUIRED: 'Last name is required',
    PHONE_REQUIRED: 'Phone number is required',
    PHONE_INVALID: 'Invalid phone number format',
    EMAIL_INVALID: 'Invalid email format',
    BIRTH_DATE_INVALID: 'Invalid birth date',
  } as const,
  
  // Success messages
  SUCCESS_MESSAGES: {
    PARTY_CREATED: 'Party created successfully',
    PARTY_UPDATED: 'Party updated successfully',
    PARTY_DELETED: 'Party deleted successfully',
    NOTE_ADDED: 'Note added successfully',
    NOTE_DELETED: 'Note deleted successfully',
  } as const,
} as const;

// Storage keys - following the registry pattern from user rules
// These should be generated via CLI: npm run gen:key CONST_NAME feature [vN]
export const PARTY_STORAGE_KEYS = {
  PARTY_LIST_FILTERS: 'party_list_filters_v1',
  PARTY_FORM_DRAFT: 'party_form_draft_v1',
  PARTY_SEARCH_HISTORY: 'party_search_history_v1',
  PARTY_SORT_PREFERENCE: 'party_sort_preference_v1',
  PARTY_VIEW_MODE: 'party_view_mode_v1',
} as const;

// Query keys for React Query
export const PARTY_QUERY_KEYS = {
  all: ['parties'] as const,
  lists: () => [...PARTY_QUERY_KEYS.all, 'list'] as const,
  list: (filters: any) => [...PARTY_QUERY_KEYS.lists(), filters] as const,
  details: () => [...PARTY_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PARTY_QUERY_KEYS.details(), id] as const,
  notes: (partyId: string) => [...PARTY_QUERY_KEYS.all, 'notes', partyId] as const,
  ereceipts: (partyId: string) => [...PARTY_QUERY_KEYS.all, 'ereceipts', partyId] as const,
  hearingTests: (partyId: string) => [...PARTY_QUERY_KEYS.all, 'hearingTests', partyId] as const,
  sales: (partyId: string) => [...PARTY_QUERY_KEYS.all, 'sales', partyId] as const,
  timeline: (partyId: string) => [...PARTY_QUERY_KEYS.all, 'timeline', partyId] as const,
} as const;