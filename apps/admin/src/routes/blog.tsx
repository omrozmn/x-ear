import { createFileRoute } from '@tanstack/react-router'
import AdminBlogPage from '../pages/admin/AdminBlogPage'

export const Route = createFileRoute('/blog')({
    component: AdminBlogPage,
})
