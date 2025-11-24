import { createFileRoute } from '@tanstack/react-router'
import UsersPage from '../pages/admin/Users'

export const Route = createFileRoute('/users')({
    component: UsersPage,
})
