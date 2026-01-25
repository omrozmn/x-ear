import * as React from 'react';
import { useState } from 'react';
import useUtsRegistrations, { useStartBulkUtsRegistration, usePollUtsJob } from '@/hooks/uts/useUts';
import { Button, Textarea } from '@x-ear/ui-web';
import UTSBulkUpload from '@/components/uts/UTSBulkUpload';
import UTSRegisterModal from '@/components/uts/UTSRegisterModal';
import type { BulkRegistration } from '@/api/generated/schemas';

export const UTSPage: React.FC = () => {
  const { data, isLoading } = useUtsRegistrations();
  const startBulk = useStartBulkUtsRegistration();
  const [csv, setCsv] = useState<string>('');
  const [openModal, setOpenModal] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const jobStatus = usePollUtsJob(jobId || '', { interval: 10000, onComplete: (data) => console.log('job completed', data) }); // Changed from 3000 (3s) to 10000 (10s)

  const handleStart = () => {
    // Simple scaffold: parse CSV externally; here we send raw CSV as payload for server to parse
    // Force cast because generated schema might not include 'csv' field yet
    startBulk.mutate({ csv } as unknown as BulkRegistration);
  };

  return (
    <div>
      <h2>ÜTS Kayıtları</h2>
      <div style={{ margin: '1rem 0' }}>
        <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={8} style={{ width: '100%' }} />
        <div style={{ marginTop: '0.5rem' }}>
          <Button onClick={handleStart} disabled={startBulk.isPending}>
            Toplu Kayıt Başlat
          </Button>
        </div>
      </div>

      <section>
        <h3>Geçmiş Kayıtlar</h3>
        {isLoading ? (
          <div>Yükleniyor...</div>
        ) : (
          <ul>
            {((data || []) as Array<{ id: string; status: string }>).map((r) => (
              <li key={r.id}>{r.id} - {r.status}</li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h3>Toplu Kayıt (CSV)</h3>
        <div style={{ marginBottom: 8 }}>
          <Button onClick={() => setOpenModal(true)}>Toplu Kayıt Başlat</Button>
        </div>
        <UTSBulkUpload onStarted={(id) => setJobId(id)} />
        {jobId && (
          <div style={{ marginTop: 12 }}>
            <strong>İş ID:</strong> {jobId} <br />
            <strong>Durum:</strong> {(jobStatus?.data as unknown as { status?: string })?.status || (jobStatus.isFetching ? 'Çalışıyor' : 'Bekleniyor')}
          </div>
        )}
      </section>

      <UTSRegisterModal open={openModal} onClose={() => setOpenModal(false)} />
    </div>
  );
};

export default UTSPage;
