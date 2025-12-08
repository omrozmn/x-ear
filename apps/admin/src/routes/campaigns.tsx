import { createFileRoute } from '@tanstack/react-router'
import AdminCampaignsPage from '../pages/admin/AdminCampaignsPage'

export const Route = createFileRoute('/campaigns')({
    component: AdminCampaignsPage,
})
