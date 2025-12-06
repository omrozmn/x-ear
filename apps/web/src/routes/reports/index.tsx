import { createFileRoute } from '@tanstack/react-router'
import ReportsPage from '../../pages/ReportsPage'
import { z } from 'zod'

const reportsSearchSchema = z.object({
  tab: z.enum(['overview', 'sales', 'patients', 'promissory', 'remaining', 'activity']).optional(),
})

export const Route = createFileRoute('/reports/')({
  component: ReportsPage,
  validateSearch: reportsSearchSchema,
})