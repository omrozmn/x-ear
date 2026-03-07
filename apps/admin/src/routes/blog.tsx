import { createFileRoute } from '@tanstack/react-router'
import AdminBlogPage from '../pages/admin/AdminBlogPage'

// @ts-ignore - Route types are generated during build/dev
export const Route = createFileRoute('/blog')({
    component: AdminBlogPage,
})
