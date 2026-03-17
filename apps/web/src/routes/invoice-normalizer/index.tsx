import { createFileRoute } from '@tanstack/react-router'
import InvoiceNormalizerPage from '../../pages/invoice-normalizer'
import { FeatureGate } from '../../components/common/FeatureGate'

function GatedInvoiceNormalizerPage() {
  return (
    <FeatureGate featureKey="invoice_normalizer">
      <InvoiceNormalizerPage />
    </FeatureGate>
  )
}

export const Route = createFileRoute('/invoice-normalizer/')({
  component: GatedInvoiceNormalizerPage,
})
