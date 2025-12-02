import { createFileRoute } from '@tanstack/react-router'
import SmsPage from '../pages/campaigns/SmsPage'

export const Route = createFileRoute('/campaigns')({
    component: SmsPage,
})
