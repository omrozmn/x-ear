
import { createFileRoute } from '@tanstack/react-router'
import PosPage from '../../pages/PosPage'

export const Route = createFileRoute('/pos/')({
    component: PosPage,
})
