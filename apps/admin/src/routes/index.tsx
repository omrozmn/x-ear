import { createFileRoute, redirect } from '@tanstack/react-router'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'

export const Route = createFileRoute('/')({
    beforeLoad: () => {
        throw redirect({
            to: '/dashboard',
        })
    },
})
