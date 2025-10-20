import { InventoryItem } from '../../../types/inventory';

export const exportToCSV = (items: InventoryItem[]) => {
  const headers = [
    'ID',
    'İsim',
    'Marka',
    'Model',
    'Kategori',
    'Barkod',
    'Mevcut Stok',
    'Toplam Stok',
    'Fiyat',
    'Durum',
    'Konum'
  ];

  const csvContent = [
    headers.join(','),
    ...items.map(item => [
      item.id,
      `"${item.name}"`,
      `"${item.brand}"`,
      `"${item.model || ''}"`,
      `"${item.category}"`,
      `"${item.barcode || ''}"`,
      item.availableInventory,
      item.totalInventory,
      item.price,
      `"${item.status || ''}"`,
      `"${item.location || ''}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `envanter_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const printInventory = (items: InventoryItem[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const totalValue = items.reduce((sum, item) => sum + (item.price * item.availableInventory), 0);
  const lowStockItems = items.filter(item => item.availableInventory <= item.reorderLevel);

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Envanter Raporu</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { margin-bottom: 30px; }
        .summary-item { display: inline-block; margin-right: 30px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .low-stock { background-color: #fff3cd; }
        .out-of-stock { background-color: #f8d7da; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Envanter Raporu</h1>
        <p>Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
      </div>
      
      <div class="summary">
        <div class="summary-item"><strong>Toplam Ürün:</strong> ${items.length}</div>
        <div class="summary-item"><strong>Düşük Stok:</strong> ${lowStockItems.length}</div>
        <div class="summary-item"><strong>Toplam Değer:</strong> ₺${totalValue.toLocaleString('tr-TR')}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>İsim</th>
            <th>Marka</th>
            <th>Model</th>
            <th>Kategori</th>
            <th>Mevcut Stok</th>
            <th>Fiyat</th>
            <th>Toplam Değer</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => {
            const rowClass = item.availableInventory === 0 ? 'out-of-stock' : 
                           item.availableInventory <= item.reorderLevel ? 'low-stock' : '';
            return `
              <tr class="${rowClass}">
                <td>${item.name}</td>
                <td>${item.brand}</td>
                <td>${item.model || '-'}</td>
                <td>${item.category}</td>
                <td>${item.availableInventory}</td>
                <td>₺${item.price.toLocaleString('tr-TR')}</td>
                <td>₺${(item.price * item.availableInventory).toLocaleString('tr-TR')}</td>
                <td>${item.status || '-'}</td>
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
  printWindow.print();
};