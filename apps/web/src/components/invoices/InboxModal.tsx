import React, { useEffect, useState } from 'react';
import { Button } from '@x-ear/ui-web';
import { getBirFaturaAPI } from '../../services/birfatura.service';
import { unwrapObject } from '../../utils/response-unwrap';

interface InboxFile { filename: string; size: number; mtime: number }

export const InboxModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<InboxFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<InboxFile | null>(null);

  useEffect(() => {
    if (isOpen) fetchList();
  }, [isOpen]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const api = getBirFaturaAPI();
      const resp = await api.getApiInEBelgeV2List();
      const fileList = unwrapObject<{ data: InboxFile[] }>(resp);
      setFiles(fileList.data || []);
    } catch (e) {
      console.error('Failed to fetch inbox list', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPdf = (f: InboxFile) => {
    // open PDF in new tab
    const url = `/api/birfatura/inbox/file?name=${encodeURIComponent(f.filename)}&format=pdf`;
    window.open(url, '_blank');
  };

  const handleDownloadXml = (f: InboxFile) => {
    const url = `/api/birfatura/inbox/file?name=${encodeURIComponent(f.filename)}&format=xml`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow max-w-3xl w-full max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Gelen Faturalar (Inbox)</h3>
          <div className="flex items-center gap-2">
            <Button variant="default" onClick={onClose}>Kapat</Button>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div>Yükleniyor...</div>
          ) : (
            <ul className="divide-y">
              {files.length === 0 && <li className="py-6 text-center text-gray-500">Inbox boş</li>}
              {files.map(f => (
                <li key={f.filename} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.filename}</div>
                    <div className="text-xs text-gray-500">{new Date(f.mtime * 1000).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => handlePreviewPdf(f)} className="px-3 py-1">PDF Önizle</Button>
                    <Button onClick={() => handleDownloadXml(f)} className="px-3 py-1" variant='default'>XML İndir</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
