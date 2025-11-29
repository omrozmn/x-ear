import { createFileRoute } from '@tanstack/react-router'
import Subscription from '../../pages/settings/Subscription'

export const Route = createFileRoute('/settings/subscription')({
    component: Subscription,
})
