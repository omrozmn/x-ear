import { useState, useEffect, useCallback, useRef } from 'react';
import {
  labelApiService,
  type Template,
  type RenderRequest,
  type PrinterInfo,
} from '../services/label-api.service';
import {
  defaultBarcodeLabelTemplate,
  DEFAULT_LABEL_TEMPLATE_NAME,
} from '../utils/defaultLabelTemplate';
import { printBarcodeLabels } from '../utils/barcodeUtils';
import { useSector } from './useSector';
import type { InventoryItem } from '../types/inventory';

// ---------------------------------------------------------------------------
// Sector-to-default-template mapping (can be extended per-sector)
// ---------------------------------------------------------------------------

const SECTOR_DEFAULT_TEMPLATE: Record<string, string> = {
  hearing: DEFAULT_LABEL_TEMPLATE_NAME,
  pharmacy: DEFAULT_LABEL_TEMPLATE_NAME,
  hospital: DEFAULT_LABEL_TEMPLATE_NAME,
  hotel: DEFAULT_LABEL_TEMPLATE_NAME,
  beauty: DEFAULT_LABEL_TEMPLATE_NAME,
  general: DEFAULT_LABEL_TEMPLATE_NAME,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseLabelPrintReturn {
  /** Published templates available for printing. */
  templates: Template[];
  /** Available network printers. */
  printers: PrinterInfo[];
  /** Whether the label service is reachable. */
  serviceAvailable: boolean;
  /** Loading state while fetching templates. */
  loading: boolean;
  /** Error message if something went wrong. */
  error: string | null;
  /** Render a specific template with arbitrary data, then open a print window. */
  printLabel: (templateId: string, data: Record<string, unknown>) => Promise<void>;
  /** Print to a specific network printer via the label service. */
  printToDevice: (templateId: string, printerId: string, data: Record<string, unknown>, copies?: number) => Promise<void>;
  /** Convenience: print a barcode label for an inventory item using defaults. */
  printBarcodeLabel: (item: InventoryItem) => Promise<void>;
  /** Re-fetch templates from the service. */
  refresh: () => Promise<void>;
}

export function useLabelPrint(): UseLabelPrintReturn {
  const { sector } = useSector();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [serviceAvailable, setServiceAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable ref to the default template id once resolved
  const defaultTemplateIdRef = useRef<string | null>(null);

  // ------------------------------------------------------------------
  // Fetch templates (and ensure a default one exists)
  // ------------------------------------------------------------------

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const isUp = await labelApiService.healthCheck();
      setServiceAvailable(isUp);

      if (!isUp) {
        setTemplates([]);
        setLoading(false);
        return;
      }

      let all = await labelApiService.listTemplates();

      // Auto-seed a default template if none exist
      if (all.length === 0) {
        const created = await labelApiService.createTemplate(defaultBarcodeLabelTemplate);
        await labelApiService.publishTemplate(created.id);
        all = await labelApiService.listTemplates();
      }

      const published = all.filter((t) => t.status === 'published');
      setTemplates(published);

      // Fetch available printers
      try {
        const printerList = await labelApiService.listPrinters();
        setPrinters(printerList);
      } catch {
        setPrinters([]);
      }

      // Resolve default template for the current sector
      const sectorName = SECTOR_DEFAULT_TEMPLATE[sector] ?? DEFAULT_LABEL_TEMPLATE_NAME;
      const match = published.find((t) => t.name === sectorName);
      defaultTemplateIdRef.current = match?.id ?? published[0]?.id ?? null;
    } catch (err) {
      setServiceAvailable(false);
      setError(err instanceof Error ? err.message : 'Etiket servisi ile baglanti kurulamadi');
      setTemplates([]);
      setPrinters([]);
    } finally {
      setLoading(false);
    }
  }, [sector]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  // ------------------------------------------------------------------
  // Print helpers
  // ------------------------------------------------------------------

  /** Open a new print window showing the rendered SVG. */
  const openPrintWindow = useCallback((svgContent: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Etiket Yazdir</title>
  <style>
    body { margin: 0; padding: 20px; display: flex; flex-wrap: wrap; gap: 10px; }
    .label-item { page-break-inside: avoid; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="label-item">${svgContent}</div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }, []);

  /** Render a template with data and open the print dialog. */
  const printLabel = useCallback(
    async (templateId: string, data: Record<string, unknown>) => {
      try {
        const svg = await labelApiService.renderTemplate({
          templateId,
          data,
        } as RenderRequest);
        openPrintWindow(svg);
      } catch (err) {
        console.error('[useLabelPrint] render failed:', err);
        throw err;
      }
    },
    [openPrintWindow],
  );

  /** Print to a specific network printer via the label service. */
  const printToDevice = useCallback(
    async (templateId: string, printerId: string, data: Record<string, unknown>, copies?: number) => {
      try {
        await labelApiService.submitPrintJob(templateId, printerId, data, copies);
      } catch (err) {
        console.error('[useLabelPrint] printToDevice failed:', err);
        throw err;
      }
    },
    [],
  );

  /** Print a barcode label for an inventory item. Falls back to legacy printBarcodeLabels. */
  const printBarcodeLabel = useCallback(
    async (item: InventoryItem) => {
      // Fallback if label service is not available
      if (!serviceAvailable || !defaultTemplateIdRef.current) {
        printBarcodeLabels([item]);
        return;
      }

      const data: Record<string, unknown> = {
        name: item.name,
        brand: item.brand,
        model: item.model ?? '',
        barcode: item.barcode ?? '',
        price: item.price != null ? `${item.price} TL` : '',
        stockCode: item.stockCode ?? '',
      };

      try {
        await printLabel(defaultTemplateIdRef.current, data);
      } catch {
        // Fallback to legacy on failure
        printBarcodeLabels([item]);
      }
    },
    [serviceAvailable, printLabel],
  );

  return {
    templates,
    printers,
    serviceAvailable,
    loading,
    error,
    printLabel,
    printToDevice,
    printBarcodeLabel,
    refresh: fetchTemplates,
  };
}
