import { createFileRoute } from '@tanstack/react-router'
import AdminPaymentsPage from '../pages/admin/AdminPaymentsPage'

export const Route = createFileRoute('/payments')({
    component: AdminPaymentsPage,
})
