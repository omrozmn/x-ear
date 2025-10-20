// Patient-related constants and configuration
// Following the storage keys registry pattern from user rules

export const PATIENT_CONSTANTS = {
  // API endpoints
  API_BASE: '/api/patients',
  
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 100,
  },
  
  // Cache settings
  CACHE: {
    STALE_TIME: 5 * 60 * 1000, // 5 minutes
    GC_TIME: 10 * 60 * 1000, // 10 minutes
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
    PATIENT_CREATED: 'Patient created successfully',
    PATIENT_UPDATED: 'Patient updated successfully',
    PATIENT_DELETED: 'Patient deleted successfully',
    NOTE_ADDED: 'Note added successfully',
    NOTE_DELETED: 'Note deleted successfully',
  } as const,
} as const;

// Storage keys - following the registry pattern from user rules
// These should be generated via CLI: npm run gen:key CONST_NAME feature [vN]
export const PATIENT_STORAGE_KEYS = {
  PATIENT_LIST_FILTERS: 'patient_list_filters_v1',
  PATIENT_FORM_DRAFT: 'patient_form_draft_v1',
  PATIENT_SEARCH_HISTORY: 'patient_search_history_v1',
  PATIENT_SORT_PREFERENCE: 'patient_sort_preference_v1',
  PATIENT_VIEW_MODE: 'patient_view_mode_v1',
} as const;

// Query keys for React Query
export const PATIENT_QUERY_KEYS = {
  all: ['patients'] as const,
  lists: () => [...PATIENT_QUERY_KEYS.all, 'list'] as const,
  list: (filters: any) => [...PATIENT_QUERY_KEYS.lists(), filters] as const,
  details: () => [...PATIENT_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PATIENT_QUERY_KEYS.details(), id] as const,
  notes: (patientId: string) => [...PATIENT_QUERY_KEYS.all, 'notes', patientId] as const,
  ereceipts: (patientId: string) => [...PATIENT_QUERY_KEYS.all, 'ereceipts', patientId] as const,
  hearingTests: (patientId: string) => [...PATIENT_QUERY_KEYS.all, 'hearingTests', patientId] as const,
  sales: (patientId: string) => [...PATIENT_QUERY_KEYS.all, 'sales', patientId] as const,
  timeline: (patientId: string) => [...PATIENT_QUERY_KEYS.all, 'timeline', patientId] as const,
} as const;