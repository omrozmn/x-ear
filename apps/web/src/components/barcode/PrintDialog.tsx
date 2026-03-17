import React, { useState, useEffect, useCallback } from 'react';
import {
  Printer,
  Wifi,
  WifiOff,
  Monitor,
  X,
  Loader2,
} from 'lucide-react';
import {
  listPrinters,
  submitPrintJob,
  type PrinterInfo,
} from '../../services/label-api.service';
import { listTemplates, type Template } from '../../services/label-api.service';

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Data to be sent to the template for rendering */
  data: Record<string, unknown>;
  /** Callback for browser-based printing (fallback) */
  onBrowserPrint: () => void;
  /** Pre-selected template ID (optional) */
  defaultTemplateId?: string;
}

export const PrintDialog: React.FC<PrintDialogProps> = ({
  isOpen,
  onClose,
  data,
  onBrowserPrint,
  defaultTemplateId,
}) => {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultTemplateId ?? '');
  const [copies, setCopies] = useState(1);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    Promise.all([
      listPrinters().catch(() => [] as PrinterInfo[]),
      listTemplates().catch(() => [] as Template[]),
    ])
      .then(([printerList, templateList]) => {
        setPrinters(printerList);
        const published = templateList.filter((t) => t.status === 'published');
        setTemplates(published);
        if (!selectedTemplateId && published.length > 0) {
          setSelectedTemplateId(defaultTemplateId ?? published[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen, defaultTemplateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrint = useCallback(async () => {
    if (!selectedPrinterId) {
      // Browser print
      onBrowserPrint();
      onClose();
      return;
    }

    if (!selectedTemplateId) return;

    setPrinting(true);
    try {
      await submitPrintJob(selectedTemplateId, selectedPrinterId, data, copies);
      onClose();
    } catch (err) {
      console.error('[PrintDialog] Print failed:', err);
      // Fallback to browser print
      onBrowserPrint();
      onClose();
    } finally {
      setPrinting(false);
    }
  }, [selectedPrinterId, selectedTemplateId, data, copies, onBrowserPrint, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Yazdir
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Template Selector */}
            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sablon
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Printer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Yazici Sec
              </label>

              {/* Browser print option */}
              <button
                onClick={() => setSelectedPrinterId(null)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors mb-2 ${
                  selectedPrinterId === null
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Monitor className="w-5 h-5 text-blue-500" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Tarayici ile Yazdir
                  </div>
                  <div className="text-xs text-gray-500">
                    Tarayicinin yazdirma penceresini kullan
                  </div>
                </div>
              </button>

              {/* Network printers */}
              {printers.map((printer) => (
                <button
                  key={printer.id}
                  onClick={() => setSelectedPrinterId(printer.id)}
                  disabled={printer.status === 'offline'}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors mb-2 ${
                    selectedPrinterId === printer.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : printer.status === 'offline'
                      ? 'border-gray-200 dark:border-gray-600 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {printer.status === 'online' ? (
                    <Wifi className="w-5 h-5 text-green-500" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-red-500" />
                  )}
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {printer.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {printer.ipAddress}:{printer.port}
                    </div>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      printer.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Copies */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kopya Sayisi
              </label>
              <input
                type="number"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Math.min(100, Number(e.target.value))))}
                min={1}
                max={100}
                className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-mono"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            Iptal
          </button>
          <button
            onClick={handlePrint}
            disabled={printing || loading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {printing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            Yazdir
          </button>
        </div>
      </div>
    </div>
  );
};
