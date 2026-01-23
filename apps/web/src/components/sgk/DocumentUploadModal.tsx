import { useState } from 'react';
import { Modal, Button, Input, FileUpload } from '@x-ear/ui-web';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUploadSgkDocument } from '@/hooks/sgk/useSgkDocuments';

const schema = z.object({ file: z.any() });

type Props = { partyId: string; isOpen: boolean; onClose: () => void; onUploaded?: () => void };

export default function DocumentUploadModal({ partyId, isOpen, onClose, onUploaded }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const upload = useUploadSgkDocument(partyId);

  const { register, handleSubmit, setValue } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      const form = new FormData();
      const file = (data.file && data.file[0]) || data.file;
      form.append('file', file);
      // add idempotency key
      // form.append('idempotencyKey', ...); // If backend expects it in body
      upload.mutate(form as unknown as any, { // Cast to unknown to bypass strict type check if hook expects non-FormData object but actual fetch handles FormData
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
          <FileUpload
            accept="image/*,.pdf"
            onChange={(files) => {
              if (files && files.length > 0) {
                setValue('file', files[0]);
              }
            }}
            className="w-full"
            description="JPEG, PNG, PDF formatlarında dosyalar"
          />
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
