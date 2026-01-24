import * as React from 'react';
import { Button, Input } from '@x-ear/ui-web';
import { useStartBulkUtsRegistration } from '@/hooks/uts/useUts';
import { outbox } from '@/utils/outbox';
import { parseAndMapCsv, UtsCsvPreview } from '@/utils/uts-csv';

// Removed redundant local types UtsPayload and UtsCsvPreview

export const UTSBulkUpload: React.FC<{ onStarted?: (jobId: string) => void }> = ({ onStarted }) => {
  const [fileContent, setFileContent] = React.useState<string>('');
  const startBulk = useStartBulkUtsRegistration();

  const [preview, setPreview] = React.useState<UtsCsvPreview | null>(null);

  const handleFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setFileContent(text);
      const parsed = parseAndMapCsv(text);
      setPreview(parsed);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!fileContent) return;
    // Send to backend via outbox for offline-first, idempotent processing
    try {
      const idempotencyKey = `uts_bulk_${Date.now()}`;
      await outbox.addOperation({
        method: 'POST',
        endpoint: '/api/uts/registrations/bulk',
        data: {
          csv: fileContent,
        },
        headers: { 'Idempotency-Key': idempotencyKey },
        maxRetries: 5,
      });

      // Also trigger immediate processing via mutation for online case
      const res = await startBulk.mutateAsync({ csv: fileContent } as unknown as any);
      const jobId = (res as { jobId?: string })?.jobId || `queued-${Date.now()}`;
      onStarted?.(jobId);
    } catch (err) {
      console.error('Failed to start UTS bulk registration:', err);
    }
  };

  return (
    <div>
      <div>
        <Input type="file" accept="text/csv" onChange={(e) => handleFile(e.target.files ? e.target.files[0] : null)} />
      </div>
      {preview && (
        <div style={{ marginTop: 8 }}>
          <h4>Önizleme ({Array.isArray(preview.rows) ? preview.rows.length : preview.mapped?.length ?? 0})</h4>
          {preview.errors && preview.errors.length > 0 && (
            <div style={{ color: 'red' }}>
              Hatalar:
              <ul>
                {preview.errors.map((err, idx) => (
                  <li key={idx}>Satır {err.row + 1}: {err.errors.join(', ')}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #eee', padding: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Serial</th>
                  <th>Manufacturer</th>
                  <th>Model</th>
                  <th>Party TC</th>
                </tr>
              </thead>
              <tbody>
                {preview.mapped && preview.mapped.map((m, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f3f3f3' }}>
                    <td>{m.mapped.serial}</td>
                    <td>{m.mapped.manufacturer}</td>
                    <td>{m.mapped.model}</td>
                    <td>{m.mapped.partyTc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <Button onClick={handleSubmit} disabled={startBulk.isPending || !fileContent}>
          CSV ile Toplu Kayıt
        </Button>
      </div>
    </div>
  );
};

export default UTSBulkUpload;
