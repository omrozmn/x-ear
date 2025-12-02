import { createFileRoute } from '@tanstack/react-router'
import IntegrationSettings from '../../pages/settings/Integration'

export const Route = createFileRoute('/settings/integration')({
    component: IntegrationSettings,
})
