import { createFileRoute } from '@tanstack/react-router'
import AdminApiKeysPage from '../pages/admin/AdminApiKeysPage'

export const Route = createFileRoute('/api-keys')({
    component: AdminApiKeysPage,
})
