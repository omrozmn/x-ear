import { createFileRoute } from '@tanstack/react-router'
import WebManagementPreviewPage from '../pages/admin/WebManagementPreviewPage'

export const Route = createFileRoute('/web-management-preview')({
    component: WebManagementPreviewPage,
})
