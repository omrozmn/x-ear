import { createFileRoute } from '@tanstack/react-router'
import AdminScanQueuePage from '../pages/admin/AdminScanQueuePage'

export const Route = createFileRoute('/ocr-queue')({
    component: AdminScanQueuePage,
})
