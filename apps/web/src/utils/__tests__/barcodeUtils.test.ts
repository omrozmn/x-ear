import { describe, it, expect } from 'vitest';
import {
  generateBarcode,
  validateBarcode,
  detectBarcodeFormat,
  validateEAN13Checksum,
  validateEAN8Checksum,
  parseGS1DataMatrix,
  generateBarcodes,
} from '../barcodeUtils';

describe('barcodeUtils', () => {
  describe('generateBarcode', () => {
    it('should generate a 10-character numeric barcode', () => {
      const barcode = generateBarcode();
      expect(barcode).toHaveLength(10);
      expect(/^\d+$/.test(barcode)).toBe(true);
    });

    it('should generate unique barcodes', () => {
      const a = generateBarcode();
      const b = generateBarcode();
      expect(a).not.toBe(b);
    });
  });

  describe('validateBarcode', () => {
    it('should return true for empty/undefined barcode (optional field)', () => {
      expect(validateBarcode('')).toBe(true);
    });

    it('should accept EAN-13 barcodes', () => {
      expect(validateBarcode('4006381333931')).toBe(true);
    });

    it('should accept EAN-8 barcodes', () => {
      expect(validateBarcode('12345670')).toBe(true);
    });

    it('should accept alphanumeric barcodes (Code 128)', () => {
      expect(validateBarcode('ABC-123-XYZ')).toBe(true);
    });

    it('should accept short barcodes (min 4 chars)', () => {
      expect(validateBarcode('1234')).toBe(true);
    });

    it('should reject too short barcodes (< 4 chars)', () => {
      expect(validateBarcode('123')).toBe(false);
    });

    it('should reject too long standard barcodes (> 30 chars)', () => {
      expect(validateBarcode('A'.repeat(31))).toBe(false);
    });

    it('should reject barcodes with special characters', () => {
      expect(validateBarcode('ABC@#$%')).toBe(false);
    });

    it('should accept barcodes with dots, hyphens, underscores', () => {
      expect(validateBarcode('ABC.123-456_789')).toBe(true);
    });

    it('should accept GS1 DataMatrix strings (İTS/ÜTS format)', () => {
      // Typical İTS DataMatrix: AI(01)GTIN + AI(17)expiry + AI(10)lot + AI(21)serial
      const itsBarcode = '01086957032000341724063010ABC12321SN001';
      expect(validateBarcode(itsBarcode)).toBe(true);
    });

    it('should accept UPC-A barcodes (12 digit)', () => {
      expect(validateBarcode('012345678905')).toBe(true);
    });
  });

  describe('detectBarcodeFormat', () => {
    it('should return null for empty input', () => {
      expect(detectBarcodeFormat('')).toBeNull();
    });

    it('should detect EAN-13 (13-digit numeric)', () => {
      expect(detectBarcodeFormat('4006381333931')).toBe('EAN-13');
    });

    it('should detect EAN-8 (8-digit numeric)', () => {
      expect(detectBarcodeFormat('12345670')).toBe('EAN-8');
    });

    it('should detect UPC-A (12-digit numeric)', () => {
      expect(detectBarcodeFormat('012345678905')).toBe('UPC-A');
    });

    it('should detect GTIN-14 as CODE-128 (14-digit numeric)', () => {
      expect(detectBarcodeFormat('00012345678905')).toBe('CODE-128');
    });

    it('should detect GS1-DATAMATRIX (starts with AI 01, 16+ chars)', () => {
      expect(detectBarcodeFormat('01086957032000341724063010ABC123')).toBe('GS1-DATAMATRIX');
    });

    it('should detect CODE-39 for uppercase alphanumeric', () => {
      expect(detectBarcodeFormat('ABC-123')).toBe('CODE-39');
    });

    it('should detect CODE-128 for mixed case alphanumeric', () => {
      expect(detectBarcodeFormat('Abc123')).toBe('CODE-128');
    });

    it('should detect CODE-128 for other numeric lengths', () => {
      expect(detectBarcodeFormat('1234567890')).toBe('CODE-128');
    });
  });

  describe('validateEAN13Checksum', () => {
    it('should validate correct EAN-13 checksums', () => {
      expect(validateEAN13Checksum('4006381333931')).toBe(true);
      expect(validateEAN13Checksum('5901234123457')).toBe(true);
    });

    it('should validate Turkish GS1 prefix (868/869)', () => {
      // Turkish barcodes start with 868 or 869
      expect(validateEAN13Checksum('8690000000005')).toBe(true);
    });

    it('should reject invalid checksums', () => {
      expect(validateEAN13Checksum('4006381333932')).toBe(false);
      expect(validateEAN13Checksum('4000000000000')).toBe(false);
    });

    it('should reject non-13-digit inputs', () => {
      expect(validateEAN13Checksum('123456789')).toBe(false);
      expect(validateEAN13Checksum('12345678901234')).toBe(false);
    });

    it('should reject non-numeric inputs', () => {
      expect(validateEAN13Checksum('ABCDEFGHIJKLM')).toBe(false);
    });
  });

  describe('validateEAN8Checksum', () => {
    it('should validate correct EAN-8 checksums', () => {
      expect(validateEAN8Checksum('96385074')).toBe(true);
    });

    it('should reject invalid EAN-8 checksums', () => {
      expect(validateEAN8Checksum('96385075')).toBe(false);
    });

    it('should reject non-8-digit inputs', () => {
      expect(validateEAN8Checksum('1234567')).toBe(false);
      expect(validateEAN8Checksum('123456789')).toBe(false);
    });
  });

  describe('parseGS1DataMatrix', () => {
    it('should parse GTIN from AI (01)', () => {
      const result = parseGS1DataMatrix('01086957032000341724063010ABC12321SN001');
      expect(result.gtin).toBe('08695703200034');
    });

    it('should parse expiry date from AI (17)', () => {
      const result = parseGS1DataMatrix('01086957032000341724063010ABC12321SN001');
      expect(result.expiry).toBe('240630'); // YYMMDD
    });

    it('should parse lot/batch from AI (10)', () => {
      const result = parseGS1DataMatrix('01086957032000341724063010ABC12321SN001');
      expect(result.lot).toBe('ABC123');
    });

    it('should parse serial number from AI (21)', () => {
      const result = parseGS1DataMatrix('01086957032000341724063010ABC12321SN001');
      expect(result.serial).toBe('SN001');
    });

    it('should handle GS separator character', () => {
      // FNC1/GS separated format (common in real scanners)
      const data = '0108695703200034\x1D1724063010ABC123\x1D21SN001';
      const result = parseGS1DataMatrix(data);
      expect(result.gtin).toBe('08695703200034');
      expect(result.serial).toBe('SN001');
    });

    it('should return empty object for non-GS1 data', () => {
      const result = parseGS1DataMatrix('SIMPLEBARCODE');
      expect(result.gtin).toBeUndefined();
      expect(result.serial).toBeUndefined();
    });
  });

  describe('generateBarcodes', () => {
    it('should generate specified count of barcodes', () => {
      const barcodes = generateBarcodes(5);
      expect(barcodes).toHaveLength(5);
    });

    it('should generate sequential barcodes from base', () => {
      const barcodes = generateBarcodes(3, 'ABC1000');
      expect(barcodes).toHaveLength(3);
      expect(barcodes[0]).toBe('ABC1000');
      expect(barcodes[1]).toBe('ABC1001');
      expect(barcodes[2]).toBe('ABC1002');
    });
  });
});
