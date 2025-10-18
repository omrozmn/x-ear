import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/inventory')({
  component: Inventory,
})

function Inventory() {
  return (
    <div className="p-2">
      <h3 className="text-2xl font-bold mb-4">Envanter</h3>
      <div className="border rounded-lg p-4">
        <p>Envanter listesi burada görüntülenecek...</p>
      </div>
    </div>
  )
}
