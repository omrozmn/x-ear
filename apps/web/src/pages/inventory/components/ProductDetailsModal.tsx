import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Modal, Button, Badge } from '@x-ear/ui-web';
import { Edit, Package, History, Printer, Shield, Barcode } from 'lucide-react';
import { InventoryItem } from '../../../types/inventory';
import { getCategoryDisplay } from '../../../utils/category-mapping';
import { usePermissions } from '@/hooks/usePermissions';

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
  const { hasPermission } = usePermissions();
  const { t } = useTranslation('inventory');
  const canViewCost = hasPermission('sensitive.inventory.overview.cost.view');
  const [activeTab, setActiveTab] = useState<'details' | 'inventory' | 'history'>('details');

  if (!product) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success';
      case 'low_stock':
        return 'bg-warning/10 text-yellow-800 dark:text-yellow-300';
      case 'out_of_stock':
        return 'bg-destructive/10 text-red-800 dark:text-red-300';
      case 'inactive':
        return 'bg-muted text-foreground';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return t('status.active');
      case 'low_stock':
        return t('status.low_stock');
      case 'out_of_stock':
        return t('status.out_of_stock');
      case 'inactive':
        return t('status.inactive');
      default:
        return t('status.active');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html class="dark">
        <head>
          <title>{t('actions.view_details')} - ${product.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .field { margin-bottom: 10px; }
            .label { font-weight: bold; color: #374151; }
            .value { margin-top: 2px; }
            .barcode { text-align: center; margin: 20px 0; font-size: 24px; font-family: monospace; }
            @media print { body { margin: 0; } }
            @media (prefers-color-scheme: dark) {
              body { background-color: #1f2937; color: #f3f4f6; }
              .label { color: #d1d5db; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>{t('actions.view_details')}</h1>
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
                <div class="value">${canViewCost ? `₺${product.cost?.toLocaleString()}` : 'Bu rol icin gizli'}</div>
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
    <Modal isOpen={isOpen} onClose={onClose} title={t('actions.view_details')}>
      <div className="space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Header with Actions */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h2>
            <p className="text-muted-foreground">{product.brand} - {product.model || ''}</p>
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
        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('details')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'details'
                ? 'border-blue-500 text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border dark:hover:text-gray-200 dark:hover:border-gray-600'
                }`}
            >
              Genel Bilgiler
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('inventory')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'inventory'
                ? 'border-blue-500 text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border dark:hover:text-gray-200 dark:hover:border-gray-600'
                }`}
            >
              Stok Bilgileri
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
                ? 'border-blue-500 text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border dark:hover:text-gray-200 dark:hover:border-gray-600'
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
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Ürün Bilgileri
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('form.product_name')}</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('form.brand')}</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.brand}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('form.description')}</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.model || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('form.category')}</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{getCategoryDisplay(product.category)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('form.description')}</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.type || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <Barcode className="w-5 h-5 mr-2" />
                  Tanımlama
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('form.barcode')}</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">{product.barcode || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('form.product_code')}</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.sgkCode || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('form.description')}</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.supplier || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">{t('pricing.title')}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('pricing.sale_price')}</label>
                    <p className="mt-1 text-lg font-semibold text-success">₺{product.price?.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('pricing.cost_price')}</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{canViewCost ? `₺${product.cost?.toLocaleString()}` : 'Bu rol icin gizli'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('pricing.profit_margin')}</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {canViewCost && product.price && product.cost ? `%${(((product.price - product.cost) / product.cost) * 100).toFixed(1)}` : 'Bu rol icin gizli'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Konum ve Diğer
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('stock.location')}</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{product.location || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('form.description')}</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {product.ear === 'left' ? 'Sol' : product.ear === 'right' ? 'Sağ' : product.ear === 'both' ? 'Her İkisi' : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('form.description')}</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 flex items-center">
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
                  <label className="block text-sm font-medium text-foreground mb-2">{t('form.description')}</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl">{product.description}</p>
                </div>
              )}

              {product.features && product.features.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t('form.description')}</label>
                  <div className="flex flex-wrap gap-2">
                    {product.features.map((feature, index) => (
                      <span
                        key={index}
                        className="inline-flex px-3 py-1 text-xs font-medium bg-primary/10 text-blue-800 dark:text-blue-200 rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.notes && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">{t('form.notes')}</label>
                  <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl">{product.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">{t('status.in_stock')}</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">{t('stock.current_stock')}</span>
                  <span className="text-lg font-semibold text-primary">{product.availableInventory}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">{t('stock.current_stock')}</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">{product.totalInventory}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">{t('form.description')}</span>
                  <span className="text-sm text-gray-900 dark:text-gray-100">{product.usedInventory}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">{t('stock.reorder_level')}</span>
                  <span className="text-sm text-destructive">{product.reorderLevel}</span>
                </div>
              </div>

              {/* Stock Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{t('status.in_stock')}</span>
                  <span>{Math.round((product.availableInventory / product.totalInventory) * 100)}%</span>
                </div>
                <div className="w-full bg-accent rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${product.availableInventory <= product.reorderLevel
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

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <History className="w-5 h-5 mr-2" />
                Tarihler
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground">{t('columns.created_at')}</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {product.createdAt ? new Date(product.createdAt).toLocaleDateString('tr-TR') : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">{t('columns.updated_at')}</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {product.lastUpdated ? new Date(product.lastUpdated).toLocaleDateString('tr-TR') : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">{t('form.track_stock')}</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {product.isMinistryTracked ? 'Evet' : 'Hayır'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('stock.stock_history')}</h3>
            <p className="text-muted-foreground">
              {t('stock.stock_history')}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ProductDetailsModal;
