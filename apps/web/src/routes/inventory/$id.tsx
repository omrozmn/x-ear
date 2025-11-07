import { createFileRoute } from '@tanstack/react-router'
import { InventoryDetailPage } from '@x-ear/ui-web'

export const Route = createFileRoute('/inventory/$id')({
  component: InventoryDetail,
})

function InventoryDetail() {
  const { id } = Route.useParams()
  return <InventoryDetailPage id={id} />
}
