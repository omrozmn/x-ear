import { createFileRoute } from '@tanstack/react-router'
import AppointmentsPage from '../pages/appointments'
import { FeatureGate } from '../components/common/FeatureGate'
import { PermissionGate } from '../components/PermissionGate'
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder'

function GatedAppointmentsPage() {
  return (
    <FeatureGate featureKey="appointments">
      <PermissionGate permission="appointments.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Randevular sayfasını görüntüleme izniniz yok" />}>
        <AppointmentsPage />
      </PermissionGate>
    </FeatureGate>
  )
}

export const Route = createFileRoute('/appointments')({
  component: GatedAppointmentsPage,
})
