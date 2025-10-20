import React, { useState } from 'react';
import { Modal, Button, Badge } from '@x-ear/ui-web';
import { Edit, Package, History, Printer, Shield, Barcode } from 'lucide-react';
import { InventoryItem } from '../../../types/inventory';

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: InventoryItem | null;
  onEdit: (product: InventoryItem) => void;
  onStockUpdate: (product: InventoryItem) => void;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  isOpen,
  onClose,
  product,
  onEdit,
  onStockUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'inventory' | 'history'>('details');

  if (!product) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'low_stock':
        return 'Düşük Stok';
      case 'out_of_stock':
        return 'Stok Yok';
      case 'inactive':
        return 'Pasif';
      default:
        return 'Bilinmiyor';
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ürün Detayları - ${product.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; color: #374151; }
            .value { margin-top: 2px; }
            .barcode { text-align: center; margin: 20px 0; font-size: 24px; font-family: monospace; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Ürün Detayları</h1>
            <h2>${product.name}</h2>
          </div>
          <div class="details">
            <div>
              <div class="field">
                <div class="label">Marka:</div>
                <div class="value">${product.brand}</div>
              </div>
              <div class="field">
                <div class="label">Model:</div>
                <div class="value">${product.model || '-'}</div>
              </div>
              <div class="field">
                <div class="label">Kategori:</div>
                <div class="value">${product.category}</div>
              </div>
              <div class="field">
                <div class="label">Barkod:</div>
                <div class="value">${product.barcode || '-'}</div>
              </div>
              <div class="field">
                <div class="label">Tedarikçi:</div>
                <div class="value">${product.supplier || '-'}</div>
              </div>
            </div>
            <div>
              <div class="field">
                <div class="label">Mevcut Stok:</div>
                <div class="value">${product.availableInventory}</div>
              </div>
              <div class="field">
                <div class="label">Toplam Stok:</div>
                <div class="value">${product.totalInventory}</div>
              </div>
              <div class="field">
                <div class="label">Fiyat:</div>
                <div class="value">₺${product.price?.toLocaleString()}</div>
              </div>
              <div class="field">
                <div class="label">Maliyet:</div>
                <div class="value">₺${product.cost?.toLocaleString()}</div>
              </div>
              <div class="field">
                <div class="label">Yeniden Sipariş Seviyesi:</div>
                <div class="value">${product.reorderLevel}</div>
              </div>
            </div>
          </div>
          ${product.barcode ? `<div class="barcode">*${product.barcode}*</div>` : ''}
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
      <Modal isOpen={isOpen} onClose={onClose} title="Ürün Detayları">
        <div className="space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Header with Actions */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
              <p className="text-gray-600">{product.brand} - {product.model || ''}</p>
            <Badge className={`mt-2 ${getStatusColor(product.status || 'available')}`}>
              {getStatusText(product.status || 'available')}
            </Badge>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <Printer className="w-4 h-4 mr-2" />
              Yazdır
            </Button>
            <Button
              onClick={() => onEdit(product)}
              size="sm"
              className="flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              Düzenle
            </Button>
            <Button
              onClick={() => onStockUpdate(product)}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <Package className="w-4 h-4 mr-2" />
              Stok Güncelle
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('details')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Genel Bilgiler
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('inventory')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'inventory'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Stok Bilgileri
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Geçmiş
            </Button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Ürün Bilgileri
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ürün Adı</label>
                    <p className="mt-1 text-sm text-gray-900">{product.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Marka</label>
                    <p className="mt-1 text-sm text-gray-900">{product.brand}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Model</label>
                    <p className="mt-1 text-sm text-gray-900">{product.model || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Kategori</label>
                    <p className="mt-1 text-sm text-gray-900">{product.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tip</label>
                    <p className="mt-1 text-sm text-gray-900">{product.type || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <Barcode className="w-5 h-5 mr-2" />
                  Tanımlama
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Barkod</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{product.barcode || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SGK Kodu</label>
                    <p className="mt-1 text-sm text-gray-900">{product.sgkCode || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tedarikçi</label>
                    <p className="mt-1 text-sm text-gray-900">{product.supplier || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Fiyat Bilgileri</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Satış Fiyatı</label>
                    <p className="mt-1 text-lg font-semibold text-green-600">₺{product.price?.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Maliyet</label>
                    <p className="mt-1 text-sm text-gray-900">₺{product.cost?.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Kar Marjı</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {product.price && product.cost ? `%${(((product.price - product.cost) / product.cost) * 100).toFixed(1)}` : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Konum ve Diğer
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Konum</label>
                    <p className="mt-1 text-sm text-gray-900">{product.location || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Kulak</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {product.ear === 'left' ? 'Sol' : product.ear === 'right' ? 'Sağ' : product.ear === 'both' ? 'Her İkisi' : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Garanti (Ay)</label>
                    <p className="mt-1 text-sm text-gray-900 flex items-center">
                      <Shield className="w-4 h-4 mr-1" />
                      {product.warranty || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description and Features */}
            <div className="md:col-span-2 space-y-4">
              {product.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{product.description}</p>
                </div>
              )}
              
              {product.features && product.features.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Özellikler</label>
                  <div className="flex flex-wrap gap-2">
                    {product.features.map((feature, index) => (
                      <span
                        key={index}
                        className="inline-flex px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{product.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Stok Durumu</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Mevcut Stok</span>
                  <span className="text-lg font-semibold text-blue-600">{product.availableInventory}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Toplam Stok</span>
                  <span className="text-sm text-gray-900">{product.totalInventory}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Kullanılan</span>
                  <span className="text-sm text-gray-900">{product.usedInventory}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Yeniden Sipariş Seviyesi</span>
                  <span className="text-sm text-red-600">{product.reorderLevel}</span>
                </div>
              </div>
              
              {/* Stock Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Stok Durumu</span>
                  <span>{Math.round((product.availableInventory / product.totalInventory) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      product.availableInventory <= product.reorderLevel
                        ? 'bg-red-500'
                        : product.availableInventory <= product.reorderLevel * 2
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((product.availableInventory / product.totalInventory) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <History className="w-5 h-5 mr-2" />
                  Tarihler
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Oluşturulma</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {product.createdAt ? new Date(product.createdAt).toLocaleDateString('tr-TR') : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Son Güncelleme</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {product.lastUpdated ? new Date(product.lastUpdated).toLocaleDateString('tr-TR') : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bakanlık Takibi</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {product.isMinistryTracked ? 'Evet' : 'Hayır'}
                    </p>
                  </div>
                </div>
              </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-gray-50 p-6 rounded-lg text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Stok Geçmişi</h3>
            <p className="text-gray-600">
              Stok hareketleri ve geçmiş kayıtları burada görüntülenecek.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ProductDetailsModal;