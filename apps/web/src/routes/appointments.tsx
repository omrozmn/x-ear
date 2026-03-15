import { createFileRoute } from '@tanstack/react-router'
import AppointmentsPage from '../pages/appointments'
import { FeatureGate } from '../components/common/FeatureGate'

function GatedAppointmentsPage() {
  return (
    <FeatureGate featureKey="appointments">
      <AppointmentsPage />
    </FeatureGate>
  )
}

export const Route = createFileRoute('/appointments')({
  component: GatedAppointmentsPage,
})
