import { createFileRoute } from '@tanstack/react-router'
import SettingsPage from '../../pages/SettingsPage'
import { z } from 'zod'

const settingsSearchSchema = z.object({
  tab: z.enum(['company', 'integration', 'team', 'parties', 'sgk', 'subscription']).optional(),
})

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
  validateSearch: settingsSearchSchema,
})
