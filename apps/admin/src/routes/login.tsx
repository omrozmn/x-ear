import { createFileRoute } from '@tanstack/react-router'
import LoginPage from '../pages/admin/Login'

export const Route = createFileRoute('/login')({
    component: LoginPage,
})
