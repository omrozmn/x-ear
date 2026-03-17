import { z } from 'zod';

const optionalNumber = z.preprocess(
  (val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const n = Number(val);
    return isNaN(n) ? undefined : n;
  },
  z.number().min(0).optional()
);

const inventorySchema = z.object({
  name: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  category: z.string().optional(),
  barcode: z.string().optional(),
  stockCode: z.string().optional(),
  supplier: z.string().optional(),
  availableInventory: optionalNumber,
  price: optionalNumber,
  cost: optionalNumber,
  kdvRate: optionalNumber,
  unit: z.string().optional(),
  reorderLevel: optionalNumber,
  warranty: optionalNumber,
  description: z.string().optional(),
  direction: z.string().optional(),
  maxGain: optionalNumber,
  fittingRangeMin: optionalNumber,
  fittingRangeMax: optionalNumber,
}).refine(
  (data) => data.name || data.barcode || data.stockCode,
  { message: 'En az bir tanımlayıcı gerekli (ürün adı, barkod veya stok kodu)' }
);

export default inventorySchema;
