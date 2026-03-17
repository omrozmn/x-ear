import { useState, useRef, useCallback, useEffect } from 'react';
import { useSector } from './useSector';
import type { SectorCode } from '@x-ear/ui-web';

type Html5QrcodeModule = typeof import('html5-qrcode');

interface UseBarcodeScanner {
  isScanning: boolean;
  isLoading: boolean;
  lastResult: string | null;
  startScanning: (elementId: string) => Promise<void>;
  stopScanning: () => Promise<void>;
}

/**
 * Html5QrcodeSupportedFormats enum values (from html5-qrcode):
 *   QR_CODE=0, AZTEC=1, CODABAR=2, CODE_39=3, CODE_93=4,
 *   CODE_128=5, DATA_MATRIX=6, MAXICODE=7, ITF=8, EAN_13=9,
 *   EAN_8=10, PDF_417=11, RSS_14=12, RSS_EXPANDED=13,
 *   UPC_A=14, UPC_E=15, UPC_EAN_EXTENSION=16
 *
 * Sector format mapping based on industry standards:
 *
 * - hearing:  GS1 EAN-13 (perakende cihaz), EAN-8 (aksesuar/pil), CODE_128 (tedarik zinciri)
 *             SGK barkod kaydı EAN-13 tabanlı, aksesuar ürünleri EAN-8 kullanabilir.
 *
 * - pharmacy: GS1 DataMatrix (İTS zorunlu - İlaç Takip Sistemi, GTIN+SN+expiry+lot),
 *             EAN-13 (perakende kutu), GS1-128/CODE_128 (koli/palet), QR_CODE (e-reçete referans)
 *             Türkiye'de 2010'dan beri tüm ilaçlarda DataMatrix zorunlu.
 *
 * - optic:    EAN-13 (perakende gözlük/lens), EAN-8 (aksesuar), CODE_128 (tedarik),
 *             QR_CODE (lens parametreleri/dijital pasaport)
 *
 * - medical:  GS1 DataMatrix (ÜTS/UDI zorunlu - Ürün Takip Sistemi, 14 haneli GTIN),
 *             GS1-128/CODE_128 (koli seviye), EAN-13 (perakende), QR_CODE (UDI carrier)
 *             Türkiye TİTCK ÜTS sistemi GS1 DataMatrix + 14 haneli GTIN zorunlu kılar.
 *
 * - hospital: GS1 DataMatrix (UDI zorunlu, AB 2026-Q2 deadline), CODE_128 (GS1-128 envanter),
 *             EAN-13 (perakende sarf malzeme), QR_CODE (hasta/varlık takip)
 *             AB MDR/IVDR UDI uyumu için DataMatrix birincil carrier.
 *
 * - hotel:    QR_CODE (birincil - varlık/envanter takip, PMS entegrasyon),
 *             CODE_128 (envanter etiket), EAN-13 (satınalma/perakende ürün)
 *             Otelcilik sektöründe QR code birincil standarttır (varlık takip, oda servis).
 *
 * - beauty:   EAN-13 (perakende zorunlu - CPNP/kozmetik), EAN-8 (küçük ürün),
 *             UPC-A (uluslararası pazar), CODE_128 (tedarik/lot takip)
 *             AB Kozmetik Regülasyonu (EC 1223/2009) EAN-13 tabanlı GTIN zorunlu kılar.
 *
 * - general:  EAN-13, EAN-8, CODE_128, QR_CODE (geniş uyumluluk)
 */
const SECTOR_FORMATS: Record<SectorCode, number[]> = {
  hearing:  [9, 10, 5],                // EAN_13, EAN_8, CODE_128
  pharmacy: [6, 9, 5, 0],              // DATA_MATRIX, EAN_13, CODE_128, QR_CODE
  optic:    [9, 10, 5, 0],             // EAN_13, EAN_8, CODE_128, QR_CODE
  medical:  [6, 5, 9, 0],              // DATA_MATRIX, CODE_128, EAN_13, QR_CODE
  hospital: [6, 5, 9, 0],              // DATA_MATRIX, CODE_128, EAN_13, QR_CODE
  hotel:    [0, 5, 9],                 // QR_CODE, CODE_128, EAN_13
  beauty:   [9, 10, 14, 5],            // EAN_13, EAN_8, UPC_A, CODE_128
  general:  [9, 10, 5, 0],             // EAN_13, EAN_8, CODE_128, QR_CODE
};

const DEBOUNCE_MS = 1500;

export function useBarcodeScanner(
  onResult: (barcode: string) => void
): UseBarcodeScanner {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const scannerRef = useRef<InstanceType<Html5QrcodeModule['Html5Qrcode']> | null>(null);
  const lastScanRef = useRef<{ value: string; time: number }>({ value: '', time: 0 });
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const { sector } = useSector();

  const stopScanning = useCallback(async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        // State 2 = SCANNING
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.warn('Error stopping scanner:', err);
    }
    setIsScanning(false);
  }, []);

  const startScanning = useCallback(async (elementId: string) => {
    if (scannerRef.current) {
      await stopScanning();
    }

    setIsLoading(true);

    try {
      // Lazy-load html5-qrcode
      const { Html5Qrcode } = await import('html5-qrcode');

      const formats = SECTOR_FORMATS[sector as SectorCode] || SECTOR_FORMATS.general;
      const scanner = new Html5Qrcode(elementId, {
        formatsToSupport: formats,
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        (decodedText) => {
          const now = Date.now();
          const last = lastScanRef.current;

          // Debounce: skip if same barcode scanned within DEBOUNCE_MS
          if (decodedText === last.value && now - last.time < DEBOUNCE_MS) {
            return;
          }

          lastScanRef.current = { value: decodedText, time: now };
          setLastResult(decodedText);
          onResultRef.current(decodedText);
        },
        () => {
          // Scan failure - ignore (continuous scanning)
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Failed to start barcode scanner:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sector, stopScanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        stopScanning();
      }
    };
  }, [stopScanning]);

  return {
    isScanning,
    isLoading,
    lastResult,
    startScanning,
    stopScanning,
  };
}
