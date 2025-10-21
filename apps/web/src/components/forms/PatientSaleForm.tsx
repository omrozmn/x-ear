import React, { useState, useEffect } from 'react';
import { PatientSale } from '../../hooks/patient/usePatientSales';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { DollarSign, Calculator, Percent, CreditCard, Calendar, FileText, Plus, X } from 'lucide-react';

interface PatientSaleFormProps {
  patientId: string;
  sale?: PatientSale | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (saleData: Partial<PatientSale>) => Promise<void>;
  isLoading?: boolean;
}

interface DeviceSelection {
  id: string;
  name: string;
  brand: string;
  model: string;
  ear: 'left' | 'right';
  listPrice: number;
  salePrice: number;
  sgkCoverageAmount: number;
  patientResponsibleAmount: number;
}

export const PatientSaleForm: React.FC<PatientSaleFormProps> = ({
  patientId,
  sale,
  isOpen,
  onClose,
  onSave,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<Partial<PatientSale>>({
    patientId,
    saleDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'pending',
    status: 'pending',
    discountAmount: 0,
    paidAmount: 0,
    sgkCoverage: 0,
    totalAmount: 0,
    finalAmount: 0
  });

  const [devices, setDevices] = useState<DeviceSelection[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or sale changes
  useEffect(() => {
    if (isOpen) {
      if (sale) {
        // Edit mode
        setFormData({
          ...sale,
          saleDate: sale.saleDate.split('T')[0] // Convert to date input format
        });
        // TODO: Load devices from sale data
        setDevices(sale.devices?.map(d => ({
          id: d.id,
          name: d.name,
          brand: d.brand,
          model: d.model,
          ear: (d.ear as 'left' | 'right') || 'right',
          listPrice: d.listPrice || 0,
          salePrice: d.salePrice || 0,
          sgkCoverageAmount: d.sgkCoverageAmount || 0,
          patientResponsibleAmount: d.patientResponsibleAmount || 0
        })) || []);
      } else {
        // Create mode
        setFormData({
          patientId,
          saleDate: new Date().toISOString().split('T')[0],
          paymentStatus: 'pending',
          status: 'pending',
          discountAmount: 0,
          paidAmount: 0,
          sgkCoverage: 0,
          totalAmount: 0,
          finalAmount: 0
        });
        setDevices([]);
      }
      setSelectedProduct('');
      setErrors({});
    }
  }, [isOpen, sale, patientId]);

  // Calculate totals when devices or discount changes
  useEffect(() => {
    const totalListPrice = devices.reduce((sum, device) => sum + device.listPrice, 0);
    const totalSalePrice = devices.reduce((sum, device) => sum + device.salePrice, 0);
    const totalSgkCoverage = devices.reduce((sum, device) => sum + device.sgkCoverageAmount, 0);

    const discountAmount = formData.discountAmount || 0;
    const finalAmount = Math.max(0, totalSalePrice - discountAmount);

    setFormData(prev => ({
      ...prev,
      listPriceTotal: totalListPrice,
      totalAmount: totalSalePrice,
      finalAmount,
      sgkCoverage: totalSgkCoverage,
      patientPayment: finalAmount - totalSgkCoverage
    }));
  }, [devices, formData.discountAmount]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedProduct.trim()) {
      newErrors.productId = 'Ürün seçimi zorunludur';
    }

    if (devices.length === 0) {
      newErrors.devices = 'En az bir cihaz seçilmelidir';
    }

    if (!formData.saleDate) {
      newErrors.saleDate = 'Satış tarihi zorunludur';
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Ödeme yöntemi zorunludur';
    }

    if ((formData.discountAmount || 0) > (formData.totalAmount || 0)) {
      newErrors.discountAmount = 'İndirim tutarı toplam tutardan fazla olamaz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const saleData: Partial<PatientSale> = {
        ...formData,
        productId: selectedProduct,
        devices: devices.map(d => ({
          id: d.id,
          name: d.name,
          brand: d.brand,
          model: d.model,
          ear: d.ear,
          listPrice: d.listPrice,
          salePrice: d.salePrice,
          sgkCoverageAmount: d.sgkCoverageAmount,
          patientResponsibleAmount: d.patientResponsibleAmount
        }))
      };

      await onSave(saleData);
      onClose();
    } catch (error) {
      console.error('Satış kaydedilirken hata:', error);
    }
  };

  const addDevice = () => {
    const newDevice: DeviceSelection = {
      id: `device_${Date.now()}`,
      name: '',
      brand: '',
      model: '',
      ear: 'right',
      listPrice: 0,
      salePrice: 0,
      sgkCoverageAmount: 0,
      patientResponsibleAmount: 0
    };
    setDevices([...devices, newDevice]);
  };

  const removeDevice = (index: number) => {
    setDevices(devices.filter((_, i) => i !== index));
  };

  const updateDevice = (index: number, updates: Partial<DeviceSelection>) => {
    setDevices(devices.map((device, i) =>
      i === index ? { ...device, ...updates } : device
    ));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={sale ? 'Satış Düzenle' : 'Yeni Satış'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ürün Seçimi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ürün *
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.productId ? 'border-red-300' : ''}`}
          >
            <option value="">Ürün seçin...</option>
            <option value="hearing_aid_basic">Temel İşitme Cihazı</option>
            <option value="hearing_aid_advanced">Gelişmiş İşitme Cihazı</option>
            <option value="hearing_aid_premium">Premium İşitme Cihazı</option>
          </select>
          {errors.productId && (
            <p className="mt-1 text-sm text-red-600">{errors.productId}</p>
          )}
        </div>

        {/* Cihaz Seçimi */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Cihazlar *
            </label>
            <button
              type="button"
              onClick={addDevice}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-1" />
              Cihaz Ekle
            </button>
          </div>

          {devices.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">Henüz cihaz eklenmemiş</p>
              <button
                type="button"
                onClick={addDevice}
                className="mt-2 inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                İlk Cihazı Ekle
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {devices.map((device, index) => (
                <div key={device.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">Cihaz {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeDevice(index)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cihaz Adı
                      </label>
                      <input
                        type="text"
                        value={device.name}
                        onChange={(e) => updateDevice(index, { name: e.target.value })}
                        placeholder="Örn: İşitme Cihazı"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kulak
                      </label>
                      <select
                        value={device.ear}
                        onChange={(e) => updateDevice(index, { ear: e.target.value as 'left' | 'right' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="right">Sağ Kulak</option>
                        <option value="left">Sol Kulak</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Marka
                      </label>
                      <input
                        type="text"
                        value={device.brand}
                        onChange={(e) => updateDevice(index, { brand: e.target.value })}
                        placeholder="Örn: Phonak"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Model
                      </label>
                      <input
                        type="text"
                        value={device.model}
                        onChange={(e) => updateDevice(index, { model: e.target.value })}
                        placeholder="Örn: Audeo B90"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Liste Fiyatı
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          value={device.listPrice}
                          onChange={(e) => updateDevice(index, { listPrice: Number(e.target.value) })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Satış Fiyatı
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          value={device.salePrice}
                          onChange={(e) => updateDevice(index, { salePrice: Number(e.target.value) })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SGK Desteği
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          value={device.sgkCoverageAmount}
                          onChange={(e) => updateDevice(index, { sgkCoverageAmount: Number(e.target.value) })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hasta Payı
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          value={device.patientResponsibleAmount}
                          onChange={(e) => updateDevice(index, { patientResponsibleAmount: Number(e.target.value) })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {errors.devices && (
            <p className="mt-1 text-sm text-red-600">{errors.devices}</p>
          )}
        </div>

        {/* Fiyat Özeti */}
        {devices.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Calculator className="w-4 h-4 mr-2" />
              Fiyat Özeti
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Liste Fiyatı Toplamı:</span>
                <span>{formatCurrency(formData.listPriceTotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Satış Fiyatı Toplamı:</span>
                <span>{formatCurrency(formData.totalAmount || 0)}</span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Percent className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    value={formData.discountAmount || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountAmount: Number(e.target.value) }))}
                    placeholder="İndirim tutarı"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-between font-medium text-lg border-t pt-2">
                <span>Net Tutar:</span>
                <span>{formatCurrency(formData.finalAmount || 0)}</span>
              </div>

              <div className="flex justify-between text-green-600">
                <span>SGK Desteği:</span>
                <span>-{formatCurrency(formData.sgkCoverage || 0)}</span>
              </div>

              <div className="flex justify-between font-medium text-blue-600 border-t pt-2">
                <span>Hasta Ödeme Tutarı:</span>
                <span>{formatCurrency((formData.patientPayment || 0))}</span>
              </div>
            </div>
          </div>
        )}

        {/* SGK Bilgileri */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SGK Şeması
            </label>
            <input
              type="text"
              value={formData.sgkScheme || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, sgkScheme: e.target.value }))}
              placeholder="Örn: SGK-1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SGK Grubu
            </label>
            <input
              type="text"
              value={formData.sgkGroup || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, sgkGroup: e.target.value }))}
              placeholder="Örn: Grup A"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Ödeme Bilgileri */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ödeme Yöntemi *
            </label>
            <select
              value={formData.paymentMethod || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.paymentMethod ? 'border-red-300' : ''}`}
            >
              <option value="">Seçin...</option>
              <option value="cash">Nakit</option>
              <option value="card">Kredi Kartı</option>
              <option value="installment">Taksit</option>
              <option value="insurance">Sigorta</option>
            </select>
            {errors.paymentMethod && (
              <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Satış Tarihi *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={formData.saleDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, saleDate: e.target.value }))}
                className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.saleDate ? 'border-red-300' : ''}`}
              />
              {errors.saleDate && (
                <p className="mt-1 text-sm text-red-600">{errors.saleDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Ödenen Tutar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ödenen Tutar
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <CreditCard className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="number"
              value={formData.paidAmount || 0}
              onChange={(e) => setFormData(prev => ({ ...prev, paidAmount: Number(e.target.value) }))}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Notlar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notlar
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 pt-3 flex items-start pointer-events-none">
              <FileText className="w-4 h-4 text-gray-400" />
            </div>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Satış ile ilgili notlar..."
              rows={3}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? 'Kaydediliyor...' : (sale ? 'Güncelle' : 'Satış Oluştur')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};