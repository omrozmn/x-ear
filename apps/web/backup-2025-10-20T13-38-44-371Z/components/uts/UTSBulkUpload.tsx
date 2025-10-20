import * as React from 'react';
import { Button } from '@x-ear/ui-web';
import { useStartBulkUtsRegistration } from '@/hooks/uts/useUts';
import { outbox } from '@/utils/outbox';
import parseAndMapCsv from '@/utils/uts-csv';

export const UTSBulkUpload: React.FC<{ onStarted?: (jobId: string) => void }> = ({ onStarted }) => {
  const [fileContent, setFileContent] = React.useState<string>('');
  const startBulk = useStartBulkUtsRegistration();

  const [preview, setPreview] = React.useState<any | null>(null);

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
    // Parse CSV
    const parsed = parseAndMapCsv(fileContent);
    const mappedRows = parsed.mapped.map((m:any) => m.mapped);

    try {
      const res = await startBulk.mutateAsync({ rows: mappedRows });
      // If backend returns jobId, notify parent
      if (res && (res as any).jobId && onStarted) onStarted((res as any).jobId);
    } catch (err) {
      // On failure (likely offline), enqueue to outbox
      try {
        await outbox.addOperation({
          method: 'POST',
          endpoint: '/api/uts/registrations/bulk',
          data: { rows: mappedRows },
          headers: { 'Idempotency-Key': `uts_bulk_${Date.now()}` },
          maxRetries: 5,
        });
        // Notify user via event or toast (omitted here)
      } catch (e) {
        console.error('Failed to enqueue UTS bulk operation', e);
        throw e;
      }
    }
  };

  return (
    <div>
      <div>
        <input type="file" accept="text/csv" onChange={(e) => handleFile(e.target.files ? e.target.files[0] : null)} />
      </div>
      {preview && (
        <div style={{ marginTop: 8 }}>
          <h4>Önizleme ({Array.isArray(preview.rows) ? preview.rows.length : preview.mapped?.length ?? 0})</h4>
          {preview.errors && preview.errors.length > 0 && (
            <div style={{ color: 'red' }}>
              Hatalar:
              <ul>
                {preview.errors.map((err:any, idx:number) => (
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
                  <th>Patient TC</th>
                </tr>
              </thead>
              <tbody>
                {preview.mapped && preview.mapped.map((m:any, i:number) => (
                  <tr key={i} style={{ borderTop: '1px solid #f3f3f3' }}>
                    <td>{m.mapped.serial}</td>
                    <td>{m.mapped.manufacturer}</td>
                    <td>{m.mapped.model}</td>
                    <td>{m.mapped.patientTc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <Button onClick={handleSubmit} disabled={(startBulk as any).isLoading || !fileContent}>
          CSV ile Toplu Kayıt
        </Button>
      </div>
    </div>
  );
};

export default UTSBulkUpload;
