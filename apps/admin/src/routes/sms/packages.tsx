import { createFileRoute } from '@tanstack/react-router'
import SMSPackagesPage from '../../pages/admin/SmsPackages'

export const Route = createFileRoute('/sms/packages')({
    component: SMSPackagesPage,
})
