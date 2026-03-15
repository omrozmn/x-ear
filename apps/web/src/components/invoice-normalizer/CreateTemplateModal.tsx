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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Örnek Çıktı Dosyası *
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
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
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : file
                  ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'}
            `}
          >
            {file ? (
              <>
                <FileSpreadsheet className="w-8 h-8 text-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  {file.name}
                </span>
                <span className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB — Değiştirmek için tıklayın
                </span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
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
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
