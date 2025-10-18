import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/appointments')({
  component: Appointments,
})

function Appointments() {
  return (
    <div className="p-2">
      <h3 className="text-2xl font-bold mb-4">Randevular</h3>
      <div className="border rounded-lg p-4">
        <p>Randevu takvimi burada görüntülenecek...</p>
      </div>
    </div>
  )
}
