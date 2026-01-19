/**
 * Suppliers API Client Adapter
 * 
 * This adapter provides a single point of import for all supplier-related API operations.
 * Instead of importing directly from @/api/generated/suppliers/suppliers, use this adapter.
 * 
 * Usage:
 *   import { listSuppliers, updateSupplier } from '@/api/client/suppliers.client';
 */

export {
  listSuppliers,
  getSupplier,
  createSuppliers as createSupplier,
  updateSupplier,
  deleteSupplier,
  getListSuppliersQueryKey,
  useListSuppliers,
  useGetSupplier,
  useCreateSuppliers as useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from '@/api/generated/index';

export type { SupplierRead, SupplierCreate, SupplierUpdate } from '@/api/generated/schemas';
