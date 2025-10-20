import { createFileRoute } from '@tanstack/react-router'
import { InvoicesPage } from '../../pages/InvoicesPage'

export const Route = createFileRoute('/invoices/new')({
  component: NewInvoice,
})

function NewInvoice() {
  return <InvoicesPage initialViewMode="form" />
}