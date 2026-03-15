import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Upload, ArrowRight, Sparkles, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, Button } from '@x-ear/ui-web';
import {
  fetchMappings,
  suggestMapping,
  saveMappings,
  type MappingSuggestion,
  type MappingRule,
} from '../../services/invoiceNormalizer.service';

interface Props {
  templateId: string;
  onClose: () => void;
}

export function MappingModal({ templateId, onClose }: Props) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const { data: currentMappings = [] } = useQuery({
    queryKey: ['normalizer-mappings', templateId],
    queryFn: () => fetchMappings(templateId),
  });

  const handleSuggest = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await suggestMapping(templateId, file);
      setSuggestions(result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Mapping önerisi alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (suggestions.length === 0) return;
    setLoading(true);
    try {
      const rules = suggestions.map((s) => ({
        sourcePattern: s.sourceColumn,
        targetColumn: s.targetColumn,
        matchType: s.matchType,
        transformType: 'none',
        transformConfig: {},
      }));
      await saveMappings(templateId, rules);
      queryClient.invalidateQueries({ queryKey: ['normalizer-mappings', templateId] });
      queryClient.invalidateQueries({ queryKey: ['normalizer-templates'] });
      toast.success('Mapping kuralları kaydedildi');
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Mapping kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  const confidenceColor = (c: number) => {
    if (c >= 0.9) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    if (c >= 0.7) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30';
  };

  const customFooter = suggestions.length > 0 ? (
    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={() => setSuggestions([])}>
        İptal
      </Button>
      <Button
        variant="success"
        onClick={handleSave}
        disabled={loading}
        loading={loading}
        icon={<Check className="w-4 h-4" />}
      >
        Onayla ve Kaydet
      </Button>
    </div>
  ) : undefined;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Kolon Eşleştirme"
      size="lg"
      showFooter={!!customFooter}
      customFooter={customFooter}
    >
      <div className="space-y-4">
        {/* Current mappings */}
        {currentMappings.length > 0 && suggestions.length === 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
              Mevcut Mapping Kuralları
            </h4>
            <div className="space-y-1.5">
              {currentMappings.map((m: MappingRule) => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm">
                  <span className="text-gray-600 dark:text-gray-300 font-mono">{m.sourcePattern}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-900 dark:text-white font-medium">{m.targetColumn}</span>
                  {m.isConfirmed && <Check className="w-3.5 h-3.5 text-green-500 ml-auto" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload for new suggestion */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
            Yeni Mapping Önerisi Al
          </h4>
          <p className="text-xs text-gray-400 mb-3">
            Normalize etmek istediğiniz dosyayı yükleyin. AI kolon isimlerini analiz edip eşleştirme önerecek.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              fullWidth
              icon={<Upload className="w-4 h-4" />}
              onClick={() => inputRef.current?.click()}
            >
              {file ? file.name : 'Kaynak dosya seçin'}
            </Button>
            <Button
              variant="primary"
              onClick={handleSuggest}
              disabled={!file || loading}
              loading={loading}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Öner
            </Button>
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

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
              AI Önerileri
            </h4>
            <div className="space-y-1.5">
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-purple-50/50 dark:bg-purple-900/10 text-sm">
                  <span className="text-gray-600 dark:text-gray-300 font-mono flex-1">
                    {s.sourceColumn}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="text-gray-900 dark:text-white font-medium flex-1">
                    {s.targetColumn}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${confidenceColor(s.confidence)}`}>
                    {Math.round(s.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
