import { z } from 'zod';

const supplierSchema = z.object({
  companyName: z.string().min(1, 'Şirket Adı gerekli'),
  companyCode: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Geçerli bir e-posta olmalı').optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  isActive: z.union([z.string(), z.boolean(), z.number()]).optional(),
});

export default supplierSchema;
