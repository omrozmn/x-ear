import { useState } from 'react';
import { Modal, Button, Input } from '@x-ear/ui-web';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUploadSgkDocument } from '@/hooks/sgk/useSgkDocuments';

const schema = z.object({ file: z.any() });

type Props = { patientId: string; isOpen: boolean; onClose: () => void; onUploaded?: () => void };

export default function DocumentUploadModal({ patientId, isOpen, onClose, onUploaded }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const upload = useUploadSgkDocument(patientId);

  const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      const form = new FormData();
      const file = (data.file && data.file[0]) || data.file;
      form.append('file', file);
      // add idempotency key
      (form as any).idempotencyKey = `upload-${Date.now()}-${Math.random()}`;
      upload.mutate(form as any, {
        onSuccess: () => {
          onUploaded?.();
        },
        onSettled: () => {
          setSubmitting(false);
          onClose();
        },
      });
    } catch (e) {
      setSubmitting(false);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload SGK Document">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">File</label>
          <Input type="file" {...register('file')} />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
