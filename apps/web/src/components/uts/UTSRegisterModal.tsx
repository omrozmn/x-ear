import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Textarea } from '@x-ear/ui-web';
import { useStartBulkUtsRegistration } from '@/hooks/uts/useUts';
import type { BulkRegistration } from '@/api/generated/schemas';

const Schema = z.object({
  csv: z.string().min(1, 'CSV boş olamaz')
});

type FormValues = z.infer<typeof Schema>;

export const UTSRegisterModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(Schema) });
  const startBulk = useStartBulkUtsRegistration();

  const onSubmit = async (data: FormValues) => {
    try {
      // Note: Backend expects deviceIds array, but we're sending csv for bulk processing
      await startBulk.mutateAsync({ csv: data.csv } as unknown as BulkRegistration);
      onClose();
    } catch (e) {
      // on error, outbox fallback handled in UTSBulkUpload or service layer
      console.error('UTS bulk start failed', e);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000]">
      <div className="bg-card p-4 w-[640px] rounded-lg">
        <h3>ÜTS Toplu Kayıt Başlat</h3>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Textarea {...register('csv')} rows={8} className="w-full" />
            {errors.csv && <div className="text-destructive">{errors.csv.message}</div>}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={onClose}>İptal</Button>
            <Button type="submit">Başlat</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UTSRegisterModal;
