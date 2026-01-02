import { createFileRoute } from '@tanstack/react-router'
import AffiliatesPage from '../pages/admin/AffiliatesPage'

export const Route = createFileRoute('/affiliates')({
    component: AffiliatesPage,
})
