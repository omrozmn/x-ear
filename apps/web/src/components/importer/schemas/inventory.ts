import { z } from 'zod';

const inventorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Ürün adı gerekli'),
  brand: z.string().optional(),
  model: z.string().optional(),
  category: z.string().optional(),
  availableInventory: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') return undefined;
    return Number(val);
  }, z.number().min(0).optional()),
  price: z.preprocess((val) => (val === '' || val === null ? undefined : Number(val)), z.number().min(0).optional()),
  barcode: z.string().optional(),
  supplier: z.string().optional(),
});

export default inventorySchema;
