import { createFileRoute } from '@tanstack/react-router'
import { PaymentsPage } from '../../pages/PaymentsPage'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TanStack Router type generation out of sync
export const Route = createFileRoute('/invoices/payments')({
  component: PaymentsPage,
})
