import { createFileRoute } from '@tanstack/react-router'
import WebManagementPage from '../pages/admin/WebManagementPage'

export const Route = createFileRoute('/web-management')({
    component: WebManagementPage,
})
