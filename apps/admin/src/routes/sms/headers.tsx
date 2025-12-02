import { createFileRoute } from '@tanstack/react-router'
import SMSHeadersPage from '../../pages/admin/SmsHeaders'

export const Route = createFileRoute('/sms/headers')({
    component: SMSHeadersPage,
})
