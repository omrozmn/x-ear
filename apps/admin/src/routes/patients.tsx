import { createFileRoute } from '@tanstack/react-router'
import AdminPatientsPage from '../pages/admin/AdminPatientsPage'

export const Route = createFileRoute('/patients')({
    component: AdminPatientsPage,
})
