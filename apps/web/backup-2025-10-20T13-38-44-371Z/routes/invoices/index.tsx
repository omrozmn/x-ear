import { createFileRoute } from '@tanstack/react-router'
import { InvoicesPage } from '../../pages/InvoicesPage'

export const Route = createFileRoute('/invoices/')({
  component: InvoicesPage,
})