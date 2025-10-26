import React, { useState, useEffect } from 'react';
import { Button, Input, Badge, Select } from '@x-ear/ui-web';
import { useToastHelpers } from '@x-ear/ui-web';
import { Truck, Package, CheckCircle, Clock, AlertCircle, Calendar, User, MapPin, Loader2 } from 'lucide-react';
import { Patient } from '../../types/patient/patient-base.types';
import { timelineService } from '../../services/timeline.service';

interface MaterialDeliverySectionProps {
  patient: Patient;
  patientId: string;
}

interface DeliveryItem {
  id: string;
  materialName: string;
  materialCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  deliveryDate?: string;
  trackingNumber?: string;
  notes?: string;
}

interface DeliveryBatch {
  id: string;
  batchNumber: string;
  items: DeliveryItem[];
  status: 'preparing' | 'in_transit' | 'delivered' | 'partially_delivered';
  createdDate: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  deliveryAddress: string;
  deliveryPerson?: string;
  trackingNumber?: string;
  notes?: string;
}

// Loading Spinner Component
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
  );
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className = '' }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Hazırlanıyor' };
      case 'preparing':
        return { color: 'bg-blue-100 text-blue-800', icon: Package, text: 'Hazırlanıyor' };
      case 'in_transit':
        return { color: 'bg-orange-100 text-orange-800', icon: Truck, text: 'Yolda' };
      case 'delivered':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Teslim Edildi' };
      case 'partially_delivered':
        return { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, text: 'Kısmi Teslim' };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'İptal Edildi' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, text: 'Bilinmiyor' };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} ${className} inline-flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.text}
    </Badge>
  );
};

export const MaterialDeliverySection: React.FC<MaterialDeliverySectionProps> = ({ patient, patientId }) => {
  const { success: showSuccess, error: showError } = useToastHelpers();

  const [deliveryBatches, setDeliveryBatches] = useState<DeliveryBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<DeliveryBatch | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showNewDeliveryModal, setShowNewDeliveryModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingDelivery, setIsCreatingDelivery] = useState(false);

  // New delivery form state
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Load delivery batches on component mount
  useEffect(() => {
    loadDeliveryBatches();
  }, [patientId]);

  const loadDeliveryBatches = async () => {
    setIsLoading(true);
    try {
      // Mock data - in real implementation, this would come from API
      const mockBatches: DeliveryBatch[] = [
        {
          id: 'del_001',
          batchNumber: 'TES-2024-001',
          status: 'delivered',
          createdDate: '15.01.2024',
          actualDeliveryDate: '18.01.2024',
          deliveryAddress: 'İstanbul, Kadıköy Mahallesi, 123. Sokak No: 45',
          deliveryPerson: 'Ahmet Yılmaz',
          trackingNumber: 'TRK123456789',
          notes: 'İşitme cihazı teslimatı başarıyla tamamlandı',
          items: [
            {
              id: 'item_001',
              materialName: 'İşitme Cihazı - Sol Kulak',
              materialCode: 'IC-001',
              quantity: 1,
              unitPrice: 1200,
              totalPrice: 1200,
              status: 'delivered',
              deliveryDate: '18.01.2024'
            },
            {
              id: 'item_002',
              materialName: 'Pil - 10\'luk Paket',
              materialCode: 'BAT-001',
              quantity: 2,
              unitPrice: 45,
              totalPrice: 90,
              status: 'delivered',
              deliveryDate: '18.01.2024'
            }
          ]
        },
        {
          id: 'del_002',
          batchNumber: 'TES-2024-002',
          status: 'in_transit',
          createdDate: '20.01.2024',
          estimatedDeliveryDate: '25.01.2024',
          deliveryAddress: 'İstanbul, Kadıköy Mahallesi, 123. Sokak No: 45',
          deliveryPerson: 'Mehmet Kaya',
          trackingNumber: 'TRK987654321',
          notes: 'Kulak kalıbı teslimatı yolda',
          items: [
            {
              id: 'item_003',
              materialName: 'Kulak Kanalı Kalıbı',
              materialCode: 'MOULD-001',
              quantity: 1,
              unitPrice: 200,
              totalPrice: 200,
              status: 'in_transit'
            }
          ]
        }
      ];

      setDeliveryBatches(mockBatches);
    } catch (error: any) {
      const errorMessage = error?.message || 'Teslimat bilgileri yüklenirken hata oluştu';
      showError('Hata', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDelivery = (batch: DeliveryBatch) => {
    setSelectedBatch(batch);
    setShowDeliveryModal(true);
  };

  const handleCreateDelivery = async () => {
    if (deliveryItems.length === 0) {
      showError('Hata', 'En az bir teslimat öğesi eklemelisiniz');
      return;
    }

    if (!deliveryAddress.trim()) {
      showError('Hata', 'Teslimat adresi zorunludur');
      return;
    }

    setIsCreatingDelivery(true);

    try {
      const newBatch: DeliveryBatch = {
        id: `del_${Date.now()}`,
        batchNumber: `TES-2024-${String(deliveryBatches.length + 1).padStart(3, '0')}`,
        status: 'preparing',
        createdDate: new Date().toLocaleDateString('tr-TR'),
        estimatedDeliveryDate,
        deliveryAddress,
        notes: deliveryNotes,
        items: deliveryItems
      };

      // Save to localStorage for now
      const existingDeliveries = JSON.parse(localStorage.getItem('xear_deliveries') || '[]');
      existingDeliveries.push(newBatch);
      localStorage.setItem('xear_deliveries', JSON.stringify(existingDeliveries));

      setDeliveryBatches(prev => [newBatch, ...prev]);

      // Log to timeline
      try {
        await timelineService.addDeviceEvent(patientId, 'delivery_created', {
          batchNumber: newBatch.batchNumber,
          itemCount: deliveryItems.length,
          totalValue: deliveryItems.reduce((sum, item) => sum + item.totalPrice, 0),
          estimatedDeliveryDate
        });
      } catch (error) {
        console.warn('Failed to log delivery creation to timeline:', error);
      }

      showSuccess('Başarılı', 'Teslimat başarıyla oluşturuldu');

      // Reset form
      setDeliveryItems([]);
      setDeliveryAddress('');
      setEstimatedDeliveryDate('');
      setDeliveryNotes('');
      setShowNewDeliveryModal(false);

    } catch (error: any) {
      const errorMessage = error?.message || 'Teslimat oluşturulurken hata oluştu';
      showError('Hata', errorMessage);
    } finally {
      setIsCreatingDelivery(false);
    }
  };

  const handleAddDeliveryItem = () => {
    const newItem: DeliveryItem = {
      id: `item_${Date.now()}`,
      materialName: '',
      materialCode: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      status: 'pending'
    };
    setDeliveryItems(prev => [...prev, newItem]);
  };

  const handleUpdateDeliveryItem = (index: number, field: keyof DeliveryItem, value: any) => {
    setDeliveryItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        // Recalculate total price if quantity or unit price changes
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleRemoveDeliveryItem = (index: number) => {
    setDeliveryItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleMarkAsDelivered = async (batchId: string) => {
    try {
      const updatedBatches = deliveryBatches.map(batch => {
        if (batch.id === batchId) {
          return {
            ...batch,
            status: 'delivered' as const,
            actualDeliveryDate: new Date().toLocaleDateString('tr-TR'),
            items: batch.items.map(item => ({
              ...item,
              status: 'delivered' as const,
              deliveryDate: new Date().toLocaleDateString('tr-TR')
            }))
          };
        }
        return batch;
      });

      setDeliveryBatches(updatedBatches);

      // Update localStorage
      localStorage.setItem('xear_deliveries', JSON.stringify(updatedBatches));

      // Log to timeline
      const batch = updatedBatches.find(b => b.id === batchId);
      if (batch) {
        await timelineService.addDeviceEvent(patientId, 'delivery_completed', {
          batchNumber: batch.batchNumber,
          itemCount: batch.items.length,
          totalValue: batch.items.reduce((sum, item) => sum + item.totalPrice, 0)
        });
      }

      showSuccess('Başarılı', 'Teslimat başarıyla tamamlandı olarak işaretlendi');

    } catch (error: any) {
      const errorMessage = error?.message || 'Teslimat güncellenirken hata oluştu';
      showError('Hata', errorMessage);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Truck className="w-5 h-5 mr-2 text-blue-600" />
            Malzeme Teslimatı
          </h3>
          <Button
            onClick={() => setShowNewDeliveryModal(true)}
            className="flex items-center"
          >
            <Package className="w-4 h-4 mr-2" />
            Yeni Teslimat
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : deliveryBatches.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Henüz teslimat bulunmuyor.</p>
            <p className="text-sm mt-2">Yeni teslimat oluşturmak için yukarıdaki butona tıklayın.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deliveryBatches.map((batch) => (
              <div key={batch.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium text-gray-900">{batch.batchNumber}</p>
                      <p className="text-sm text-gray-500">Oluşturulma: {batch.createdDate}</p>
                    </div>
                    <StatusBadge status={batch.status} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleViewDelivery(batch)}
                      variant="outline"
                      size="sm"
                    >
                      Detaylar
                    </Button>
                    {batch.status === 'in_transit' && (
                      <Button
                        onClick={() => handleMarkAsDelivered(batch.id)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Teslim Edildi
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Öğe Sayısı:</span>
                    <p className="font-medium">{batch.items.length}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Toplam Değer:</span>
                    <p className="font-medium">₺{batch.items.reduce((sum, item) => sum + item.totalPrice, 0)}</p>
                  </div>
                  {batch.estimatedDeliveryDate && (
                    <div>
                      <span className="text-gray-600">Tahmini Teslimat:</span>
                      <p className="font-medium">{batch.estimatedDeliveryDate}</p>
                    </div>
                  )}
                  {batch.actualDeliveryDate && (
                    <div>
                      <span className="text-gray-600">Gerçek Teslimat:</span>
                      <p className="font-medium">{batch.actualDeliveryDate}</p>
                    </div>
                  )}
                </div>

                {batch.trackingNumber && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-600">Takip No:</span>
                    <span className="font-mono ml-2">{batch.trackingNumber}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery Detail Modal */}
      {showDeliveryModal && selectedBatch && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Teslimat Detayları - {selectedBatch.batchNumber}
              </h3>
              <Button
                onClick={() => {
                  setShowDeliveryModal(false);
                  setSelectedBatch(null);
                }}
                variant="outline"
                size="sm"
              >
                ✕
              </Button>
            </div>

            {/* Delivery Info */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-900">Durum:</span>
                  <div className="mt-1">
                    <StatusBadge status={selectedBatch.status} />
                  </div>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Oluşturulma:</span>
                  <p className="text-blue-800">{selectedBatch.createdDate}</p>
                </div>
                {selectedBatch.estimatedDeliveryDate && (
                  <div>
                    <span className="font-medium text-blue-900">Tahmini:</span>
                    <p className="text-blue-800">{selectedBatch.estimatedDeliveryDate}</p>
                  </div>
                )}
                {selectedBatch.actualDeliveryDate && (
                  <div>
                    <span className="font-medium text-blue-900">Gerçek:</span>
                    <p className="text-blue-800">{selectedBatch.actualDeliveryDate}</p>
                  </div>
                )}
              </div>

              {selectedBatch.deliveryPerson && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex items-center text-sm">
                    <User className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-900">Teslimat Personeli:</span>
                    <span className="ml-2 text-blue-800">{selectedBatch.deliveryPerson}</span>
                  </div>
                </div>
              )}

              {selectedBatch.trackingNumber && (
                <div className="mt-2 text-sm">
                  <span className="font-medium text-blue-900">Takip Numarası:</span>
                  <span className="font-mono ml-2 text-blue-800">{selectedBatch.trackingNumber}</span>
                </div>
              )}
            </div>

            {/* Delivery Address */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-gray-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Teslimat Adresi</h4>
                  <p className="text-gray-700">{selectedBatch.deliveryAddress}</p>
                </div>
              </div>
            </div>

            {/* Delivery Items */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Teslimat Öğeleri ({selectedBatch.items.length} öğe)
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left font-medium">Malzeme</th>
                      <th className="border border-gray-300 p-3 text-left font-medium">Kod</th>
                      <th className="border border-gray-300 p-3 text-center font-medium">Miktar</th>
                      <th className="border border-gray-300 p-3 text-right font-medium">Birim Fiyat</th>
                      <th className="border border-gray-300 p-3 text-right font-medium">Toplam</th>
                      <th className="border border-gray-300 p-3 text-center font-medium">Durum</th>
                      <th className="border border-gray-300 p-3 text-center font-medium">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBatch.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-3">
                          <div className="font-medium text-gray-900">{item.materialName}</div>
                        </td>
                        <td className="border border-gray-300 p-3 text-center font-mono text-sm">
                          {item.materialCode}
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          {item.quantity}
                        </td>
                        <td className="border border-gray-300 p-3 text-right">
                          ₺{item.unitPrice.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 p-3 text-right font-medium">
                          ₺{item.totalPrice.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="border border-gray-300 p-3 text-center text-sm">
                          {item.deliveryDate || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100">
                      <td colSpan={4} className="border border-gray-300 p-3 text-right font-medium">
                        Genel Toplam:
                      </td>
                      <td className="border border-gray-300 p-3 text-right font-bold text-lg">
                        ₺{selectedBatch.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                      </td>
                      <td colSpan={2} className="border border-gray-300 p-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {selectedBatch.notes && (
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">Notlar</h4>
                <p className="text-yellow-800">{selectedBatch.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Delivery Modal */}
      {showNewDeliveryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Yeni Teslimat Oluştur
              </h3>
              <Button
                onClick={() => {
                  setShowNewDeliveryModal(false);
                  setDeliveryItems([]);
                  setDeliveryAddress('');
                  setEstimatedDeliveryDate('');
                  setDeliveryNotes('');
                }}
                variant="outline"
                size="sm"
              >
                ✕
              </Button>
            </div>

            {/* Delivery Items */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold text-gray-900">Teslimat Öğeleri</h4>
                <Button
                  onClick={handleAddDeliveryItem}
                  variant="outline"
                  size="sm"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Öğe Ekle
                </Button>
              </div>

              {deliveryItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Henüz öğe eklenmemiş.</p>
                  <p className="text-sm mt-2">Öğe eklemek için yukarıdaki butona tıklayın.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveryItems.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Malzeme Adı
                          </label>
                          <Input
                            value={item.materialName}
                            onChange={(e) => handleUpdateDeliveryItem(index, 'materialName', e.target.value)}
                            placeholder="Malzeme adı"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Kod
                          </label>
                          <Input
                            value={item.materialCode}
                            onChange={(e) => handleUpdateDeliveryItem(index, 'materialCode', e.target.value)}
                            placeholder="Malzeme kodu"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Miktar
                          </label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateDeliveryItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Birim Fiyat
                          </label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateDeliveryItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            onClick={() => handleRemoveDeliveryItem(index)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                          >
                            Sil
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        Toplam: ₺{item.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delivery Details */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teslimat Adresi *
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Teslimat adresini girin"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tahmini Teslimat Tarihi
                  </label>
                  <Input
                    type="date"
                    value={estimatedDeliveryDate}
                    onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notlar
                </label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Teslimat ile ilgili notlar"
                />
              </div>
            </div>

            {/* Summary */}
            {deliveryItems.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-green-900 mb-2">Teslimat Özeti</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Toplam Öğe:</span>
                    <p className="text-lg font-semibold text-green-900">{deliveryItems.length}</p>
                  </div>
                  <div>
                    <span className="text-green-700">Toplam Değer:</span>
                    <p className="text-lg font-semibold text-green-900">
                      ₺{deliveryItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                onClick={() => {
                  setShowNewDeliveryModal(false);
                  setDeliveryItems([]);
                  setDeliveryAddress('');
                  setEstimatedDeliveryDate('');
                  setDeliveryNotes('');
                }}
                variant="outline"
                disabled={isCreatingDelivery}
              >
                İptal
              </Button>
              <Button
                onClick={handleCreateDelivery}
                disabled={deliveryItems.length === 0 || !deliveryAddress.trim() || isCreatingDelivery}
                className="flex items-center"
              >
                {isCreatingDelivery ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Oluşturuluyor...</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4 mr-2" />
                    Teslimat Oluştur
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};