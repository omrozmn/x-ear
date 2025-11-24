import { z } from 'zod';

const invoicesSchema = z.object({
  // legacy/local names
  invoiceNumber: z.string().optional(),
  patientName: z.string().min(1, 'Hasta adı gerekli').optional(),
  patientPhone: z.string().optional(),
  patientTcNumber: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  currency: z.string().optional(),
  grandTotal: z.preprocess((v) => Number(v), z.number().optional()),

  // integrator / BirFatura expected fields
  eInvoiceId: z.string().optional(),
  invoiceDate: z.string().optional(),
  billingName: z.string().optional(),
  billingMobilePhone: z.string().optional(),
  billingPhone: z.string().optional(),
  taxNo: z.string().optional(),
  taxOffice: z.string().optional(),
  totalPaidTaxIncluding: z.preprocess((v) => Number(v), z.number().optional()),
  productsTotalTaxIncluding: z.preprocess((v) => Number(v), z.number().optional())
});

export default invoicesSchema;
