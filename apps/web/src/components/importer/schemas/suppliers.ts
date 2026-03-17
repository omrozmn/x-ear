import { z } from 'zod';

const supplierSchema = z.object({
  companyName: z.string().optional(),
  companyCode: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  isActive: z.union([z.string(), z.boolean(), z.number()]).optional(),
}).refine(
  (data) => data.companyName || data.companyCode || data.phone,
  { message: 'En az bir tanımlayıcı gerekli (şirket adı, kodu veya telefon)' }
);

export default supplierSchema;
