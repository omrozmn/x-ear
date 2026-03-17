import React, { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Button, Modal } from '@x-ear/ui-web';
import { Printer, RefreshCw } from 'lucide-react';
import { useLabelPrint } from '../../hooks/useLabelPrint';
import type { InventoryItem } from '../../types/inventory';
import type { Template } from '../../services/label-api.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LabelPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Partial<InventoryItem>;
}

interface EditableFields {
  name: string;
  brand: string;
  model: string;
  barcode: string;
  price: string;
  stockCode: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const LabelPreviewModal: React.FC<LabelPreviewModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const { templates, serviceAvailable, printLabel } = useLabelPrint();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [svgPreview, setSvgPreview] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [fields, setFields] = useState<EditableFields>({
    name: '',
    brand: '',
    model: '',
    barcode: '',
    price: '',
    stockCode: '',
  });

  // Initialise fields when modal opens or item changes
  useEffect(() => {
    if (isOpen && item) {
      setFields({
        name: item.name ?? '',
        brand: item.brand ?? '',
        model: item.model ?? '',
        barcode: item.barcode ?? '',
        price: item.price != null ? String(item.price) : '',
        stockCode: item.stockCode ?? '',
      });
      setSvgPreview('');
      setPreviewError(null);
    }
  }, [isOpen, item]);

  // Default to first template
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  // ------------------------------------------------------------------
  // Preview
  // ------------------------------------------------------------------

  const loadPreview = useCallback(async () => {
    if (!selectedTemplateId || !serviceAvailable) return;

    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const { renderTemplate } = await import('../../services/label-api.service');
      const svg = await renderTemplate({
        templateId: selectedTemplateId,
        data: {
          ...fields,
          price: fields.price ? `${fields.price} TL` : '',
        },
      });
      setSvgPreview(svg);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Onizleme yuklenemedi');
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedTemplateId, fields, serviceAvailable]);

  // Load preview when template or fields change (debounced via user action)
  useEffect(() => {
    if (isOpen && selectedTemplateId && serviceAvailable) {
      void loadPreview();
    }
  }, [isOpen, selectedTemplateId, serviceAvailable, loadPreview]);

  // ------------------------------------------------------------------
  // Print
  // ------------------------------------------------------------------

  const handlePrint = useCallback(async () => {
    if (!selectedTemplateId) return;
    try {
      await printLabel(selectedTemplateId, {
        ...fields,
        price: fields.price ? `${fields.price} TL` : '',
      });
    } catch {
      // printLabel already logs errors
    }
  }, [selectedTemplateId, fields, printLabel]);

  // ------------------------------------------------------------------
  // Field change handler
  // ------------------------------------------------------------------

  const handleFieldChange = useCallback(
    (key: keyof EditableFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
    },
    [],
  );

  // ------------------------------------------------------------------
  // Template selection change
  // ------------------------------------------------------------------

  const handleTemplateChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedTemplateId(e.target.value);
    },
    [],
  );

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const fieldLabels: Record<keyof EditableFields, string> = {
    name: 'Urun Adi',
    brand: 'Marka',
    model: 'Model',
    barcode: 'Barkod',
    price: 'Fiyat',
    stockCode: 'Stok Kodu',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Etiket Onizleme" size="lg" showFooter={false}>
      <div className="space-y-4">
        {/* Template selector */}
        {templates.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Sablon
            </label>
            <select
              data-allow-raw="true"
              value={selectedTemplateId}
              onChange={handleTemplateChange}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {templates.map((t: Template) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* SVG preview */}
        <div className="border border-border rounded-xl p-4 bg-white flex items-center justify-center min-h-[140px]">
          {previewLoading && (
            <div className="text-muted-foreground text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Onizleme yukleniyor...
            </div>
          )}
          {previewError && (
            <div className="text-red-500 text-sm">{previewError}</div>
          )}
          {!previewLoading && !previewError && svgPreview && (
            <div
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svgPreview, { USE_PROFILES: { svg: true } }) }}
              className="label-preview"
            />
          )}
          {!previewLoading && !previewError && !svgPreview && (
            <div className="text-muted-foreground text-sm">
              Onizleme icin bir sablon secin
            </div>
          )}
        </div>

        {/* Editable fields */}
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(fieldLabels) as (keyof EditableFields)[]).map((key) => (
            <div key={key}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {fieldLabels[key]}
              </label>
              <input
                data-allow-raw="true"
                type="text"
                value={fields[key]}
                onChange={handleFieldChange(key)}
                className="w-full px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <Button
            variant="outline"
            onClick={loadPreview}
            disabled={previewLoading || !selectedTemplateId}
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Yenile
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Kapat
            </Button>
            <Button
              onClick={handlePrint}
              disabled={!selectedTemplateId || !serviceAvailable}
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Yazdir
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
