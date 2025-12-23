import { createFileRoute } from '@tanstack/react-router'
import IntegrationsPage from '../../pages/admin/IntegrationsPage'

export const Route = createFileRoute('/integrations/vatan-sms')({
    component: IntegrationsPage,
})
