import { z } from 'zod';

const partiesSchema = z.object({
  firstName: z.string().min(1, 'Ad gerekli'),
  lastName: z.string().min(1, 'Soyad gerekli'),
  tcNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Geçerli e-posta olmalı').optional(),
  birthDate: z.string().optional(),
  gender: z.union([z.string(), z.literal('M'), z.literal('F')]).optional()
});

export default partiesSchema;
