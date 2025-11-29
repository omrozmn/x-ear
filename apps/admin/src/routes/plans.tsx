import { createFileRoute } from '@tanstack/react-router'
import Plans from '../pages/admin/Plans'

// @ts-ignore
export const Route = createFileRoute('/plans')({
    component: Plans,
})
