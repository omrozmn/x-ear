import { useState } from 'react';
import DocumentList from '@/components/sgk/DocumentList';
import { Input, Button } from '@x-ear/ui-web';

export default function SGKList() {
  const [partyId, setPartyId] = useState('');

  return (
    <div>
      <div className="mb-4 flex gap-2 items-center">
        <Input placeholder="Hasta ID girin" value={partyId} onChange={(e: any) => setPartyId(e.target.value)} />
        <Button onClick={() => { /* noop for now */ }}>Ara</Button>
      </div>

      {partyId ? (
        <DocumentList partyId={partyId} />
      ) : (
        <div className="p-4 bg-gray-50 rounded">Hasta ID girin veya bir hasta seçin.</div>
      )}
    </div>
  );
}
