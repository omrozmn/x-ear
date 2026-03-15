import type { SaleCreate } from '@/api/generated/schemas';

interface InventoryItemLike {
  id?: string;
  name?: string;
  brand?: string;
  model?: string;
  price?: number;
}

interface ProformaItemLike {
  productId?: string;
  name?: string;
  brand?: string;
  model?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  vatRate?: number;
  discountAmount?: number;
}

const normalize = (value: unknown) =>
  String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const findInventoryMatch = (
  item: ProformaItemLike,
  inventory: InventoryItemLike[],
) => {
  if (item.productId) {
    const exact = inventory.find((entry) => entry.id === item.productId);
    if (exact?.id) return exact;
  }

  const targetName = normalize(item.name);
  const targetBrand = normalize(item.brand);
  const targetModel = normalize(item.model);

  return inventory.find((entry) => {
    const inventoryName = normalize(entry.name);
    const inventoryBrand = normalize(entry.brand);
    const inventoryModel = normalize(entry.model);

    if (targetName && inventoryName === targetName) return true;
    if (targetName && inventoryName.includes(targetName)) return true;
    if (targetBrand && targetModel) {
      return inventoryBrand === targetBrand && inventoryModel === targetModel;
    }
    return false;
  });
};

export const buildSalesPayloadsFromProforma = ({
  partyId,
  items,
  inventory,
  notes,
}: {
  partyId: string;
  items: ProformaItemLike[];
  inventory: InventoryItemLike[];
  notes?: string;
}): { payloads: SaleCreate[]; missingItems: string[] } => {
  const payloads: SaleCreate[] = [];
  const missingItems: string[] = [];

  items.forEach((item, index) => {
    const matched = findInventoryMatch(item, inventory);
    if (!matched?.id) {
      missingItems.push(item.name || `Kalem ${index + 1}`);
      return;
    }

    payloads.push({
      partyId,
      productId: matched.id,
      quantity: Math.max(1, toNumber(item.quantity, 1)),
      salesPrice: toNumber(item.unitPrice || matched.price),
      discountType: 'amount',
      discountAmount: toNumber(item.discountAmount),
      paymentMethod: 'cash',
      notes,
      saleDate: new Date().toISOString().split('T')[0],
    });
  });

  return { payloads, missingItems };
};
