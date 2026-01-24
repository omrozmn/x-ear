/**
 * Sales API Client Adapter
 * 
 * This adapter provides a single point of import for all sales-related API operations.
 * Instead of importing directly from @/api/generated/sales/sales, use this adapter.
 * 
 * Usage:
 *   import { createSales, updateSale } from '@/api/client/sales.client';
 */

export {
  createSales,
  updateSale,
  listSales,
  getSale,
  createPartyDeviceAssignments,
  updateDeviceAssignment,
  createDeviceAssignmentReturnLoaner,
  createPricingPreview,
  listSalePromissoryNotes,
  getListSalesQueryKey,
  useListSales,
  useGetSale,
  useCreateSales,
  useUpdateSale,
  useCreatePartyDeviceAssignments,
  useUpdateDeviceAssignment,
  useCreateDeviceAssignmentReturnLoaner,
  useCreatePricingPreview,
} from '@/api/generated/index';

export type { SaleCreate, SaleRead, SaleUpdate } from '@/api/generated/schemas';
