// Temporary global type shims for triage
// These are low-risk, reversible declarations to reduce noisy TS errors
// while we systematically fix the real types. Remove or replace with
// proper definitions as part of the type-cleanup work.

import { QueryClient } from '@tanstack/react-query';

// Minimal party-related type shims used during triage.
// Replace these with proper exports from `party-communication.types.ts` later.
type Communication = any;
type PartyReport = any;
type EReceiptRecord = any;
type Appointment = any;
type Installment = any;
type Sale = any;
type SGKInfo = any;
type SGKWorkflow = any;

// Global Window Extension
declare global {
  interface Window {
    __REACT_QUERY_CLIENT__?: QueryClient;
    __ENV__?: Record<string, string>;
    __AUTH_TOKEN__?: string;
    toggleSidebar?: () => void;
  }
}

// Allow importing JSON and other loose assets during triage
declare module '*.json' {
  const value: any;
  export default value;
}
