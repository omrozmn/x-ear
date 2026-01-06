import { updateInventory } from '@/api/generated';
import type { InventoryItemUpdate } from '@/api/generated/schemas';

export async function updateInventoryItem(itemId: string, payload: Partial<InventoryItemUpdate>) {
  return updateInventory(itemId, payload as InventoryItemUpdate);
}

export default { updateInventoryItem };
