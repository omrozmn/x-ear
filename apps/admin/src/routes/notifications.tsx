import { createFileRoute } from '@tanstack/react-router'
import AdminNotificationsPage from '../pages/admin/AdminNotificationsPage'

export const Route = createFileRoute('/notifications')({
    component: AdminNotificationsPage,
})
