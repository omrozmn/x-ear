/**
 * BirFatura API Client Adapter
 * 
 * This adapter provides a single point of import for all BirFatura-related API operations.
 * Instead of importing directly from @/api/generated/bir-fatura/bir-fatura, use this adapter.
 * 
 * Usage:
 *   import { useCreateBirfaturaSyncInvoices } from '@/api/client/bir-fatura.client';
 */

export {
  useCreateBirfaturaSyncInvoices,
  createEfaturaCancel,
  createEfaturaRetry,
} from '@/api/generated/index';

export type { } from '@/api/generated/schemas';
