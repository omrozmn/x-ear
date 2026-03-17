import { z } from 'zod';

const partiesSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  tcNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Geçerli e-posta olmalı').optional().or(z.literal('')),
  birthDate: z.string().optional(),
  gender: z.union([z.string(), z.literal('M'), z.literal('F')]).optional()
}).refine(
  (data) => data.firstName || data.tcNumber || data.phone,
  { message: 'En az bir tanımlayıcı gerekli (ad, TC veya telefon)' }
);

export default partiesSchema;
