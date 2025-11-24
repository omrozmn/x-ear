import { createFileRoute } from '@tanstack/react-router'
import TenantsPage from '../pages/admin/TenantsPage'

export const Route = createFileRoute('/tenants')({
    component: TenantsPage,
})
