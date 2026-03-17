import { createFileRoute } from '@tanstack/react-router'
import TeamSettings from '../../pages/settings/Team'
import { PermissionGate } from '../../components/PermissionGate'
import { NoPermissionPlaceholder } from '../../components/ui/NoPermissionPlaceholder'

function GatedTeamSettings() {
    return (
        <PermissionGate permission="team.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Ekip yönetimi sayfasını görüntüleme izniniz yok" />}>
            <TeamSettings />
        </PermissionGate>
    )
}

export const Route = createFileRoute('/settings/team')({
    component: GatedTeamSettings,
})
