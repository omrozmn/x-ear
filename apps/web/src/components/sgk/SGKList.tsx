import { useState } from 'react';
import DocumentList from '@/components/sgk/DocumentList';
import { Input, Button } from '@x-ear/ui-web';

export default function SGKList() {
  const [patientId, setPatientId] = useState('');

  return (
    <div>
      <div className="mb-4 flex gap-2 items-center">
        <Input placeholder="Hasta ID girin" value={patientId} onChange={(e: any) => setPatientId(e.target.value)} />
        <Button onClick={() => { /* noop for now */ }}>Ara</Button>
      </div>

      {patientId ? (
        <DocumentList patientId={patientId} />
      ) : (
        <div className="p-4 bg-gray-50 rounded">Hasta ID girin veya bir hasta seçin.</div>
      )}
    </div>
  );
}
