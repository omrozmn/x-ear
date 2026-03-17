import { InventoryItem } from '../types/inventory';
import {
  barcodeApiService,
  type ValidateBarcodeResponse,
  type Symbology,
  type OutputFormat,
} from '../services/barcode-api.service';

export type BarcodeFormat = 'EAN-13' | 'EAN-8' | 'UPC-A' | 'CODE-128' | 'GS1-128' | 'CODE-39' | 'QR' | 'GS1-DATAMATRIX' | 'DATA-MATRIX' | 'UNKNOWN';

/**
 * Generate a unique barcode
 */
export const generateBarcode = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return timestamp.slice(-7) + random;
};

/**
 * Validate barcode format.
 * Supports: EAN-13, EAN-8, UPC-A, Code 128, Code 39, GS1 DataMatrix, GS1-128, QR.
 *
 * GS1 DataMatrix strings from İTS/ÜTS can be 30-60+ chars (AI fields concatenated).
 */
export const validateBarcode = (barcode: string): boolean => {
  if (!barcode) return true; // Optional field

  // GS1 DataMatrix / GS1-128: starts with AI (01) GTIN - allow longer strings
  if (barcode.startsWith('01') && barcode.length >= 16) {
    return barcode.split('').every(c => /[A-Za-z0-9]/.test(c) || c.charCodeAt(0) === 0x1D);
  }

  // Standard barcodes: alphanumeric 4-30 chars
  const isValidChars = /^[A-Za-z0-9\-_.]+$/.test(barcode);
  const hasValidLength = barcode.length >= 4 && barcode.length <= 30;

  return isValidChars && hasValidLength;
};

/**
 * Detect barcode format using heuristics.
 *
 * GS1 Application Identifiers (AI):
 *   (01) = GTIN, (17) = Expiry, (10) = Lot/Batch, (21) = Serial
 * GS1 DataMatrix barcodes (İTS/ÜTS) typically contain: 01+GTIN+17+expiry+10+lot+21+serial
 */
export const detectBarcodeFormat = (barcode: string): BarcodeFormat | null => {
  if (!barcode) return null;

  // GS1 DataMatrix: starts with AI (01) for GTIN - used by İTS (pharmacy) and ÜTS (medical devices)
  if (barcode.startsWith('01') && barcode.length >= 16) {
    // GS1 DataMatrix contains AI fields: (01)GTIN(17)expiry(10)lot(21)serial
    return 'GS1-DATAMATRIX';
  }

  // GS1-128: contains FNC1 separator (ASCII GS char, code 29) or parenthesized AIs
  if (barcode.includes(String.fromCharCode(0x1D)) || /^\(01\)/.test(barcode)) {
    return 'GS1-128';
  }

  const isNumeric = /^\d+$/.test(barcode);

  if (isNumeric) {
    if (barcode.length === 13) return 'EAN-13';
    if (barcode.length === 8) return 'EAN-8';
    if (barcode.length === 12) return 'UPC-A';
    if (barcode.length === 14) return 'CODE-128'; // GTIN-14
    if (barcode.length >= 4 && barcode.length <= 30) return 'CODE-128';
  }

  // Alphanumeric - Code 39 charset (uppercase only, limited special chars)
  if (/^[A-Z0-9\-. $/+%]+$/.test(barcode)) return 'CODE-39';
  // Mixed case / broader charset = Code 128
  if (/^[A-Za-z0-9\-_.]+$/.test(barcode)) return 'CODE-128';

  return 'UNKNOWN';
};

/**
 * Validate EAN-13 checksum (critical for pharmacy sector).
 * EAN-13 is the standard retail barcode in Turkey (GS1 Türkiye, prefix 868/869).
 */
export const validateEAN13Checksum = (barcode: string): boolean => {
  if (!/^\d{13}$/.test(barcode)) return false;

  const digits = barcode.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[12];
};

/**
 * Validate EAN-8 checksum (accessories, small products).
 */
export const validateEAN8Checksum = (barcode: string): boolean => {
  if (!/^\d{8}$/.test(barcode)) return false;

  const digits = barcode.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += digits[i] * (i % 2 === 0 ? 3 : 1);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[7];
};

/**
 * Parse GS1 DataMatrix / GS1-128 Application Identifiers.
 * Used by İTS (İlaç Takip Sistemi) and ÜTS (Ürün Takip Sistemi) in Turkey.
 *
 * GS1 AI structure (concatenated, no parentheses in raw scan data):
 *   AI(01) = GTIN-14 (14 digits, fixed)
 *   AI(17) = Expiry YYMMDD (6 digits, fixed)
 *   AI(10) = Lot/Batch (variable, terminated by GS or next known AI)
 *   AI(21) = Serial (variable, terminated by GS or end)
 *
 * Example İTS scan: "01086957032000341724063010ABC12321SN001"
 *   → GTIN: 08695703200034, Expiry: 240630, Lot: ABC123, Serial: SN001
 */
export const parseGS1DataMatrix = (data: string): {
  gtin?: string;
  serial?: string;
  expiry?: string;
  lot?: string;
} => {
  const result: { gtin?: string; serial?: string; expiry?: string; lot?: string } = {};

  // GS (Group Separator) character used as FNC1 delimiter in GS1 barcodes
  const GS = String.fromCharCode(0x1D);

  // Normalize: keep GS separators intact
  const normalized = data;

  // Sequential parse approach for concatenated AI strings
  let pos = 0;

  while (pos < normalized.length) {
    // Check for GS separator
    if (normalized[pos] === GS) {
      pos++;
      continue;
    }

    // AI (01) - GTIN: fixed 14 digits
    if (normalized.substring(pos, pos + 2) === '01' && pos + 16 <= normalized.length) {
      result.gtin = normalized.substring(pos + 2, pos + 16);
      pos += 16;
      continue;
    }

    // AI (17) - Expiry: fixed 6 digits (YYMMDD)
    if (normalized.substring(pos, pos + 2) === '17' && pos + 8 <= normalized.length) {
      result.expiry = normalized.substring(pos + 2, pos + 8);
      pos += 8;
      continue;
    }

    // AI (10) - Lot/Batch: variable length, ends at GS or next AI (21, 17, 01)
    if (normalized.substring(pos, pos + 2) === '10') {
      pos += 2;
      let lotEnd = normalized.indexOf(GS, pos);
      // Also check for known following AIs
      const nextAI21 = normalized.indexOf('21', pos);
      if (nextAI21 > pos && (lotEnd === -1 || nextAI21 < lotEnd)) lotEnd = nextAI21;
      if (lotEnd === -1) lotEnd = normalized.length;
      result.lot = normalized.substring(pos, lotEnd);
      pos = lotEnd;
      continue;
    }

    // AI (21) - Serial: variable length, ends at GS or end
    if (normalized.substring(pos, pos + 2) === '21') {
      pos += 2;
      let serialEnd = normalized.indexOf(GS, pos);
      if (serialEnd === -1) serialEnd = normalized.length;
      result.serial = normalized.substring(pos, serialEnd);
      pos = serialEnd;
      continue;
    }

    // Unknown AI - skip one character
    pos++;
  }

  return result;
};

/**
 * Generate multiple barcodes for bulk operations
 */
export const generateBarcodes = (count: number, baseBarcode?: string): string[] => {
  const barcodes: string[] = [];
  
  if (baseBarcode) {
    const baseNumber = parseInt(baseBarcode.substring(3));
    for (let i = 0; i < count; i++) {
      const newNumber = baseNumber + i;
      const newBarcode = baseBarcode.substring(0, 3) + String(newNumber);
      barcodes.push(newBarcode);
    }
  } else {
    for (let i = 0; i < count; i++) {
      barcodes.push(generateBarcode());
    }
  }
  
  return barcodes;
};

/**
 * Print barcode labels for inventory items
 */
export const printBarcodeLabels = (items: InventoryItem[]): void => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Barkod Etiketleri</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 20px;
        }
        .label-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        .barcode-label {
          border: 1px solid #000;
          padding: 10px;
          text-align: center;
          width: 200px;
          height: 100px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          page-break-inside: avoid;
        }
        .product-name {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 5px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .barcode {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          font-weight: bold;
          margin: 5px 0;
          letter-spacing: 2px;
        }
        .barcode-visual {
          font-family: 'Libre Barcode 128', monospace;
          font-size: 24px;
          margin: 5px 0;
        }
        .product-info {
          font-size: 10px;
          color: #666;
        }
        @media print {
          body { margin: 0; }
          .label-container { gap: 5px; }
        }
      </style>
    </head>
    <body>
      <div class="label-container">
        ${items.map(item => `
          <div class="barcode-label">
            <div class="product-name">${item.name}</div>
            ${item.barcode ? `
              <div class="barcode-visual">*${item.barcode}*</div>
              <div class="barcode">${item.barcode}</div>
            ` : '<div class="barcode">Barkod Yok</div>'}
            <div class="product-info">${item.brand} ${item.model || ''}</div>
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();
  
  // Wait for content to load before printing
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

/**
 * Print single barcode label
 */
export const printSingleBarcodeLabel = (item: InventoryItem): void => {
  printBarcodeLabels([item]);
};

/**
 * Generate and assign barcode to item
 */
export const generateAndAssignBarcode = (item: InventoryItem): InventoryItem => {
  if (!item.barcode) {
    return {
      ...item,
      barcode: generateBarcode()
    };
  }
  return item;
};

// ---------------------------------------------------------------------------
// Remote barcode service helpers
// ---------------------------------------------------------------------------

/**
 * Validate a barcode against the remote barcode-service.
 * Falls back gracefully if the service is unavailable.
 */
export async function validateBarcodeRemote(
  barcode: string,
  symbology?: Symbology,
): Promise<ValidateBarcodeResponse> {
  return barcodeApiService.validateBarcode({
    data: barcode,
    symbology,
  });
}

/**
 * Generate a barcode image via the barcode-service and return a blob URL
 * that can be used as an <img> src.
 *
 * Caller is responsible for revoking the URL when no longer needed
 * (`URL.revokeObjectURL`).
 */
export async function generateBarcodeImage(
  data: string,
  symbology: Symbology = 'code128',
  format: OutputFormat = 'svg',
): Promise<string> {
  const blob = await barcodeApiService.generateBarcode({
    symbology,
    data,
    format,
  });
  return URL.createObjectURL(blob);
}

// ---------------------------------------------------------------------------
// Label-service based printing
// ---------------------------------------------------------------------------

/**
 * Print barcode labels using the label-generation-service.
 *
 * Renders each item via the service and creates a combined print window.
 * Returns `true` on success, `false` if the service is unreachable (caller
 * should fall back to `printBarcodeLabels`).
 */
export const printBarcodeLabelsWithService = async (
  items: InventoryItem[],
  templateId?: string,
): Promise<boolean> => {
  try {
    const { labelApiService } = await import('../services/label-api.service');

    const isUp = await labelApiService.healthCheck();
    if (!isUp) return false;

    // Resolve template id
    let resolvedId = templateId;
    if (!resolvedId) {
      const templates = await labelApiService.listTemplates();
      const published = templates.filter((t) => t.status === 'published');
      if (published.length === 0) return false;
      resolvedId = published[0].id;
    }

    // Render each item
    const svgParts: string[] = [];
    for (const item of items) {
      const data: Record<string, unknown> = {
        name: item.name,
        brand: item.brand,
        model: item.model ?? '',
        barcode: item.barcode ?? '',
        price: item.price != null ? `${item.price} TL` : '',
        stockCode: item.stockCode ?? '',
      };

      const svg = await labelApiService.renderTemplate({
        templateId: resolvedId,
        data,
      });
      svgParts.push(svg);
    }

    // Open combined print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return false;

    const printContent = `<!DOCTYPE html>
<html>
<head>
  <title>Barkod Etiketleri</title>
  <style>
    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
    .label-container { display: flex; flex-wrap: wrap; gap: 10px; }
    .label-item { page-break-inside: avoid; }
    @media print { body { padding: 0; } .label-container { gap: 5px; } }
  </style>
</head>
<body>
  <div class="label-container">
    ${svgParts.map((svg) => `<div class="label-item">${svg}</div>`).join('\n    ')}
  </div>
</body>
</html>`;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);

    return true;
  } catch {
    return false;
  }
};