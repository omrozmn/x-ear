import { createFileRoute } from '@tanstack/react-router'
import AdminSuppliersPage from '../pages/admin/AdminSuppliersPage'

export const Route = createFileRoute('/suppliers')({
    component: AdminSuppliersPage,
})
