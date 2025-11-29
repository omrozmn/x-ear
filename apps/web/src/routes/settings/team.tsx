import { createFileRoute } from '@tanstack/react-router'
import TeamSettings from '../../pages/settings/Team'

export const Route = createFileRoute('/settings/team')({
    component: TeamSettings,
})
