import { inventoryUpdateInventoryItem } from '@/api/generated';
import type { InventoryItem } from '@/api/generated/schemas';

export async function updateInventoryItem(itemId: string, payload: Partial<InventoryItem>) {
  return inventoryUpdateInventoryItem(itemId, payload as any);
}

export default { updateInventoryItem };
