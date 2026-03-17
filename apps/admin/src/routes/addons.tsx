import { createFileRoute } from '@tanstack/react-router'
import AddOns from '../pages/admin/AddOns'

export const Route = createFileRoute('/addons')({
    component: AddOns,
})
