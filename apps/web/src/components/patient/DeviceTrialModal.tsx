import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '@x-ear/ui-web';
import { Calendar, Clock, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface DeviceTrial {
  id?: string;
  patientId: string;
  deviceId: string;
  deviceName?: string;
  brand: string;
  model: string;
  serialNumber?: string;
  startDate: string;
  endDate: string;
  extendedUntil?: string;
  status: 'active' | 'completed' | 'cancelled';
  result?: 'purchased' | 'returned' | 'extended';
  notes?: string;
  trialPrice?: number;
  listPrice?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface DeviceTrialModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (trialData: Partial<DeviceTrial>) => Promise<void>;
  trial?: DeviceTrial | null;
  device?: any;
  patientId: string;
  isLoading?: boolean;
}

export const DeviceTrialModal: React.FC<DeviceTrialModalProps> = ({
  open,
  onClose,
  onSave,
  trial,
  device,
  patientId,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<Partial<DeviceTrial>>({
    patientId,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
    trialPrice: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (trial) {
      setFormData({
        ...trial,
        startDate: trial.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        endDate: trial.endDate?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        extendedUntil: trial.extendedUntil?.split('T')[0] || ''
      });
    } else if (device) {
      // Pre-populate with device information
      setFormData({
        patientId,
        deviceId: device.id,
        deviceName: `${device.brand || ''} ${device.model || ''}`.trim(),
        brand: device.brand || '',
        model: device.model || '',
        serialNumber: device.serialNumber || '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        trialPrice: device.price ? parseFloat(device.price) * 0.1 : 0, // 10% of device price as trial fee
        listPrice: device.price ? parseFloat(device.price) : 0
      });
    } else {
      setFormData({
        patientId,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        trialPrice: 0
      });
    }
    setErrors({});
  }, [trial, device, patientId, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.brand?.trim()) {
      newErrors.brand = 'Marka gereklidir';
    }

    if (!formData.model?.trim()) {
      newErrors.model = 'Model gereklidir';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Başlangıç tarihi gereklidir';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'Bitiş tarihi gereklidir';
    }

    if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır';
    }

    if (formData.extendedUntil && formData.endDate && new Date(formData.extendedUntil) <= new Date(formData.endDate)) {
      newErrors.extendedUntil = 'Uzatma tarihi bitiş tarihinden sonra olmalıdır';
    }

    if (formData.trialPrice && formData.trialPrice < 0) {
      newErrors.trialPrice = 'Deneme ücreti negatif olamaz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // Prepare data for backend API
      const trialData = {
        ...formData,
        // Convert dates to ISO format for backend
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        extendedUntil: formData.extendedUntil ? new Date(formData.extendedUntil).toISOString() : undefined,
      };

      await onSave(trialData);
      onClose();
    } catch (error) {
      console.error('Trial save error:', error);
      setErrors({ submit: 'Deneme kaydedilirken bir hata oluştu' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof DeviceTrial, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getTrialDuration = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  return (
    <Modal open={open} onClose={onClose} title={trial ? 'Deneme Düzenle' : 'Yeni Deneme Başlat'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Device Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Cihaz Bilgileri
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marka *
              </label>
              <Input
                value={formData.brand || ''}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                placeholder="Cihaz markası"
                error={errors.brand}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model *
              </label>
              <Input
                value={formData.model || ''}
                onChange={(e) => handleInputChange('model', e.target.value)}
                placeholder="Cihaz modeli"
                error={errors.model}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seri Numarası
              </label>
              <Input
                value={formData.serialNumber || ''}
                onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                placeholder="Seri numarası"
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* Trial Period */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Deneme Süresi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Başlangıç Tarihi *
              </label>
              <Input
                type="date"
                value={formData.startDate || ''}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                error={errors.startDate}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bitiş Tarihi *
              </label>
              <Input
                type="date"
                value={formData.endDate || ''}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                error={errors.endDate}
                disabled={saving}
              />
            </div>
            {formData.status === 'active' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uzatma Tarihi
                </label>
                <Input
                  type="date"
                  value={formData.extendedUntil || ''}
                  onChange={(e) => handleInputChange('extendedUntil', e.target.value)}
                  error={errors.extendedUntil}
                  disabled={saving}
                />
              </div>
            )}
          </div>
          {getTrialDuration() > 0 && (
            <div className="mt-3 p-2 bg-blue-100 rounded text-sm text-blue-800">
              <Clock className="w-4 h-4 inline mr-1" />
              Deneme süresi: {getTrialDuration()} gün
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Fiyatlandırma
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deneme Ücreti (₺)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.trialPrice || ''}
                onChange={(e) => handleInputChange('trialPrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                error={errors.trialPrice}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Liste Fiyatı (₺)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.listPrice || ''}
                onChange={(e) => handleInputChange('listPrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* Status and Result */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Durum"
              value={formData.status || 'active'}
              onChange={(e) => handleInputChange('status', e.target.value)}
              disabled={saving}
              options={[
                { value: 'active', label: 'Aktif' },
                { value: 'completed', label: 'Tamamlandı' },
                { value: 'cancelled', label: 'İptal Edildi' }
              ]}
            />
          </div>
          {formData.status === 'completed' && (
            <div>
              <Select
                label="Sonuç"
                value={formData.result || ''}
                onChange={(e) => handleInputChange('result', e.target.value)}
                disabled={saving}
                options={[
                  { value: '', label: 'Seçiniz' },
                  { value: 'purchased', label: 'Satın Alındı' },
                  { value: 'returned', label: 'İade Edildi' },
                  { value: 'extended', label: 'Uzatıldı' }
                ]}
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notlar
          </label>
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Deneme ile ilgili notlar..."
            rows={3}
            disabled={saving}
          />
        </div>

        {/* Error Display */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700">{errors.submit}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            İptal
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saving || isLoading}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {trial ? 'Güncelle' : 'Deneme Başlat'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};