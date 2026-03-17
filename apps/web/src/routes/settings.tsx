import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PermissionGate } from '../components/PermissionGate'
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder'

export const Route = createFileRoute('/settings')({
  component: SettingsLayout,
})

function SettingsLayout() {
  return (
    <PermissionGate anyOf={['settings.view', 'team.view', 'team.permissions']} fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Ayarlar sayfasını görüntüleme izniniz yok" />}>
      <Outlet />
    </PermissionGate>
  )
}
