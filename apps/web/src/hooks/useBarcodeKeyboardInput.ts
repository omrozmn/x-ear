import { useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Sanitization helpers (ported from @x-ear/barcode-scanner-integration)
// ---------------------------------------------------------------------------

const DEFAULT_WHITELIST = /^[0-9A-Za-z._-]+$/;

function stripControlChars(input: string): string {
  // Strip non-printable ASCII control chars (0x00-0x1F, 0x7F) from start and end
  // eslint-disable-next-line no-control-regex
  return input.replace(/^[\x00-\x1F\x7F]+/, '').replace(/[\x00-\x1F\x7F]+$/, '');
}

function sanitizeBarcode(raw: string, whitelist: RegExp = DEFAULT_WHITELIST): string | null {
  const cleaned = stripControlChars(raw).trim();
  if (cleaned.length === 0) return null;
  if (!whitelist.test(cleaned)) return null;
  return cleaned;
}

// ---------------------------------------------------------------------------
// Hook options & types
// ---------------------------------------------------------------------------

interface UseBarcodeKeyboardInputOptions {
  onScan: (barcode: string) => void;
  onError?: (reason: string, raw: string) => void;
  enabled?: boolean;
  minLength?: number;
  /**
   * Max delay between keystrokes (ms) before the buffer resets.
   * Barcode scanners typically emit keystrokes at 10-40 ms intervals.
   */
  maxKeystrokeInterval?: number;
  captureWhileFocused?: boolean;
  /**
   * Duplicate scan suppression window (ms). Same barcode within this period is
   * silently dropped. Default 1500 ms.
   */
  deduplicationWindowMs?: number;
  /**
   * When true, only accept `event.isTrusted === true` events (i.e. real
   * hardware input). Protects against synthetic/injected scans.
   * Default true in production.
   */
  requireTrusted?: boolean;
  /**
   * When true, calls `preventDefault` and `stopImmediatePropagation` on
   * keydown events that belong to an active scan so the wedge input does not
   * leak into focused <input> elements. Default true.
   */
  preventWedge?: boolean;
  /** Custom whitelist regex for sanitization. */
  whitelist?: RegExp;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

/**
 * Detects USB barcode scanner input (keyboard wedge) using rapid-keystroke
 * heuristics, with sanitization, isTrusted validation, duplicate filtering,
 * and optional preventDefault during active scans.
 *
 * API is backward-compatible with the original useBarcodeKeyboardInput.
 */
export function useBarcodeKeyboardInput({
  onScan,
  onError,
  enabled = true,
  minLength = 4,
  maxKeystrokeInterval = 50,
  captureWhileFocused = false,
  deduplicationWindowMs = 1500,
  requireTrusted = true,
  preventWedge = true,
  whitelist,
}: UseBarcodeKeyboardInputOptions) {
  const bufferRef = useRef('');
  const lastKeystrokeRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Deduplication state
  const lastScanRef = useRef<{ value: string; time: number }>({ value: '', time: 0 });

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    lastKeystrokeRef.current = 0;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Security: reject synthetic / programmatic events in production
      if (requireTrusted && !e.isTrusted) return;

      // Skip if focused on input/textarea and captureWhileFocused is false
      if (!captureWhileFocused) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          return;
        }
      }

      const now =
        typeof e.timeStamp === 'number' && e.timeStamp > 0
          ? e.timeStamp
          : Date.now();

      const timeSinceLastKey =
        lastKeystrokeRef.current > 0 ? now - lastKeystrokeRef.current : 0;

      // --- Terminator key (Enter / Tab) ---
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (bufferRef.current.length > 0) {
          const raw = bufferRef.current;
          resetBuffer();

          if (raw.length < minLength) return;

          // Sanitize
          const sanitized = sanitizeBarcode(raw, whitelist);
          if (!sanitized) {
            onErrorRef.current?.('whitelist_rejected', raw);
            return;
          }

          // Duplicate filtering
          const lastScan = lastScanRef.current;
          if (
            deduplicationWindowMs > 0 &&
            sanitized === lastScan.value &&
            Date.now() - lastScan.time < deduplicationWindowMs
          ) {
            return;
          }
          lastScanRef.current = { value: sanitized, time: Date.now() };

          e.preventDefault();
          e.stopPropagation();
          onScanRef.current(sanitized);
        } else {
          resetBuffer();
        }
        return;
      }

      // Only single printable characters
      if (e.key.length !== 1) return;

      // If too much time passed, reset buffer (human typing speed)
      if (timeSinceLastKey > maxKeystrokeInterval && bufferRef.current.length > 0) {
        resetBuffer();
      }

      // Prevent wedge from leaking into focused inputs during active scan
      if (preventWedge && bufferRef.current.length > 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }

      bufferRef.current += e.key;
      lastKeystrokeRef.current = now;
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    enabled,
    minLength,
    maxKeystrokeInterval,
    captureWhileFocused,
    deduplicationWindowMs,
    requireTrusted,
    preventWedge,
    whitelist,
    resetBuffer,
  ]);
}
