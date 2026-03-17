import React, { useState, useCallback } from 'react';
import { Input } from '@x-ear/ui-web';
import { ScanLine, RefreshCw, Printer } from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { useBarcodeKeyboardInput } from '../../hooks/useBarcodeKeyboardInput';
import { generateBarcode, printSingleBarcodeLabel } from '../../utils/barcodeUtils';
import type { InventoryItem } from '../../types/inventory';

interface BarcodeInputProps {
  value: string;
  onChange: (value: string) => void;
  showScanButton?: boolean;
  showGenerateButton?: boolean;
  showPrintButton?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Item data for print label (optional) */
  item?: Partial<InventoryItem>;
}

export const BarcodeInput: React.FC<BarcodeInputProps> = ({
  value,
  onChange,
  showScanButton = true,
  showGenerateButton = false,
  showPrintButton = false,
  placeholder = 'Barkod numarasını girin',
  className = '',
  disabled = false,
  item,
}) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleScan = useCallback((barcode: string) => {
    onChange(barcode);
    setIsScannerOpen(false);
  }, [onChange]);

  const handleGenerate = useCallback(() => {
    onChange(generateBarcode());
  }, [onChange]);

  const handlePrint = useCallback(() => {
    if (value && item) {
      printSingleBarcodeLabel({ ...item, barcode: value } as InventoryItem);
    }
  }, [value, item]);

  // USB scanner support - only when not focused on this input
  useBarcodeKeyboardInput({
    onScan: handleScan,
    enabled: !disabled,
  });

  return (
    <>
      <div className={`flex gap-1.5 ${className}`}>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring font-mono"
        />

        {showScanButton && (
          <button
            data-allow-raw="true"
            type="button"
            onClick={() => setIsScannerOpen(true)}
            disabled={disabled}
            className="p-2 border border-border rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
            title="Kamera ile tara"
          >
            <ScanLine className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        {showGenerateButton && (
          <button
            data-allow-raw="true"
            type="button"
            onClick={handleGenerate}
            disabled={disabled}
            className="p-2 border border-border rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
            title="Otomatik barkod oluştur"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        {showPrintButton && value && (
          <button
            data-allow-raw="true"
            type="button"
            onClick={handlePrint}
            disabled={disabled || !value}
            className="p-2 border border-border rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
            title="Barkod etiketi yazdır"
          >
            <Printer className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScan}
        mode="input"
      />
    </>
  );
};
