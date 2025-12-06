import { createFileRoute } from '@tanstack/react-router'
import AdminBirFaturaPage from '../pages/admin/AdminBirFaturaPage'

export const Route = createFileRoute('/billing')({
    component: AdminBirFaturaPage,
})
