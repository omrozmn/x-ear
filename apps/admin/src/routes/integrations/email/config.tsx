import { createFileRoute } from '@tanstack/react-router'
import SMTPConfig from '@/pages/admin/integrations/Email/SMTPConfig'

export const Route = createFileRoute('/integrations/email/config' as any)({
    component: SMTPConfig,
})
