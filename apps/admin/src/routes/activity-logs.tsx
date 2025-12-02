import { createFileRoute } from '@tanstack/react-router'
import ActivityLogPage from '../pages/admin/ActivityLog'

export const Route = createFileRoute('/activity-logs')({
    component: ActivityLogPage,
})
