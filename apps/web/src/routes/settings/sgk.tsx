import { createFileRoute } from '@tanstack/react-router'
import SgkSettings from '../../pages/settings/SgkSettings'

export const Route = createFileRoute('/settings/sgk')({
    component: SgkSettings,
})
// trigger
