import { InventoryItem } from '../types/inventory';

/**
 * Export inventory items to CSV format
 */
export const exportInventoryToCSV = (items: InventoryItem[], filename?: string): void => {
  const headers = [
    'ID',
    'İsim',
    'Marka',
    'Model',
    'Kategori',
    'Tip',
    'Barkod',
    'Tedarikçi',
    'Açıklama',
    'Mevcut Stok',
    'Toplam Stok',
    'Kullanılan Stok',
    'Denemede',
    'Yeniden Sipariş Seviyesi',
    'Fiyat',
    'Maliyet',
    'Durum',
    'Konum',
    'Oluşturulma Tarihi',
    'Son Güncelleme'
  ];

  const csvContent = [
    headers.join(','),
    ...items.map(item => [
      item.id,
      `"${item.name}"`,
      `"${item.brand}"`,
      `"${item.model || ''}"`,
      `"${item.category}"`,
      `"${item.type}"`,
      `"${item.barcode || ''}"`,
      `"${item.supplier || ''}"`,
      `"${item.description || ''}"`,
      item.availableInventory,
      item.totalInventory,
      item.usedInventory,
      item.onTrial,
      item.reorderLevel,
      item.price || 0,
      item.cost || 0,
      `"${item.status || ''}"`,
      `"${item.location || ''}"`,
      `"${item.createdAt || ''}"`,
      `"${item.lastUpdated || ''}"`
    ].join(','))
  ].join('\n');

  downloadFile(csvContent, filename || `envanter_${getDateString()}.csv`, 'text/csv;charset=utf-8;');
};

/**
 * Export low stock items to CSV
 */
export const exportLowStockToCSV = (items: InventoryItem[]): void => {
  const lowStockItems = items.filter(item => item.availableInventory <= item.reorderLevel);
  exportInventoryToCSV(lowStockItems, `dusuk_stok_${getDateString()}.csv`);
};

/**
 * Export out of stock items to CSV
 */
export const exportOutOfStockToCSV = (items: InventoryItem[]): void => {
  const outOfStockItems = items.filter(item => item.availableInventory === 0);
  exportInventoryToCSV(outOfStockItems, `stok_tukenen_${getDateString()}.csv`);
};

/**
 * Export inventory items to Excel format (CSV with Excel compatibility)
 */
export const exportInventoryToExcel = (items: InventoryItem[], filename?: string): void => {
  const headers = [
    'ID',
    'İsim',
    'Marka',
    'Model',
    'Kategori',
    'Tip',
    'Barkod',
    'Tedarikçi',
    'Açıklama',
    'Mevcut Stok',
    'Toplam Stok',
    'Kullanılan Stok',
    'Denemede',
    'Yeniden Sipariş Seviyesi',
    'Fiyat',
    'Maliyet',
    'Durum',
    'Konum',
    'Oluşturulma Tarihi',
    'Son Güncelleme'
  ];

  // Excel-compatible CSV with BOM for Turkish characters
  const csvContent = '\uFEFF' + [
    headers.join('\t'), // Use tab separator for Excel
    ...items.map(item => [
      item.id,
      item.name,
      item.brand,
      item.model || '',
      item.category,
      item.type,
      item.barcode || '',
      item.supplier || '',
      item.description || '',
      item.availableInventory,
      item.totalInventory,
      item.usedInventory,
      item.onTrial,
      item.reorderLevel,
      item.price || 0,
      item.cost || 0,
      item.status || '',
      item.location || '',
      item.createdAt || '',
      item.lastUpdated || ''
    ].join('\t'))
  ].join('\n');

  downloadFile(csvContent, filename || `envanter_${getDateString()}.xlsx`, 'application/vnd.ms-excel');
};

/**
 * Generate inventory summary report
 */
export const generateInventorySummaryReport = (items: InventoryItem[]): string => {
  const totalItems = items.length;
  const totalValue = items.reduce((sum, item) => sum + ((item.price || 0) * item.availableInventory), 0);
  const lowStockItems = items.filter(item => item.availableInventory <= item.reorderLevel);
  const outOfStockItems = items.filter(item => item.availableInventory === 0);
  
  const categoryStats = items.reduce((acc, item) => {
    const category = item.category || 'Belirtilmemiş';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeStats = items.reduce((acc, item) => {
    const type = item.type || 'Belirtilmemiş';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return `
ENVANTER ÖZET RAPORU
Tarih: ${new Date().toLocaleDateString('tr-TR')}

GENEL İSTATİSTİKLER:
- Toplam Ürün Sayısı: ${totalItems}
- Toplam Envanter Değeri: ₺${totalValue.toLocaleString('tr-TR')}
- Düşük Stok Ürünleri: ${lowStockItems.length}
- Stokta Olmayan Ürünler: ${outOfStockItems.length}

KATEGORİ DAĞILIMI:
${Object.entries(categoryStats).map(([category, count]) => `- ${category}: ${count}`).join('\n')}

TİP DAĞILIMI:
${Object.entries(typeStats).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

DÜŞÜK STOK UYARISI:
${lowStockItems.map(item => `- ${item.name} (${item.availableInventory}/${item.reorderLevel})`).join('\n')}
  `.trim();
};

/**
 * Export inventory summary report to text file
 */
export const exportInventorySummaryToTxt = (items: InventoryItem[]): void => {
  const report = generateInventorySummaryReport(items);
  downloadFile(report, `envanter_ozet_${getDateString()}.txt`, 'text/plain;charset=utf-8;');
};

/**
 * Print inventory report
 */
export const printInventoryReport = (items: InventoryItem[]): void => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const totalValue = items.reduce((sum, item) => sum + ((item.price || 0) * item.availableInventory), 0);
  const lowStockItems = items.filter(item => item.availableInventory <= item.reorderLevel);
  const outOfStockItems = items.filter(item => item.availableInventory === 0);

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Envanter Raporu</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          font-size: 12px;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .summary { 
          margin-bottom: 30px; 
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        .summary-section {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 5px;
        }
        .summary-section h3 {
          margin-top: 0;
          color: #333;
        }
        .summary-item { 
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 20px;
          font-size: 10px;
        }
        th, td { 
          border: 1px solid #ddd; 
          padding: 6px; 
          text-align: left; 
        }
        th { 
          background-color: #f2f2f2; 
          font-weight: bold;
        }
        .low-stock { background-color: #fff3cd; }
        .out-of-stock { background-color: #f8d7da; }
        .text-right { text-align: right; }
        @media print { 
          body { margin: 0; }
          .summary { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ENVANTER RAPORU</h1>
        <p>Tarih: ${new Date().toLocaleDateString('tr-TR')} - ${new Date().toLocaleTimeString('tr-TR')}</p>
      </div>
      
      <div class="summary">
        <div class="summary-section">
          <h3>Genel İstatistikler</h3>
          <div class="summary-item">
            <span>Toplam Ürün:</span>
            <strong>${items.length}</strong>
          </div>
          <div class="summary-item">
            <span>Toplam Değer:</span>
            <strong>₺${totalValue.toLocaleString('tr-TR')}</strong>
          </div>
          <div class="summary-item">
            <span>Düşük Stok:</span>
            <strong style="color: orange;">${lowStockItems.length}</strong>
          </div>
          <div class="summary-item">
            <span>Stokta Yok:</span>
            <strong style="color: red;">${outOfStockItems.length}</strong>
          </div>
        </div>
        
        <div class="summary-section">
          <h3>Stok Durumu</h3>
          <div class="summary-item">
            <span>Normal Stok:</span>
            <strong>${items.length - lowStockItems.length}</strong>
          </div>
          <div class="summary-item">
            <span>Toplam Mevcut Stok:</span>
            <strong>${items.reduce((sum, item) => sum + item.availableInventory, 0)}</strong>
          </div>
          <div class="summary-item">
            <span>Toplam Stok:</span>
            <strong>${items.reduce((sum, item) => sum + item.totalInventory, 0)}</strong>
          </div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Ürün Adı</th>
            <th>Marka</th>
            <th>Model</th>
            <th>Kategori</th>
            <th>Barkod</th>
            <th class="text-right">Mevcut</th>
            <th class="text-right">Toplam</th>
            <th class="text-right">Min</th>
            <th class="text-right">Fiyat</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => {
            const isLowStock = item.availableInventory <= item.reorderLevel;
            const isOutOfStock = item.availableInventory === 0;
            const rowClass = isOutOfStock ? 'out-of-stock' : (isLowStock ? 'low-stock' : '');
            
            return `
              <tr class="${rowClass}">
                <td>${item.name}</td>
                <td>${item.brand}</td>
                <td>${item.model || '-'}</td>
                <td>${item.category}</td>
                <td>${item.barcode || '-'}</td>
                <td class="text-right">${item.availableInventory}</td>
                <td class="text-right">${item.totalInventory}</td>
                <td class="text-right">${item.reorderLevel}</td>
                <td class="text-right">₺${(item.price || 0).toLocaleString('tr-TR')}</td>
                <td>${isOutOfStock ? 'Stokta Yok' : (isLowStock ? 'Düşük Stok' : 'Normal')}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

/**
 * Helper function to download file
 */
const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Helper function to get formatted date string
 */
const getDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};