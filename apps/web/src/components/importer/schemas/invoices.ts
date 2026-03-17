import { z } from 'zod';

const optionalNumber = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  },
  z.number().optional()
);

const invoicesSchema = z.object({
  invoiceNumber: z.string().optional(),
  partyName: z.string().optional(),
  partyPhone: z.string().optional(),
  partyTcNumber: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  currency: z.string().optional(),
  grandTotal: optionalNumber,
  eInvoiceId: z.string().optional(),
  invoiceDate: z.string().optional(),
  billingName: z.string().optional(),
  billingMobilePhone: z.string().optional(),
  billingPhone: z.string().optional(),
  taxNo: z.string().optional(),
  taxOffice: z.string().optional(),
  totalPaidTaxIncluding: optionalNumber,
  productsTotalTaxIncluding: optionalNumber,
}).refine(
  (data) => data.invoiceNumber || data.partyName || data.partyTcNumber || data.partyPhone,
  { message: 'En az bir tanımlayıcı gerekli (fatura no, hasta adı, TC veya telefon)' }
);

export default invoicesSchema;
