/**
 * Party Types Index
 * @fileoverview Central export for all party-related types
 * @version 1.0.0
 */

// Base Types
export * from './party-base.types';

// Communication & Reports
export * from './party-communication.types';

// SGK & Insurance
export * from './party-sgk.types';

// Device Management
export * from './party-device.types';

// Search & Filtering
export * from './party-search.types';

// Adapter
export * from './party-adapter';

// Re-export commonly used types for convenience
export type {
  Party,
  PartyDevice,
  PartyNote,
  PartySegment,
  PartyLabel
} from './party-base.types';

export type {
  Communication,
  PartyReport,
  Appointment,
  Installment,
  PaymentRecord,
  Sale
} from './party-communication.types';

export type {
  SGKInfo,
  SGKWorkflow,
  EReceiptRecord
} from './party-sgk.types';

export type {
  PartyFilters,
  DateRange,
  PartySearchResult,
  PartyMatchCandidate,
  PartyStats
} from './party-search.types';