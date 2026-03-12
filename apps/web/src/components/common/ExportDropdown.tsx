/**
 * ExportDropdown — shared component for exporting table data.
 *
 * Shows a dropdown with:
 *  1. "CSV (Standart)" — direct CSV download
 *  2. Template list from invoice-normalizer — transforms data through the
 *     normalizer service before download.
 *
 * Uses @x-ear/ui-web Button only; dropdown is custom (no external UI lib).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@x-ear/ui-web';
import { Download, ChevronDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { fetchTemplates, normalizeFile } from '@/services/invoiceNormalizer.service';
import type { NormalizerTemplate } from '@/services/invoiceNormalizer.service';
import toast from 'react-hot-toast';

interface ExportDropdownProps {
  /** Headers for the CSV export */
  headers: string[];
  /** Rows of data — each row is an array of string values matching headers */
  getRows: () => string[][];
  /** Base filename without extension (e.g. "alislar") */
  filename: string;
  /** Optional: variant for the trigger button */
  variant?: 'outline' | 'ghost';
  /** Optional: custom label */
  label?: string;
  /** Optional: compact mode for bulk toolbar */
  compact?: boolean;
  /** Optional: icon color class */
  iconClassName?: string;
  /** Optional: button className override */
  className?: string;
}

export function ExportDropdown({
  headers,
  getRows,
  filename,
  variant = 'outline',
  label = 'Dışa Aktar',
  compact = false,
  iconClassName,
  className,
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<NormalizerTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const loadTemplates = useCallback(async () => {
    if (templates.length > 0) return;
    setLoadingTemplates(true);
    try {
      const list = await fetchTemplates();
      setTemplates(list);
    } catch {
      // silently fail — standard CSV still works
    } finally {
      setLoadingTemplates(false);
    }
  }, [templates.length]);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) loadTemplates();
  };

  const buildCsvContent = (): string => {
    const rows = getRows();
    const escaped = rows.map((row) =>
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
    );
    return [headers.join(','), ...escaped].join('\n');
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.setAttribute('data-allow-raw', 'true');
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStandardExport = () => {
    const csv = buildCsvContent();
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const dateSuffix = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `${filename}_${dateSuffix}.csv`);
    toast.success('CSV dışa aktarıldı');
    setIsOpen(false);
  };

  const handleTemplateExport = async (template: NormalizerTemplate) => {
    setExportingId(template.id);
    try {
      const csv = buildCsvContent();
      const csvBlob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const file = new File([csvBlob], `${filename}.csv`, { type: 'text/csv' });

      const resultBlob = await normalizeFile(template.id, file);
      const dateSuffix = new Date().toISOString().slice(0, 10);
      downloadBlob(resultBlob, `${filename}_${template.name.replace(/\s+/g, '_')}_${dateSuffix}.csv`);
      toast.success(`${template.name} formatında dışa aktarıldı`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      toast.error(`Dışa aktarım hatası: ${msg}`);
    } finally {
      setExportingId(null);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button
        variant={variant}
        className={
          className ??
          (compact
            ? 'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-2xl transition-colors h-auto'
            : 'flex items-center gap-2')
        }
        onClick={handleToggle}
      >
        <Download className={`w-4 h-4 ${iconClassName ?? ''}`} />
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
          {/* Standard CSV */}
          <button
            data-allow-raw="true"
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            onClick={handleStandardExport}
          >
            <FileText className="w-4 h-4 text-gray-500 shrink-0" />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">CSV (Standart)</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Orijinal formatta indir
              </div>
            </div>
          </button>

          {/* Divider */}
          {(loadingTemplates || templates.length > 0) && (
            <div className="border-t border-gray-100 dark:border-gray-700" />
          )}

          {/* Template header */}
          {(loadingTemplates || templates.length > 0) && (
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Muhasebe Şablonları
            </div>
          )}

          {/* Loading state */}
          {loadingTemplates && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Şablonlar yükleniyor…
            </div>
          )}

          {/* Template list */}
          {!loadingTemplates &&
            templates.map((t) => (
              <button
                data-allow-raw="true"
                type="button"
                key={t.id}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50"
                disabled={exportingId !== null}
                onClick={() => handleTemplateExport(t)}
              >
                {exportingId === t.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-blue-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {t.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t.columnCount} kolon
                    {t.mappingCount > 0 && ` · ${t.mappingCount} mapping`}
                  </div>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
