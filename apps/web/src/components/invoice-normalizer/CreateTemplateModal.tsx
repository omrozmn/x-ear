import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { Modal, Input, Button } from '@x-ear/ui-web';
import { createTemplate } from '../../services/invoiceNormalizer.service';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTemplateModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return setError('Şablon adı gerekli');
    if (!file) return setError('Örnek çıktı dosyası yükleyin');
    setError('');
    setLoading(true);
    try {
      await createTemplate(name.trim(), description.trim(), file);
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Şablon oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Yeni Şablon Oluştur"
      size="md"
      showFooter={false}
    >
      <div className="space-y-4">
        <Input
          label="Şablon Adı *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ör: Luca Format, Zirve Muhasebe"
          error={!name.trim() && error ? error : undefined}
          fullWidth
        />

        <Input
          label="Açıklama"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="ör: Luca muhasebe sistemi uyumlu fatura formatı"
          fullWidth
        />

        {/* File upload — drag-drop zone requires custom markup */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Örnek Çıktı Dosyası *
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Hedef formatınıza uygun bir örnek CSV veya Excel dosyası yükleyin.
            Sistem kolon yapısını otomatik algılayacak.
          </p>
          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            className={`
              flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed
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
                <FileSpreadsheet className="w-8 h-8 text-success" />
                <span className="text-sm font-medium text-success">
                  {file.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB — Değiştirmek için tıklayın
                </span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  CSV veya Excel dosyası sürükleyin veya tıklayın
                </span>
              </>
            )}
            {/* Hidden file input for drag-drop — not a visible form element */}
            <input
              data-allow-raw="true"
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !name.trim() || !file}
            loading={loading}
          >
            Şablon Oluştur
          </Button>
        </div>
      </div>
    </Modal>
  );
}
