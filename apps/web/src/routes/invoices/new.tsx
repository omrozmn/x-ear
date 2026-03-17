import { createFileRoute } from '@tanstack/react-router'
import { NewInvoicePage } from '../../pages/NewInvoicePage'
import { z } from 'zod'

const newInvoiceSearchSchema = z.object({
  draftId: z.coerce.number().optional(),
  type: z.string().optional(),
  documentKind: z.enum(['invoice', 'despatch']).optional(),
})

export const Route = createFileRoute('/invoices/new')({
  component: NewInvoicePage,
  validateSearch: newInvoiceSearchSchema,
})
