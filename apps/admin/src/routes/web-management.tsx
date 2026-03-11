import { createFileRoute } from '@tanstack/react-router'
import WebManagementOversightPage from '../pages/admin/WebManagementOversightPage'

export const Route = createFileRoute('/web-management')({
    component: WebManagementOversightPage,
})
