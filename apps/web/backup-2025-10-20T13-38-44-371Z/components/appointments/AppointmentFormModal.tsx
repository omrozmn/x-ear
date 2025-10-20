import React from 'react';
import { Modal, Button, Input } from '@x-ear/ui-web';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
};

export function AppointmentFormModal({ open, onClose, onSubmit, initialData }: Props) {
  const [title, setTitle] = React.useState(initialData?.title ?? '');

  React.useEffect(() => {
    setTitle(initialData?.title ?? '');
  }, [initialData]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ ...initialData, title });
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={initialData ? 'Edit Appointment' : 'New Appointment'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <Input value={title} onChange={(e: any) => setTitle(e.target.value)} />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
