import React, { useState, useRef } from 'react';
import PdfPreviewModal from './PdfPreviewModal';

export const SgkMultiUpload: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFiles = (fList: FileList | null) => {
    if (!fList) return;
    const arr = Array.from(fList);
    const allowed = arr.filter(f => /image\/(png|jpeg|jpg|tiff|bmp)/i.test(f.type) || /\.(png|jpe?g|tiff?|bmp)$/i.test(f.name));
    setFiles(prev => [...prev, ...allowed].slice(0, 50));
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const upload = async () => {
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f, f.name));
      const res = await fetch('/api/sgk/upload', { method: 'POST', body: fd });
      const json = await res.json();
      setResults(json.files || []);
    } catch (e) {
      console.error('Upload failed', e);
      alert('Upload failed, check console');
    } finally {
      setUploading(false);
    }
  };

  const openPreview = (pdfPath?: string) => {
    if (!pdfPath) return;
    const url = pdfPath.startsWith('http') ? pdfPath : `${window.location.origin}/uploads/sgk/${encodeURIComponent(pdfPath)}`;
    setPreviewUrl(url);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed p-4 rounded">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => onFiles(e.target.files)}
        />
        <div className="mt-2 text-sm text-gray-600">Supported: png, jpg, jpeg, tiff, bmp. Max 50 files.</div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Files to upload ({files.length})</h4>
            <div className="space-x-2">
              <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => { setFiles([]); inputRef.current && (inputRef.current.value = ''); }}>Clear</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={upload} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {files.map((f, i) => (
              <div key={i} className="border rounded p-2 bg-white">
                <div className="text-sm font-medium truncate">{f.name}</div>
                <div className="text-xs text-gray-500">{(f.size/1024).toFixed(0)} KB</div>
                <div className="mt-2 flex space-x-2">
                  <button className="text-xs px-2 py-1 border rounded" onClick={() => removeFile(i)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="font-medium">Results</h4>
          {results.map((r, idx) => (
            <div key={idx} className="p-3 border rounded bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{r.fileName}</div>
                  <div className="text-sm text-gray-500">Status: {r.status}</div>
                </div>
                <div className="space-x-2">
                  {r.result && r.result.pdf_filename && (
                    <button className="px-2 py-1 bg-indigo-600 text-white rounded text-sm" onClick={() => openPreview(r.result.pdf_filename)}>Preview PDF</button>
                  )}
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-700">
                <div><strong>Patient:</strong> {r.result?.patient_info?.name || 'Unknown'}</div>
                <div><strong>TC partial:</strong> {r.result?.tc_partial || '-'}</div>
                <div><strong>Matched patient:</strong> {r.result?.matched_patient ? r.result.matched_patient.patient.fullName : 'No'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PdfPreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} pdfUrl={previewUrl} title="SGK PDF Preview" />
    </div>
  );
};

export default SgkMultiUpload;
