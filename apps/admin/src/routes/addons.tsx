import { createFileRoute } from '@tanstack/react-router'
import AddOns from '../pages/admin/AddOns'

// @ts-ignore
export const Route = createFileRoute('/addons')({
    component: AddOns,
})
