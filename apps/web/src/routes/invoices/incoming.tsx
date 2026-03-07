import { createFileRoute } from '@tanstack/react-router'
import { IncomingInvoicesPage } from '../../pages/invoices/IncomingInvoicesPage'

export const Route = createFileRoute('/invoices/incoming')({
  component: IncomingInvoicesPage,
})