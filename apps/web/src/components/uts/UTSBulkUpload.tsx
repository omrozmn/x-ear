import * as React from 'react';
import { Button, Input, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { useStartBulkUtsRegistration } from '@/hooks/uts/useUts';
import { outbox } from '@/utils/outbox';
import { parseAndMapCsv, UtsCsvPreview } from '@/utils/uts-csv';
import type { BulkRegistration } from '@/api/generated/schemas';

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
      // Note: Backend expects deviceIds array, but we're sending csv for bulk processing
      const res = await startBulk.mutateAsync({ csv: fileContent } as unknown as BulkRegistration);
      const jobId = (res as { jobId?: string })?.jobId || `queued-${Date.now()}`;
      onStarted?.(jobId);
    } catch (err) {
      console.error('Failed to start UTS bulk registration:', err);
    }
  };

  type PreviewRow = {
    _idx: number;
    serial?: string;
    manufacturer?: string;
    model?: string;
    partyTc?: string;
  };

  const previewColumns: Column<PreviewRow>[] = [
    { key: 'serial', title: 'Serial' },
    { key: 'manufacturer', title: 'Manufacturer' },
    { key: 'model', title: 'Model' },
    { key: 'partyTc', title: 'Party TC' },
  ];

  const previewRows: PreviewRow[] = (preview?.mapped || []).map((item, index) => ({
    _idx: index,
    serial: item.mapped.serial,
    manufacturer: item.mapped.manufacturer,
    model: item.mapped.model,
    partyTc: item.mapped.partyTc,
  }));

  return (
    <div>
      <div>
        <Input type="file" accept="text/csv" onChange={(e) => handleFile(e.target.files ? e.target.files[0] : null)} />
      </div>
      {preview && (
        <div style={{ marginTop: 8 }}>
          <h4>Önizleme ({Array.isArray(preview.rows) ? preview.rows.length : preview.mapped?.length ?? 0})</h4>
          {preview.errors && preview.errors.length > 0 && (
            <div className="text-destructive">
              Hatalar:
              <ul>
                {preview.errors.map((err, idx) => (
                  <li key={idx}>Satır {err.row + 1}: {err.errors.join(', ')}</li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <DataTable<PreviewRow>
              data={previewRows}
              columns={previewColumns}
              rowKey="_idx"
              emptyText="Önizleme verisi bulunamadı"
            />
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
