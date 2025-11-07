import { createFileRoute } from '@tanstack/react-router'
import { InventoryPage } from '../../pages/InventoryPage'

export const Route = createFileRoute('/inventory/')({
  component: InventoryList,
})

function InventoryList() {
  return <InventoryPage />
}
