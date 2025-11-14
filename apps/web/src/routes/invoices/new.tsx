import { createFileRoute } from '@tanstack/react-router'
import { NewInvoicePage } from '../../pages/NewInvoicePage'

export const Route = createFileRoute('/invoices/new')({
  component: NewInvoicePage,
})