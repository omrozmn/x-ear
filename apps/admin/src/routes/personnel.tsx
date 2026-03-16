import { createFileRoute } from '@tanstack/react-router'
import AdminPersonnelPage from '../pages/admin/AdminPersonnelPage'

export const Route = createFileRoute('/personnel')({
  component: AdminPersonnelPage,
})
