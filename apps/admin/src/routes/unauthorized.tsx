import { createFileRoute } from '@tanstack/react-router'
import UnauthorizedPage from '../pages/admin/Unauthorized'

export const Route = createFileRoute('/unauthorized')({
    component: UnauthorizedPage,
})
