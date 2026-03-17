
import { createFileRoute } from '@tanstack/react-router'
import PosPage from '../../pages/PosPage'
import { PermissionGate } from '../../components/PermissionGate'
import { NoPermissionPlaceholder } from '../../components/ui/NoPermissionPlaceholder'

function GatedPosPage() {
    return (
        <PermissionGate anyOf={['finance.view', 'finance.cash_register']} fallback={<NoPermissionPlaceholder height="h-[80vh]" message="POS sayfasını görüntüleme izniniz yok" />}>
            <PosPage />
        </PermissionGate>
    )
}

export const Route = createFileRoute('/pos/')({
    component: GatedPosPage,
})
