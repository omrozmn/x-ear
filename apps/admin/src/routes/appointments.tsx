import { createFileRoute } from '@tanstack/react-router'
import AdminAppointmentsPage from '../pages/admin/AdminAppointmentsPage'

export const Route = createFileRoute('/appointments')({
    component: AdminAppointmentsPage,
})
