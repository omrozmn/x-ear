import { createFileRoute } from '@tanstack/react-router'
import ReportsPage from '../../pages/ReportsPage'
import { FeatureGate } from '../../components/common/FeatureGate'
import { PermissionGate } from '../../components/PermissionGate'
import { NoPermissionPlaceholder } from '../../components/ui/NoPermissionPlaceholder'
import { z } from 'zod'

const reportsSearchSchema = z.object({
  tab: z.enum(['overview', 'sales', 'parties', 'promissory', 'remaining', 'activity', 'pos_movements', 'report_tracking']).optional(),
})

function GatedReportsPage() {
  return (
    <FeatureGate featureKey="reports">
      <PermissionGate anyOf={['reports.view', 'reports.overview.view', 'reports.sales.view', 'reports.patients.view', 'reports.promissory.view', 'reports.remaining.view', 'reports.activity.view', 'reports.pos_movements.view', 'reports.report_tracking.view']} fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Raporlar sayfasını görüntüleme izniniz yok" />}>
        <ReportsPage />
      </PermissionGate>
    </FeatureGate>
  )
}

export const Route = createFileRoute('/reports/')({
  component: GatedReportsPage,
  validateSearch: reportsSearchSchema,
})
