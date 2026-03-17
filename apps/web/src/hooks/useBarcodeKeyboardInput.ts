import { useEffect, useRef, useCallback } from 'react';

interface UseBarcodeKeyboardInputOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minLength?: number;
  maxKeystrokeInterval?: number;
  captureWhileFocused?: boolean;
}

/**
 * Detects USB barcode scanner input (rapid keystrokes + Enter).
 * Scanners type characters much faster than humans (~10-50ms between keys).
 */
export function useBarcodeKeyboardInput({
  onScan,
  enabled = true,
  minLength = 4,
  maxKeystrokeInterval = 50,
  captureWhileFocused = false,
}: UseBarcodeKeyboardInputOptions) {
  const bufferRef = useRef('');
  const lastKeystrokeRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if focused on input/textarea and captureWhileFocused is false
      if (!captureWhileFocused) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          return;
        }
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeystrokeRef.current;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          e.preventDefault();
          e.stopPropagation();
          onScanRef.current(bufferRef.current);
        }
        resetBuffer();
        lastKeystrokeRef.current = 0;
        return;
      }

      // Only single printable characters
      if (e.key.length !== 1) return;

      // If too much time passed, reset buffer
      if (timeSinceLastKey > maxKeystrokeInterval && bufferRef.current.length > 0) {
        resetBuffer();
      }

      bufferRef.current += e.key;
      lastKeystrokeRef.current = now;
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, minLength, maxKeystrokeInterval, captureWhileFocused, resetBuffer]);
}
