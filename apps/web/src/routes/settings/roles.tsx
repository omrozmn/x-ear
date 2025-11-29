import { createFileRoute } from '@tanstack/react-router'
import RolesSettings from '../../pages/settings/Roles'

export const Route = createFileRoute('/settings/roles')({
    component: RolesSettings,
})
