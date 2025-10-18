import { createFileRoute } from '@tanstack/react-router'
import { PurchasesPage } from '../../pages/PurchasesPage'

export const Route = createFileRoute('/invoices/purchases')({
  component: PurchasesPage,
})