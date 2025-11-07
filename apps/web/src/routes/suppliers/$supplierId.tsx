import { createFileRoute } from '@tanstack/react-router'
import SupplierDetailPage from '../../pages/SupplierDetailPage.tsx'

export const Route = createFileRoute('/suppliers/$supplierId')({
  component: SupplierDetailPage,
})