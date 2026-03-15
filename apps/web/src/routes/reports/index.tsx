import { createFileRoute } from '@tanstack/react-router'
import ReportsPage from '../../pages/ReportsPage'
import { FeatureGate } from '../../components/common/FeatureGate'
import { z } from 'zod'

const reportsSearchSchema = z.object({
  tab: z.enum(['overview', 'sales', 'parties', 'promissory', 'remaining', 'activity', 'pos_movements', 'report_tracking']).optional(),
})

function GatedReportsPage() {
  return (
    <FeatureGate featureKey="reports">
      <ReportsPage />
    </FeatureGate>
  )
}

export const Route = createFileRoute('/reports/')({
  component: GatedReportsPage,
  validateSearch: reportsSearchSchema,
})
