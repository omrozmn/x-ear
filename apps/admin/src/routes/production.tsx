import { createFileRoute } from '@tanstack/react-router'
import AdminProductionPage from '../pages/admin/AdminProductionPage'

export const Route = createFileRoute('/production')({
    component: AdminProductionPage,
})
