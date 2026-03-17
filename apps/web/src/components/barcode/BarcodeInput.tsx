import React, { useState, useCallback } from 'react';
import { Input } from '@x-ear/ui-web';
import { ScanLine, RefreshCw, Printer, ShieldCheck, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { LabelPreviewModal } from './LabelPreviewModal';
import { useBarcodeKeyboardInput } from '../../hooks/useBarcodeKeyboardInput';
import { useLabelPrint } from '../../hooks/useLabelPrint';
import { generateBarcode, printSingleBarcodeLabel } from '../../utils/barcodeUtils';
import { validateBarcodeRemote, generateBarcodeImage } from '../../utils/barcodeUtils';
import type { InventoryItem } from '../../types/inventory';

interface BarcodeInputProps {
  value: string;
  onChange: (value: string) => void;
  showScanButton?: boolean;
  showGenerateButton?: boolean;
  showPrintButton?: boolean;
  showValidateButton?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Item data for print label (optional) */
  item?: Partial<InventoryItem>;
  /** When true, generating a barcode also fetches a proper image from the service */
  generateImage?: boolean;
}

type ValidationStatus = 'idle' | 'loading' | 'valid' | 'invalid';

export const BarcodeInput: React.FC<BarcodeInputProps> = ({
  value,
  onChange,
  showScanButton = true,
  showGenerateButton = false,
  showPrintButton = false,
  showValidateButton = false,
  placeholder = 'Barkod numarasını girin',
  className = '',
  disabled = false,
  item,
  generateImage = false,
}) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLabelPreviewOpen, setIsLabelPreviewOpen] = useState(false);
  const { serviceAvailable } = useLabelPrint();
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [barcodeImageUrl, setBarcodeImageUrl] = useState<string | null>(null);

  const handleScan = useCallback((barcode: string) => {
    onChange(barcode);
    setIsScannerOpen(false);
    setValidationStatus('idle');
    setValidationMessage(null);
  }, [onChange]);

  const handleGenerate = useCallback(async () => {
    const barcode = generateBarcode();
    onChange(barcode);
    setValidationStatus('idle');
    setValidationMessage(null);

    if (generateImage) {
      try {
        const url = await generateBarcodeImage(barcode, 'code128', 'svg');
        setBarcodeImageUrl(url);
      } catch {
        // Service not available - silent fallback
      }
    }
  }, [onChange, generateImage]);

  const handlePrint = useCallback(() => {
    if (!value || !item) return;

    if (serviceAvailable) {
      setIsLabelPreviewOpen(true);
    } else {
      printSingleBarcodeLabel({ ...item, barcode: value } as InventoryItem);
    }
  }, [value, item, serviceAvailable]);

  const handleValidate = useCallback(async () => {
    if (!value || value.length < 4) {
      setValidationStatus('invalid');
      setValidationMessage('Barkod en az 4 karakter olmalı');
      return;
    }

    setValidationStatus('loading');
    setValidationMessage(null);

    try {
      const result = await validateBarcodeRemote(value);
      if (result.valid) {
        setValidationStatus('valid');
        setValidationMessage(
          result.warnings.length > 0
            ? result.warnings.join(', ')
            : 'Barkod geçerli',
        );
      } else {
        setValidationStatus('invalid');
        setValidationMessage(
          result.errors.length > 0
            ? result.errors.join(', ')
            : 'Barkod geçersiz',
        );
      }
    } catch {
      setValidationStatus('invalid');
      setValidationMessage('Doğrulama servisi erişilemedi');
    }
  }, [value]);

  // USB scanner support - only when not focused on this input
  useBarcodeKeyboardInput({
    onScan: handleScan,
    enabled: !disabled,
  });

  return (
    <>
      <div className={`flex items-center gap-1.5 ${className}`}>
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setValidationStatus('idle');
            setValidationMessage(null);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring font-mono"
        />

        {/* Validation status indicator */}
        {validationStatus === 'valid' && (
          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
        )}
        {validationStatus === 'invalid' && (
          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
        )}
        {validationStatus === 'loading' && (
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
        )}

        {showValidateButton && (
          <button
            data-allow-raw="true"
            type="button"
            onClick={handleValidate}
            disabled={disabled || !value}
            className="p-2 border border-border rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
            title="Barkodu doğrula"
          >
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

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

      {/* Validation message */}
      {validationMessage && (
        <p
          className={`mt-1 text-xs ${
            validationStatus === 'valid' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {validationMessage}
        </p>
      )}

      {/* Barcode image preview from service */}
      {barcodeImageUrl && (
        <div className="mt-2">
          <img
            src={barcodeImageUrl}
            alt="Barkod"
            className="h-12 border border-border rounded p-1"
          />
        </div>
      )}

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScan}
        mode="input"
      />

      {item && (
        <LabelPreviewModal
          isOpen={isLabelPreviewOpen}
          onClose={() => setIsLabelPreviewOpen(false)}
          item={{ ...item, barcode: value }}
        />
      )}
    </>
  );
};
