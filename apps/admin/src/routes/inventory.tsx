import { createFileRoute } from '@tanstack/react-router'
import AdminInventoryPage from '../pages/admin/AdminInventoryPage'

export const Route = createFileRoute('/inventory')({
    component: AdminInventoryPage,
})
