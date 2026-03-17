import { useTranslation } from 'react-i18next';
import React, { useState, useRef } from 'react';
import { Card, Button, Badge, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { InventoryItem } from '../../../types/inventory';
import toast from 'react-hot-toast';

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

  const { t } = useTranslation('inventory');
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
      toast('Lütfen CSV veya Excel dosyası seçin');
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
        toast('CSV dosyası en az 2 satır içermelidir (başlık + veri)');
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
              if (!value) errors.push(t('validation.name_required'));
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
              item.category = value as import('../../../types/inventory').InventoryCategory;
              break;
            case 'barcode':
            case 'barkod':
              item.barcode = value;
              break;
            case 'stock':
            case 'stok':
            case 'inventory': {
              const stock = parseInt(value);
              if (!isNaN(stock)) {
                item.availableInventory = stock;
              } else if (value) {
                errors.push(t('validation.stock_positive'));
              }
              break;
            }
            case 'min stock':
            case 'min stok':
            case 'minimum stock': {
              const minStock = parseInt(value);
              if (!isNaN(minStock)) {
                item.reorderLevel = minStock;
              }
              break;
            }
            case 'price':
            case 'fiyat':
            case 'unit price': {
              const price = parseFloat(value);
              if (!isNaN(price)) {
                item.price = price;
              } else if (value) {
                errors.push(t('validation.price_positive'));
              }
              break;
            }
            case 'cost':
            case 'maliyet': {
              const cost = parseFloat(value);
              if (!isNaN(cost)) {
                item.cost = cost;
              }
              break;
            }
            case 'supplier':
            case 'tedarikçi':
              item.supplier = value;
              break;
            case 'warranty':
            case 'garanti':
            case 'warranty period': {
              const warranty = parseInt(value);
              if (!isNaN(warranty)) {
                item.warranty = warranty;
              }
              break;
            }
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
      toast.error('CSV dosyası önizlenirken hata oluştu');
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
              item.category = value as import('../../../types/inventory').InventoryCategory;
              break;
            case 'barcode':
            case 'barkod':
              item.barcode = value;
              break;
            case 'stock':
            case 'stok':
            case 'inventory': {
              const stock = parseInt(value);
              if (!isNaN(stock)) item.availableInventory = stock;
              break;
            }
            case 'min stock':
            case 'min stok': {
              const minStock = parseInt(value);
              if (!isNaN(minStock)) item.reorderLevel = minStock;
              break;
            }
            case 'price':
            case 'fiyat': {
              const price = parseFloat(value);
              if (!isNaN(price)) item.price = price;
              break;
            }
            case 'cost':
            case 'maliyet': {
              const cost = parseFloat(value);
              if (!isNaN(cost)) item.cost = cost;
              break;
            }
            case 'supplier':
            case 'tedarikçi':
              item.supplier = value;
              break;
            case 'warranty':
            case 'garanti': {
              const warranty = parseInt(value);
              if (!isNaN(warranty)) item.warranty = warranty;
              break;
            }
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

  const previewColumns: Column<PreviewItem>[] = [
    {
      key: 'row',
      title: t('form.description'),
      render: (_, item) => item.row,
    },
    {
      key: '_name',
      title: t('form.product_name'),
      render: (_, item) => String(item.data.name || '-'),
    },
    {
      key: '_brand',
      title: t('form.brand'),
      render: (_, item) => String(item.data.brand || '-'),
    },
    {
      key: '_stock',
      title: t('columns.stock'),
      render: (_, item) => String(item.data.availableInventory || '-'),
    },
    {
      key: '_price',
      title: t('columns.sale_price'),
      render: (_, item) => item.data.price ? `₺${item.data.price}` : '-',
    },
    {
      key: '_status',
      title: t('columns.status'),
      render: (_, item) => item.isValid ? (
        <Badge variant="success" className="flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Gecerli
        </Badge>
      ) : (
        <Badge variant="danger" className="flex items-center">
          <AlertCircle className="w-3 h-3 mr-1" />
          Hata
        </Badge>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <Upload className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Toplu Ürün Yükleme
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Instructions */}
          <Card className="p-4 bg-primary/10 border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Dosya Formatı
                </h4>
                <p className="text-sm text-primary mt-1">
                  CSV dosyanız şu sütunları içermelidir: Ürün Adı, Marka, Model, Kategori, Barkod, Stok, Min Stok, Fiyat, Maliyet, Tedarikçi, Garanti, Açıklama, Konum, SGK Kodu
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={downloadSampleFile}
                  className="mt-2 text-primary hover:text-primary dark:hover:text-blue-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Örnek Dosyayı İndir
                </Button>
              </div>
            </div>
          </Card>

          {/* File Upload */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-foreground">
              CSV/Excel Dosyası Seç
            </label>
            <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
              <input
                data-allow-raw="true"
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
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
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  className="text-muted-foreground hover:text-muted-foreground"
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
              <DataTable<PreviewItem>
                data={previewData}
                columns={previewColumns}
                rowKey={(item) => item.row}
                emptyText="Önizleme verisi bulunamadı"
              />
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
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="text-sm text-foreground">
                    {t('import_export.import_completed')}
                  </span>
                </div>
                {uploadResult.errors > 0 && (
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <span className="text-sm text-foreground">
                      {t('import_export.import_failed')}
                    </span>
                  </div>
                )}
                {uploadResult.errorDetails.length > 0 && (
                  <div className="mt-3 p-3 bg-destructive/10 rounded-2xl">
                    <h5 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                      Hata Detayları:
                    </h5>
                    <ul className="text-xs text-destructive space-y-1">
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
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            loading={isUploading}
          >
            {isUploading ? t('import_export.import_started') : t('actions.import')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;