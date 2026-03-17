import { createFileRoute } from '@tanstack/react-router'
import PersonnelManagementPage from '../pages/PersonnelManagementPage'
import { PermissionGate } from '../components/PermissionGate'
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder'

function GatedPersonnelPage() {
  return (
    <PermissionGate anyOf={['team.view', 'team.permissions']} fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Personel sayfasını görüntüleme izniniz yok" />}>
      <PersonnelManagementPage />
    </PermissionGate>
  )
}

export const Route = createFileRoute('/personnel')({
  component: GatedPersonnelPage,
})
