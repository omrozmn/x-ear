import { createFileRoute } from '@tanstack/react-router'
import EmailLogs from '@/pages/admin/integrations/Email/EmailLogs'

export const Route = createFileRoute('/integrations/email/logs' as any)({
    component: EmailLogs,
})
