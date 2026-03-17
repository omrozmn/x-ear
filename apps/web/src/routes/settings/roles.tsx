import { createFileRoute } from '@tanstack/react-router'
import RolesSettings from '../../pages/settings/Roles'
import { PermissionGate } from '../../components/PermissionGate'
import { NoPermissionPlaceholder } from '../../components/ui/NoPermissionPlaceholder'

function GatedRolesSettings() {
    return (
        <PermissionGate permission="team.permissions" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Rol izinleri sayfasını görüntüleme izniniz yok" />}>
            <RolesSettings />
        </PermissionGate>
    )
}

export const Route = createFileRoute('/settings/roles')({
    component: GatedRolesSettings,
})
