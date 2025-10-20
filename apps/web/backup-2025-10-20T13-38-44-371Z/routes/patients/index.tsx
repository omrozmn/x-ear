import { createFileRoute } from '@tanstack/react-router'
import { PatientsPage } from '../../pages/patients/PatientsPage'

export const Route = createFileRoute('/patients/')({
  component: PatientsPage,
})