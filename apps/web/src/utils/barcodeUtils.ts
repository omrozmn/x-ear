import { InventoryItem } from '../types/inventory';

/**
 * Generate a unique barcode
 */
export const generateBarcode = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return timestamp.slice(-7) + random;
};

/**
 * Validate barcode format
 */
export const validateBarcode = (barcode: string): boolean => {
  if (!barcode) return true; // Optional field
  
  // Check if it's numeric and has reasonable length
  const isNumeric = /^\d+$/.test(barcode);
  const hasValidLength = barcode.length >= 8 && barcode.length <= 13;
  
  return isNumeric && hasValidLength;
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