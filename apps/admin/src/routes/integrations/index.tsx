import { createFileRoute } from '@tanstack/react-router'
import IntegrationsIndexPage from '@/pages/admin/integrations/IntegrationsIndexPage'

export const Route = createFileRoute('/integrations/')({
    component: IntegrationsIndexPage,
})
