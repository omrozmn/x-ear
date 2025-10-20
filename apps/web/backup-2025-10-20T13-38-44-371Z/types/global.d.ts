// Temporary global type shims for triage
// These are low-risk, reversible declarations to reduce noisy TS errors
// while we systematically fix the real types. Remove or replace with
// proper definitions as part of the type-cleanup work.

// Minimal patient-related type shims used during triage.
// Replace these with proper exports from `patient-communication.types.ts` later.
type Communication = any;
type PatientReport = any;
type EReceiptRecord = any;
type Appointment = any;
type Installment = any;
type Sale = any;
type SGKInfo = any;
type SGKWorkflow = any;

// Allow importing JSON and other loose assets during triage
declare module '*.json' {
  const value: any;
  export default value;
}
