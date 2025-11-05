import { createFileRoute } from '@tanstack/react-router'
import { PatientsPage } from '../../pages/PatientsPage'

export const Route = createFileRoute('/patients/')({
  component: PatientsPage,
})
