/**
 * Patient Types Index
 * @fileoverview Central export for all patient-related types
 * @version 1.0.0
 */

// Base Types
export * from './patient-base.types';

// Communication & Reports
export * from './patient-communication.types';

// SGK & Insurance
export * from './patient-sgk.types';

// Device Management
export * from './patient-device.types';

// Search & Filtering
export * from './patient-search.types';

// Adapter
export * from './patient-adapter';

// Re-export commonly used types for convenience
export type {
  Patient,
  PatientDevice,
  PatientNote,
  PatientSegment,
  PatientLabel
} from './patient-base.types';

export type {
  Communication,
  PatientReport,
  Appointment,
  Installment,
  PaymentRecord,
  Sale
} from './patient-communication.types';

export type {
  SGKInfo,
  SGKWorkflow,
  EReceiptRecord
} from './patient-sgk.types';

export type {
  PatientFilters,
  PatientSearchResult,
  PatientMatchCandidate,
  PatientStats
} from './patient-search.types';