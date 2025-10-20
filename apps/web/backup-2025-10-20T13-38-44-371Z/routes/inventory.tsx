import { createFileRoute } from '@tanstack/react-router'
import { InventoryPage } from '@x-ear/ui-web'

export const Route = createFileRoute('/inventory')({
  component: Inventory,
})

function Inventory() {
  return <InventoryPage />
}
