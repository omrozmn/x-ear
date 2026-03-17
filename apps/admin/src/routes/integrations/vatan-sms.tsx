import { createFileRoute } from '@tanstack/react-router'
import VatanSmsSettingsPage from '../../pages/admin/integrations/VatanSmsSettingsPage'

export const Route = createFileRoute('/integrations/vatan-sms')({
    component: VatanSmsSettingsPage,
})
