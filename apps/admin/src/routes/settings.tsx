import { createFileRoute } from '@tanstack/react-router'
import SettingsPage from '../pages/admin/Settings'

export const Route = createFileRoute('/settings')({
    component: SettingsPage,
})
