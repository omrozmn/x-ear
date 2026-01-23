import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Textarea } from '@x-ear/ui-web';
import { useStartBulkUtsRegistration } from '@/hooks/uts/useUts';

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
      await startBulk.mutateAsync({ csv: data.csv } as unknown as any);
      onClose();
    } catch (e) {
      // on error, outbox fallback handled in UTSBulkUpload or service layer
      console.error('UTS bulk start failed', e);
    }
  };

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: 'white', padding: 16, width: '640px', borderRadius: 8 }}>
        <h3>ÜTS Toplu Kayıt Başlat</h3>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Textarea {...register('csv')} rows={8} className="w-full" />
            {errors.csv && <div style={{ color: 'red' }}>{errors.csv.message}</div>}
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
