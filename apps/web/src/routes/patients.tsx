import { createFileRoute } from '@tanstack/react-router'
import { PatientsPage } from '../components/patients/PatientsPage'

export const Route = createFileRoute('/patients')({
  component: PatientsPage,
})
