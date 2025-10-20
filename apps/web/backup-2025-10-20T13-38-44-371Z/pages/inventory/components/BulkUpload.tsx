import React, { useState, useRef } from 'react';
import { Card, Button, Badge } from '@x-ear/ui-web';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { InventoryItem } from '../../../types/inventory';

interface BulkUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (items: Partial<InventoryItem>[]) => Promise<void>;
}

interface UploadResult {
  success: number;
  errors: number;
  errorDetails: string[];
}

interface PreviewItem {
  row: number;
  data: Partial<InventoryItem>;
  errors: string[];
  isValid: boolean;
}

export const BulkUpload: React.FC<BulkUploadProps> = ({
  isOpen,
  onClose,
  onUpload
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [previewData, setPreviewData] = useState<PreviewItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isValidFile = file.type === 'text/csv' || 
                       file.name.endsWith('.csv') ||
                       file.type === 'application/vnd.ms-excel' ||
                       file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                       file.name.endsWith('.xlsx') ||
                       file.name.endsWith('.xls');

    if (!isValidFile) {
      alert('Lütfen CSV veya Excel dosyası seçin');
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
    setShowPreview(false);

    // For CSV files, show preview
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvContent = e.target?.result as string;
        previewCSV(csvContent);
      };
      reader.readAsText(file);
    }
  };

  const previewCSV = (csvContent: string) => {
    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        alert('CSV dosyası en az 2 satır içermelidir (başlık + veri)');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const dataLines = lines.slice(1);

      const preview: PreviewItem[] = dataLines.slice(0, 10).map((line, index) => {
        const cells = line.split(',').map(cell => cell.trim().replace(/"/g, ''));
        const item: Partial<InventoryItem> = {};
        const errors: string[] = [];

        // Map CSV columns to item properties
        headers.forEach((header, headerIndex) => {
          const value = cells[headerIndex] || '';
          
          switch (header) {
            case 'name':
            case 'ürün adı':
            case 'product name':
              item.name = value;
              if (!value) errors.push('Ürün adı gerekli');
              break;
            case 'brand':
            case 'marka':
              item.brand = value;
              break;
            case 'model':
              item.model = value;
              break;
            case 'category':
            case 'kategori':
              item.category = value as any;
              break;
            case 'barcode':
            case 'barkod':
              item.barcode = value;
              break;
            case 'stock':
            case 'stok':
            case 'inventory':
              const stock = parseInt(value);
              if (!isNaN(stock)) {
                item.availableInventory = stock;
              } else if (value) {
                errors.push('Stok sayısı geçersiz');
              }
              break;
            case 'min stock':
            case 'min stok':
            case 'minimum stock':
              const minStock = parseInt(value);
              if (!isNaN(minStock)) {
                item.reorderLevel = minStock;
              }
              break;
            case 'price':
            case 'fiyat':
            case 'unit price':
              const price = parseFloat(value);
              if (!isNaN(price)) {
                item.price = price;
              } else if (value) {
                errors.push('Fiyat geçersiz');
              }
              break;
            case 'cost':
            case 'maliyet':
              const cost = parseFloat(value);
              if (!isNaN(cost)) {
                item.cost = cost;
              }
              break;
            case 'supplier':
            case 'tedarikçi':
              item.supplier = value;
              break;
            case 'warranty':
            case 'garanti':
            case 'warranty period':
              const warranty = parseInt(value);
              if (!isNaN(warranty)) {
                item.warranty = warranty;
              }
              break;
            case 'description':
            case 'açıklama':
              item.description = value;
              break;
            case 'location':
            case 'konum':
              item.location = value;
              break;
            case 'sgk code':
            case 'sgk kodu':
              item.sgkCode = value;
              break;
          }
        });

        return {
          row: index + 2, // +2 because we skip header and use 1-based indexing
          data: item,
          errors,
          isValid: errors.length === 0 && !!item.name
        };
      });

      setPreviewData(preview);
      setShowPreview(true);
    } catch (error) {
      console.error('CSV preview error:', error);
      alert('CSV dosyası önizlenirken hata oluştu');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      let csvContent: string;

      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        csvContent = await readFileAsText(selectedFile);
      } else {
        // For Excel files, we would need a library like xlsx to parse
        // For now, show an error message
        throw new Error('Excel dosyası desteği henüz eklenmedi. Lütfen CSV dosyası kullanın.');
      }

      const result = await processBulkUpload(csvContent);
      setUploadResult(result);

      if (result.success > 0) {
        // Refresh the inventory list
        window.location.reload();
      }

    } catch (error) {
      console.error('Bulk upload error:', error);
      setUploadResult({
        success: 0,
        errors: 1,
        errorDetails: [error instanceof Error ? error.message : 'Bilinmeyen hata']
      });
    } finally {
      setIsUploading(false);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Dosya okunamadı'));
      reader.readAsText(file);
    });
  };

  const processBulkUpload = async (csvContent: string): Promise<UploadResult> => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dataLines = lines.slice(1);

    let successCount = 0;
    let errorCount = 0;
    const errorDetails: string[] = [];
    const validItems: Partial<InventoryItem>[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const cells = dataLines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
        const item: Partial<InventoryItem> = {
          id: `bulk_${Date.now()}_${i}`,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };

        // Map CSV columns to item properties
        headers.forEach((header, index) => {
          const value = cells[index] || '';
          
          switch (header) {
            case 'name':
            case 'ürün adı':
            case 'product name':
              item.name = value;
              break;
            case 'brand':
            case 'marka':
              item.brand = value;
              break;
            case 'model':
              item.model = value;
              break;
            case 'category':
            case 'kategori':
              item.category = value as any;
              break;
            case 'barcode':
            case 'barkod':
              item.barcode = value;
              break;
            case 'stock':
            case 'stok':
            case 'inventory':
              const stock = parseInt(value);
              if (!isNaN(stock)) item.availableInventory = stock;
              break;
            case 'min stock':
            case 'min stok':
              const minStock = parseInt(value);
              if (!isNaN(minStock)) item.reorderLevel = minStock;
              break;
            case 'price':
            case 'fiyat':
              const price = parseFloat(value);
              if (!isNaN(price)) item.price = price;
              break;
            case 'cost':
            case 'maliyet':
              const cost = parseFloat(value);
              if (!isNaN(cost)) item.cost = cost;
              break;
            case 'supplier':
            case 'tedarikçi':
              item.supplier = value;
              break;
            case 'warranty':
            case 'garanti':
              const warranty = parseInt(value);
              if (!isNaN(warranty)) item.warranty = warranty;
              break;
            case 'description':
            case 'açıklama':
              item.description = value;
              break;
            case 'location':
            case 'konum':
              item.location = value;
              break;
            case 'sgk code':
            case 'sgk kodu':
              item.sgkCode = value;
              break;
          }
        });

        // Validate required fields
        if (!item.name) {
          errorDetails.push(`Satır ${i + 2}: Ürün adı gerekli`);
          errorCount++;
          continue;
        }

        validItems.push(item);
        successCount++;

      } catch (error) {
        errorDetails.push(`Satır ${i + 2}: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
        errorCount++;
      }
    }

    // Upload valid items
    if (validItems.length > 0) {
      await onUpload(validItems);
    }

    return {
      success: successCount,
      errors: errorCount,
      errorDetails
    };
  };

  const downloadSampleFile = () => {
    const sampleData = [
      ['Ürün Adı', 'Marka', 'Model', 'Kategori', 'Barkod', 'Stok', 'Min Stok', 'Fiyat', 'Maliyet', 'Tedarikçi', 'Garanti', 'Açıklama', 'Konum', 'SGK Kodu'],
      ['Örnek Ürün 1', 'Marka A', 'Model X', 'Elektronik', '1234567890123', '100', '10', '299.99', '199.99', 'Tedarikçi A', '2 yıl', 'Örnek açıklama', 'Depo A', 'SGK123'],
      ['Örnek Ürün 2', 'Marka B', 'Model Y', 'Aksesuar', '9876543210987', '50', '5', '49.99', '29.99', 'Tedarikçi B', '1 yıl', 'Başka açıklama', 'Depo B', 'SGK456']
    ];

    const csvContent = sampleData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'ornek_urun_listesi.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setShowPreview(false);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Upload className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Toplu Ürün Yükleme
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Instructions */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Dosya Formatı
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                  CSV dosyanız şu sütunları içermelidir: Ürün Adı, Marka, Model, Kategori, Barkod, Stok, Min Stok, Fiyat, Maliyet, Tedarikçi, Garanti, Açıklama, Konum, SGK Kodu
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={downloadSampleFile}
                  className="mt-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Örnek Dosyayı İndir
                </Button>
              </div>
            </div>
          </Card>

          {/* File Upload */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              CSV/Excel Dosyası Seç
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Dosyayı sürükleyip bırakın veya seçmek için tıklayın
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Dosya Seç
              </Button>
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Preview */}
          {showPreview && previewData.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Önizleme (İlk 10 satır)
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Satır
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Ürün Adı
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Marka
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Stok
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Fiyat
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {previewData.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {item.row}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {item.data.name || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {item.data.brand || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {item.data.availableInventory || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {item.data.price ? `₺${item.data.price}` : '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {item.isValid ? (
                            <Badge variant="success" className="flex items-center">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Geçerli
                            </Badge>
                          ) : (
                            <Badge variant="danger" className="flex items-center">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Hata
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <Card className="p-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                Yükleme Sonucu
              </h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {uploadResult.success} ürün başarıyla yüklendi
                  </span>
                </div>
                {uploadResult.errors > 0 && (
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {uploadResult.errors} hatada ürün yüklenemedi
                    </span>
                  </div>
                )}
                {uploadResult.errorDetails.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <h5 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                      Hata Detayları:
                    </h5>
                    <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                      {uploadResult.errorDetails.slice(0, 10).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {uploadResult.errorDetails.length > 10 && (
                        <li>... ve {uploadResult.errorDetails.length - 10} hata daha</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            loading={isUploading}
          >
            {isUploading ? 'Yükleniyor...' : 'Ürünleri Yükle'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;