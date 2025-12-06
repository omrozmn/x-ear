import { createFileRoute } from '@tanstack/react-router'
import AdminRolesPage from '../pages/admin/AdminRolesPage'

export const Route = createFileRoute('/roles')({
    component: AdminRolesPage,
})
