import { createFileRoute } from '@tanstack/react-router'
import AffiliateDetailPage from '../pages/admin/AffiliateDetailPage'

export const Route = createFileRoute('/affiliates/$affiliateId')({
    component: AffiliateDetailWrapper,
})

function AffiliateDetailWrapper() {
    const { affiliateId } = Route.useParams()
    // Ensure we parse it to a number
    return <AffiliateDetailPage affiliateId={Number(affiliateId)} />
}
