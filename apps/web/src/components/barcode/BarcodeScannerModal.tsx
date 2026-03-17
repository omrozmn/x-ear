import React, { useState, useEffect, useId } from 'react';
import { Button, Modal } from '@x-ear/ui-web';
import { Camera, CameraOff, Keyboard, CheckCircle } from 'lucide-react';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { detectBarcodeFormat } from '../../utils/barcodeUtils';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  mode?: 'input' | 'lookup';
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  mode = 'input',
  title = 'Barkod Tara',
}) => {
  const uniqueId = useId();
  const elementId = `barcode-scanner-${uniqueId.replace(/:/g, '-')}`;
  const [manualInput, setManualInput] = useState('');
  const [scanStatus, setScanStatus] = useState<'scanning' | 'found' | 'error'>('scanning');
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleScanResult = (barcode: string) => {
    setScanStatus('found');
    const format = detectBarcodeFormat(barcode);
    setDetectedFormat(format);

    // Brief pause to show success state, then callback
    setTimeout(() => {
      onScan(barcode);
      if (mode === 'input') {
        handleClose();
      }
    }, 500);
  };

  const { isScanning, isLoading, startScanning, stopScanning } = useBarcodeScanner(handleScanResult);

  useEffect(() => {
    if (isOpen) {
      setScanStatus('scanning');
      setDetectedFormat(null);
      setCameraError(null);
      setManualInput('');

      // Delay to let modal DOM render
      const timer = setTimeout(async () => {
        try {
          await startScanning(elementId);
        } catch {
          setCameraError('Kamera erişimi sağlanamadı. Lütfen kamera izinlerini kontrol edin.');
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
      stopScanning();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim().length >= 4) {
      onScan(manualInput.trim());
      handleClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="md">
      <div className="space-y-4">
        {/* Scanner viewport */}
        <div className="relative bg-black rounded-xl overflow-hidden" style={{ minHeight: 280 }}>
          <div id={elementId} className="w-full" />

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center text-white">
                <Camera className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                <p className="text-sm">Kamera başlatılıyor...</p>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90">
              <div className="text-center text-white px-4">
                <CameraOff className="w-8 h-8 mx-auto mb-2 text-red-400" />
                <p className="text-sm text-red-300">{cameraError}</p>
              </div>
            </div>
          )}

          {/* Scan status overlay */}
          {scanStatus === 'found' && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-900/80">
              <div className="text-center text-white">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                <p className="text-lg font-medium">Barkod bulundu!</p>
                {detectedFormat && (
                  <p className="text-sm text-green-300 mt-1">Format: {detectedFormat}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between text-sm">
          <span className={`flex items-center gap-1.5 ${
            isScanning ? 'text-green-600' : 'text-muted-foreground'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isScanning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`} />
            {isScanning ? 'Barkod aranıyor...' : 'Kamera kapalı'}
          </span>
          {detectedFormat && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              {detectedFormat}
            </span>
          )}
        </div>

        {/* Manual input fallback */}
        <div className="border-t border-border pt-4">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                data-allow-raw="true"
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Barkodu manuel girin..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button
              type="submit"
              disabled={manualInput.trim().length < 4}
              className="px-4"
            >
              Onayla
            </Button>
          </form>
        </div>
      </div>
    </Modal>
  );
};
