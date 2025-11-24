import { createFileRoute } from '@tanstack/react-router'
import Features from '../pages/admin/Features'

export const Route = createFileRoute('/features')({
    component: Features,
})
