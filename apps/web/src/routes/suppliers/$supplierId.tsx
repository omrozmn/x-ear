import { createFileRoute } from '@tanstack/react-router'
import { SupplierDetailPage } from '../../pages/SupplierDetailPage'

export const Route = createFileRoute('/suppliers/$supplierId')({
  component: SupplierDetailPage,
})