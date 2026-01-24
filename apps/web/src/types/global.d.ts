/**
 * Global Type Shims
 * 
 * This file contains temporary type declarations for internal types that are not yet
 * properly exported from their source modules. These `any` types are acceptable here
 * because:
 * 
 * 1. They are temporary placeholders during the type migration process
 * 2. They prevent cascading type errors while we systematically fix real types
 * 3. They are isolated to this shim file and don't leak into application code
 * 4. They will be replaced with proper imports once the source modules export correct types
 * 
 * TODO: Replace these with proper exports from their respective modules:
 * - Communication, PartyReport, EReceiptRecord → party-communication.types.ts
 * - Appointment → appointment.types.ts
 * - Installment, Sale → sales.types.ts
 * - SGKInfo, SGKWorkflow → party-sgk.types.ts
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Temporary type shims for party-related entities.
 * Using `any` here is acceptable because these are placeholder types in a .d.ts shim file
 * that will be replaced with proper types once the source modules are refactored.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Communication = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PartyReport = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EReceiptRecord = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Appointment = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Installment = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sale = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SGKInfo = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

/**
 * JSON Module Declaration
 * 
 * Using `any` here is acceptable because:
 * 1. This is a standard TypeScript pattern for JSON imports
 * 2. JSON structure is dynamic and cannot be statically typed without schema validation
 * 3. This is isolated to a .d.ts shim file for module resolution
 * 4. Consumers should validate/cast JSON data to proper types at usage sites
 */
declare module '*.json' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value: any;
  export default value;
}
