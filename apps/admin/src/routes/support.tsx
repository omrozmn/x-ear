import { createFileRoute } from '@tanstack/react-router'
import SupportPage from '../pages/admin/Support'

export const Route = createFileRoute('/support')({
    component: SupportPage,
})
