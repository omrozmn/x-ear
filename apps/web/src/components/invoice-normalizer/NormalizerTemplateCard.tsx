import {
  FileSpreadsheet,
  Upload,
  Settings,
  Trash2,
  Clock,
  Columns,
  History,
} from 'lucide-react';
import { Button, Card } from '@x-ear/ui-web';
import type { NormalizerTemplate } from '../../services/invoiceNormalizer.service';

interface Props {
  template: NormalizerTemplate;
  onNormalize: () => void;
  onMapping: () => void;
  onDelete: () => void;
}

export function NormalizerTemplateCard({ template, onNormalize, onMapping, onDelete }: Props) {
  const lastUsedText = template.lastUsed
    ? formatRelativeTime(template.lastUsed)
    : 'Henüz kullanılmadı';

  return (
    <Card variant="outlined" padding="none" className="flex flex-col">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {template.name}
              </h3>
              {template.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {template.description}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            title="Şablonu sil"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Columns className="w-3.5 h-3.5" />
            {template.columnCount} kolon
          </span>
          <span className="flex items-center gap-1">
            <Settings className="w-3.5 h-3.5" />
            {template.mappingCount} mapping
          </span>
          <span className="flex items-center gap-1">
            <History className="w-3.5 h-3.5" />
            {template.normalizationCount}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {lastUsedText}
        </p>
      </div>

      {/* Actions */}
      <div className="mt-auto border-t border-border/50 p-3 flex gap-2">
        <Button
          variant="primary"
          size="sm"
          fullWidth
          icon={<Upload className="w-3.5 h-3.5" />}
          onClick={onNormalize}
        >
          Dosya Yükle
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={<Settings className="w-3.5 h-3.5" />}
          onClick={onMapping}
        >
          Mapping
        </Button>
      </div>
    </Card>
  );
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'Z');
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dk önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    return date.toLocaleDateString('tr-TR');
  } catch {
    return dateStr;
  }
}
