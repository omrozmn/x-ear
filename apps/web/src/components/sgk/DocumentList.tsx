import { useState } from 'react';
import { Button } from '@/packages/ui-web';
import DocumentUploadModal from '@/components/sgk/DocumentUploadModal';
import { useSgkDocuments, useDeleteSgkDocument } from '@/hooks/sgk/useSgkDocuments';

type Props = { patientId: string };

export default function DocumentList({ patientId }: Props) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useSgkDocuments(patientId);
  const deleteMutation = useDeleteSgkDocument(patientId);

  const docs = (data as any)?.data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">SGK Documents</h3>
        <div>
          <Button onClick={() => setOpen(true)}>Upload</Button>
        </div>
      </div>

      {isLoading && <div>Loading documents…</div>}
      {isError && <div>Failed to load documents</div>}

      {!isLoading && docs.length === 0 && <div>No documents found.</div>}

      {!isLoading && docs.length > 0 && (
        <ul className="space-y-2">
          {docs.map((d: any) => (
            <li key={d.id} className="flex items-center justify-between p-2 border rounded">
              <div>
                <div className="font-medium">{d.name || d.filename || 'Document'}</div>
                <div className="text-sm text-gray-500">{d.createdAt || d.created_at || ''}</div>
              </div>
              <div className="flex gap-2">
                <a href={d.url || d.downloadUrl} target="_blank" rel="noreferrer">
                  <Button variant="ghost">Open</Button>
                </a>
                <Button
                  intent="danger"
                  onClick={() => deleteMutation.mutate({ id: d.id, idempotencyKey: `${Date.now()}-${Math.random()}` })}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <DocumentUploadModal
        isOpen={open}
        patientId={patientId}
        onClose={() => setOpen(false)}
        onUploaded={() => setOpen(false)}
      />
    </div>
  );
}
