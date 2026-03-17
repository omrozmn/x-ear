import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Button } from '@x-ear/ui-web';
import {
  normalizeFile,
  fetchHistory,
  type NormalizationHistory,
} from '../../services/invoiceNormalizer.service';

interface Props {
  templateId: string;
  onClose: () => void;
}

export function NormalizeModal({ templateId, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['normalizer-history', templateId],
    queryFn: () => fetchHistory(templateId),
  });

  const handleNormalize = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const blob = await normalizeFile(templateId, file);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `normalized_${file.name.replace(/\.[^.]+$/, '')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Dosya normalize edildi ve indiriliyor');
      setFile(null);
      refetchHistory();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Normalizasyon başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Dosya Normalize Et"
      size="md"
      showFooter={false}
    >
      <div className="space-y-4">
        {/* Upload zone — custom drag-drop */}
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          className={`
            flex flex-col items-center gap-2 p-8 rounded-xl border-2 border-dashed
            cursor-pointer transition-all duration-200
            ${dragActive
              ? 'border-blue-400 bg-primary/10'
              : file
                ? 'border-green-300 bg-success/10/50'
                : 'border-border hover:border-blue-400'}
          `}
        >
          {file ? (
            <>
              <FileSpreadsheet className="w-10 h-10 text-success" />
              <span className="text-sm font-medium text-success">
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Normalize edilecek fatura dosyasını sürükleyin
              </span>
              <span className="text-xs text-muted-foreground">CSV veya Excel</span>
            </>
          )}
          <input
            data-allow-raw="true"
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
          />
        </div>

        <Button
          variant="primary"
          fullWidth
          onClick={handleNormalize}
          disabled={!file || loading}
          loading={loading}
          icon={!loading ? <Download className="w-4 h-4" /> : undefined}
        >
          {loading ? 'Normalize ediliyor...' : 'Normalize Et ve İndir'}
        </Button>

        {/* History */}
        {history.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
              Son Normalizasyonlar
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {history.slice(0, 5).map((h: NormalizationHistory) => (
                <div
                  key={h.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg
                    bg-gray-50 dark:bg-gray-700/50 text-xs"
                >
                  {h.status === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                  )}
                  <span className="text-foreground truncate flex-1">
                    {h.inputFilename}
                  </span>
                  <span className="text-muted-foreground shrink-0">{h.rowCount} satır</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
