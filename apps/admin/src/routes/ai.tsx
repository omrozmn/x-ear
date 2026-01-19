import { createFileRoute } from '@tanstack/react-router'
import AIManagementPage from '../pages/admin/AIManagementPage'

export const Route = createFileRoute('/ai')({
    component: AIManagementPage,
})
