import { createFileRoute } from '@tanstack/react-router'
import BillingPage from '../pages/admin/Billing'

export const Route = createFileRoute('/billing')({
    component: BillingPage,
})
