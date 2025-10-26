import { createFileRoute } from '@tanstack/react-router'
import AppointmentsPage from '../pages/appointments'

export const Route = createFileRoute('/appointments')({
  component: AppointmentsPage,
})
