import { createFileRoute } from '@tanstack/react-router'
import CompanySettings from '../../pages/settings/Company'

export const Route = createFileRoute('/settings/company')({
    component: CompanySettings,
})
