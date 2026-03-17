import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBarcodeKeyboardInput } from '../useBarcodeKeyboardInput';

describe('useBarcodeKeyboardInput', () => {
  let onScan: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onScan = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function simulateScannerInput(text: string) {
    // Simulate rapid keystrokes (< 50ms apart) like a USB scanner
    for (const char of text) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      vi.advanceTimersByTime(10); // 10ms between keystrokes (scanner speed)
    }
    // End with Enter
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }

  it('should call onScan when rapid keystrokes + Enter detected', () => {
    renderHook(() => useBarcodeKeyboardInput({ onScan, requireTrusted: false }));

    simulateScannerInput('4006381333931');

    expect(onScan).toHaveBeenCalledWith('4006381333931');
    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it('should not trigger for short inputs (< 4 chars)', () => {
    renderHook(() => useBarcodeKeyboardInput({ onScan, requireTrusted: false }));

    simulateScannerInput('AB');

    expect(onScan).not.toHaveBeenCalled();
  });

  it('should not trigger when disabled', () => {
    renderHook(() => useBarcodeKeyboardInput({ onScan, enabled: false }));

    simulateScannerInput('4006381333931');

    expect(onScan).not.toHaveBeenCalled();
  });

  it('should reset buffer when keystrokes are too slow (human typing)', () => {
    renderHook(() => useBarcodeKeyboardInput({ onScan, requireTrusted: false }));

    // Type slowly like a human
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
    vi.advanceTimersByTime(200); // 200ms - too slow for scanner
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
    vi.advanceTimersByTime(200);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    vi.advanceTimersByTime(200);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }));
    vi.advanceTimersByTime(200);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '5', bubbles: true }));
    vi.advanceTimersByTime(10);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    // Only last rapid chars should count (not enough)
    expect(onScan).not.toHaveBeenCalled();
  });

  it('should respect custom minLength', () => {
    renderHook(() => useBarcodeKeyboardInput({ onScan, minLength: 8, requireTrusted: false }));

    simulateScannerInput('12345'); // 5 chars, less than minLength=8

    expect(onScan).not.toHaveBeenCalled();

    simulateScannerInput('12345678'); // 8 chars, meets minLength

    expect(onScan).toHaveBeenCalledWith('12345678');
  });
});
