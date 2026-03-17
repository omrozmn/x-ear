import { createFileRoute } from '@tanstack/react-router'
import { InvoiceSummaryPage } from '../../pages/invoices/InvoiceSummaryPage'

export const Route = createFileRoute('/invoices/summary')({
  component: InvoiceSummaryPage,
})
