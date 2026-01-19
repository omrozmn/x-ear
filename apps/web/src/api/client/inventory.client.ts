/**
 * Inventory API Client Adapter
 * 
 * This adapter provides a single point of import for all inventory-related API operations.
 * Instead of importing directly from @/api/generated/inventory/inventory, use this adapter.
 * 
 * Usage:
 *   import { listInventory, getInventory } from '@/api/client/inventory.client';
 */

export {
  listInventory,
  getInventory,
  createInventory,
  updateInventory,
  deleteInventory,
  createInventorySerials,
  listInventoryStats,
  getListInventoryQueryKey,
  useListInventory,
  useGetInventory,
  useCreateInventory,
  useUpdateInventory,
  useDeleteInventory,
  useListInventoryMovements,
  getListInventoryMovementsQueryKey,
} from '@/api/generated/index';

export type { InventoryItemCreate, InventoryItemUpdate } from '@/api/generated/schemas';
