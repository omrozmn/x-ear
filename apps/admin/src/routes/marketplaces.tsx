import { createFileRoute } from '@tanstack/react-router'
import AdminMarketplacesPage from '../pages/admin/AdminMarketplacesPage'

export const Route = createFileRoute('/marketplaces')({
    component: AdminMarketplacesPage,
})
