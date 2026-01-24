/**
 * API Client Adapter Layer
 * 
 * This directory contains adapter files that re-export from @/api/generated.
 * Use these adapters instead of importing directly from @/api/generated.
 * 
 * Benefits:
 * - Single point of import for each domain
 * - Easier to refactor when API changes
 * - Prevents deep imports from @/api/generated
 * - Centralizes API contract management
 * 
 * Usage:
 *   // ✅ CORRECT
 *   import { listParties, createParty } from '@/api/client/parties.client';
 *   
 *   // ❌ WRONG
 *   import { listParties } from '@/api/generated/...';
 */

export * from './parties.client';
export * from './sales.client';
export * from './devices.client';
export * from './inventory.client';
export * from './invoices.client';
export * from './suppliers.client';
export * from './sgk.client';
export * from './appointments.client';
export * from './replacements.client';
export * from './subscriptions.client';
export * from './bir-fatura.client';
export * from './payment-integrations.client';
export * from './tenant-users.client';
export * from './sms-integration.client';
export * from './communications.client';
export * from './documents.client';
export * from './permissions.client';
export * from './auth.client';
export * from './branches.client';
export * from './reports.client';
export * from './activity-logs.client';
export * from './users.client';
export * from './sms.client';
export * from './payments.client';
export * from './admin-tenants.client';
export * from './dashboard.client';
export * from './admin.client';
export * from './settings.client';
export * from './ai.client';
