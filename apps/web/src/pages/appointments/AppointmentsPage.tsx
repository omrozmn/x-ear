import React from 'react';
import { AppointmentFormModal } from '@/components/appointments/AppointmentFormModal';
import { useAppointmentsList } from '@/hooks/appointments/useAppointments';
import { Button } from '@x-ear/ui-web';

export function AppointmentsPage() {
  const { data, isLoading } = useAppointmentsList();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);

  function close() {
    setOpen(false);
    setEditing(null);
  }

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function handleEdit(item: any) {
    setEditing(item);
    setOpen(true);
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Appointments</h1>
        <Button onClick={openNew}>New</Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-2">
          {data?.map((a: any) => (
            <div key={a.id} className="p-2 border rounded flex justify-between">
              <div>
                <div className="font-medium">{a.title}</div>
                <div className="text-sm text-gray-500">{a.date}</div>
              </div>
              <div>
                <Button variant="ghost" onClick={() => handleEdit(a)}>
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AppointmentFormModal
        open={open}
        onClose={close}
        onSubmit={async (data) => {
          // TODO: wire create/update
          console.log('submit', data);
          close();
        }}
        initialData={editing ?? undefined}
      />
    </div>
  );
}
