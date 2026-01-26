import React, { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input, Select, Textarea } from '@x-ear/ui-web';
import { timelineService } from '../../../services/timeline.service';
import type { DeviceRead } from '@/api/generated/schemas';
import { 
  FileText, 
  Calendar, 
  Clock, 
  DollarSign, 
  RotateCcw, 
  Plus, 
  TrendingUp, 
  AlertCircle, 
  Loader2, 
  CheckCircle 
} from 'lucide-react';

interface DeviceTrial {
  id?: string;
  partyId: string;
  deviceId: string;
  deviceName?: string;
  brand: string;
  model: string;
  serialNumber?: string;
  startDate: string;
  endDate: string;
  extendedUntil?: string;
  status: 'active' | 'completed' | 'cancelled' | 'extended';
  result?: 'purchased' | 'returned' | 'extended' | 'cancelled';
  notes?: string;
  trialPrice?: number;
  listPrice?: number;
  sgkScheme?: string;
  sgkSupport?: number;
  discountType?: 'none' | 'percentage' | 'amount';
  discountValue?: number;
  netTrialPrice?: number;
  extensions?: TrialExtension[];
  createdAt?: string;
  updatedAt?: string;
}

interface TrialExtension {
  id: string;
  extendedFrom: string;
  extendedTo: string;
  reason: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

interface DeviceTrialModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (trialData: Partial<DeviceTrial>) => Promise<void>;
  trial?: DeviceTrial | null;
  device?: DeviceRead;
  partyId: string;
  isLoading?: boolean;
}

export const DeviceTrialModal: React.FC<DeviceTrialModalProps> = ({
  open,
  onClose,
  onSave,
  trial,
  device,
  partyId,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<Partial<DeviceTrial>>({
    partyId,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
    trialPrice: 0,
    discountType: 'none',
    discountValue: 0,
    extensions: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [extensionData, setExtensionData] = useState({
    extendedTo: '',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    if (trial) {
      setFormData({
        ...trial,
        startDate: trial.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        endDate: trial.endDate?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        extendedUntil: trial.extendedUntil?.split('T')[0] || '',
        discountType: trial.discountType || 'none',
        discountValue: trial.discountValue || 0,
        extensions: trial.extensions || []
      });
    } else if (device) {
      // Pre-populate with device information
      const basePrice = device.price || 0;
      const trialPrice = basePrice * 0.1; // 10% of device price as trial fee

      setFormData({
        partyId,
        deviceId: device.id,
        deviceName: `${device.brand || ''} ${device.model || ''}`.trim(),
        brand: device.brand || '',
        model: device.model || '',
        serialNumber: device.serialNumber || '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        trialPrice: trialPrice,
        listPrice: basePrice,
        discountType: 'none',
        discountValue: 0,
        netTrialPrice: trialPrice,
        extensions: []
      });
    } else {
      setFormData({
        partyId,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        trialPrice: 0,
        discountType: 'none',
        discountValue: 0,
        extensions: []
      });
    }
    setErrors({});
    setShowExtensionForm(false);
    setExtensionData({ extendedTo: '', reason: '', notes: '' });
  }, [trial, device, partyId, open]);

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

    if (formData.discountValue && formData.discountValue < 0) {
      newErrors.discountValue = 'İndirim değeri negatif olamaz';
    }

    if (formData.discountType === 'percentage' && formData.discountValue && formData.discountValue > 100) {
      newErrors.discountValue = 'Yüzde indirimi 100\'den fazla olamaz';
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
      // Calculate net trial price before saving
      const netTrialPrice = calculateNetTrialPrice();

      // Prepare data for backend API
      const trialData = {
        ...formData,
        netTrialPrice,
        // Convert dates to ISO format for backend
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        extendedUntil: formData.extendedUntil ? new Date(formData.extendedUntil).toISOString() : undefined,
      };

      await onSave(trialData);
      onClose();

      // Log trial status change to timeline
      if (trialData.status === 'completed' || trialData.status === 'cancelled') {
        try {
          const eventType = trialData.status === 'completed' ? 'device_trial_completed' : 'device_trial_cancelled';
          await timelineService.addDeviceEvent(partyId, eventType, {
            deviceName: `${trialData.brand} ${trialData.model}`,
            ear: 'both', // Could be enhanced to track specific ear
            result: trialData.result,
            netPayable: trialData.netTrialPrice,
            reason: trialData.result === 'cancelled' ? 'Trial cancelled by user/system' : undefined,
            finalStatus: trialData.status
          });
        } catch (error) {
          console.warn('Failed to log trial completion to timeline:', error);
        }
      }
    } catch (error) {
      console.error('Trial save error:', error);
      setErrors({ submit: 'Deneme kaydedilirken bir hata oluştu' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof DeviceTrial, value: DeviceTrial[typeof field]) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate net trial price when pricing fields change
      if (['trialPrice', 'discountType', 'discountValue', 'sgkScheme'].includes(field)) {
        const basePrice = field === 'trialPrice' ? value as number : (updated.trialPrice || 0);
        const discountType = field === 'discountType' ? value as DeviceTrial['discountType'] : updated.discountType;
        const discountValue = field === 'discountValue' ? value as number : (updated.discountValue || 0);
        const sgkScheme = field === 'sgkScheme' ? value as string : updated.sgkScheme;

        let afterDiscount = basePrice;
        if (discountType === 'percentage') {
          afterDiscount = basePrice * (1 - discountValue / 100);
        } else if (discountType === 'amount') {
          afterDiscount = Math.max(0, basePrice - discountValue);
        }

        const sgkSupport = getSGKSupportAmount(sgkScheme);
        updated.netTrialPrice = Math.max(0, afterDiscount - sgkSupport);
      }

      return updated;
    });
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const calculateNetTrialPrice = () => {
    const basePrice = formData.trialPrice || 0;
    const discountValue = formData.discountValue || 0;
    const sgkScheme = formData.sgkScheme;

    // Calculate discounted price first
    let afterDiscount = basePrice;
    if (formData.discountType === 'percentage') {
      afterDiscount = basePrice * (1 - discountValue / 100);
    } else if (formData.discountType === 'amount') {
      afterDiscount = Math.max(0, basePrice - discountValue);
    }

    // Apply SGK support if scheme is selected
    const sgkSupport = getSGKSupportAmount(sgkScheme);
    const netPrice = Math.max(0, afterDiscount - sgkSupport);

    return netPrice;
  };

  const getSGKSupportAmount = (scheme?: string): number => {
    const sgkAmounts: Record<string, number> = {
      'NoCoverage': 0,
      'Under4_ParentWorking': 6104.44,
      'Under4_ParentRetired': 7630.56,
      'Age5_12_ParentWorking': 5426.17,
      'Age5_12_ParentRetired': 6782.72,
      'Age13_18_ParentWorking': 5087.04,
      'Age13_18_ParentRetired': 6358.88,
      'Over18_Working': 3391.36,
      'Over18_Retired': 4239.20
    };
    return sgkAmounts[scheme || ''] || 0;
  };

  const handleAddExtension = async () => {
    if (!extensionData.extendedTo || !extensionData.reason) {
      setErrors({ extension: 'Uzatma tarihi ve sebebi gereklidir' });
      return;
    }

    const newExtension: TrialExtension = {
      id: `ext_${Date.now()}`,
      extendedFrom: formData.endDate || '',
      extendedTo: extensionData.extendedTo,
      reason: extensionData.reason,
      notes: extensionData.notes,
      approvedAt: new Date().toISOString()
    };

    setFormData(prev => ({
      ...prev,
      extensions: [...(prev.extensions || []), newExtension],
      endDate: extensionData.extendedTo,
      status: 'extended'
    }));

    setShowExtensionForm(false);
    setExtensionData({ extendedTo: '', reason: '', notes: '' });
    setErrors({});

    // Log trial extension to timeline
    try {
      await timelineService.addDeviceEvent(partyId, 'device_trial_extended', {
        deviceName: `${formData.brand} ${formData.model}`,
        ear: 'both', // Could be enhanced to track specific ear
        newEndDate: extensionData.extendedTo,
        reason: extensionData.reason,
        notes: extensionData.notes,
        extensionCount: (formData.extensions?.length || 0) + 1
      });
    } catch (error) {
      console.warn('Failed to log trial extension to timeline:', error);
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

  const getDaysRemaining = () => {
    if (formData.endDate) {
      const end = new Date(formData.endDate);
      const today = new Date();
      const diffTime = end.getTime() - today.getTime();
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
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <DollarSign className="w-4 h-4 mr-2" />
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
                SGK Şeması
              </label>
              <Select
                value={formData.sgkScheme || ''}
                onChange={(e) => handleInputChange('sgkScheme', e.target.value)}
                disabled={saving}
                options={[
                  { value: '', label: 'SGK Yok' },
                  { value: 'NoCoverage', label: 'Kapsam Dışı' },
                  { value: 'Under4_ParentWorking', label: '0-4, Çalışan Ebeveyn' },
                  { value: 'Under4_ParentRetired', label: '0-4, Emekli Ebeveyn' },
                  { value: 'Age5_12_ParentWorking', label: '5-12, Çalışan Ebeveyn' },
                  { value: 'Age5_12_ParentRetired', label: '5-12, Emekli Ebeveyn' },
                  { value: 'Age13_18_ParentWorking', label: '13-18, Çalışan Ebeveyn' },
                  { value: 'Age13_18_ParentRetired', label: '13-18, Emekli Ebeveyn' },
                  { value: 'Over18_Working', label: '18+, Çalışan' },
                  { value: 'Over18_Retired', label: '18+, Emekli' }
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İndirim Türü
              </label>
              <Select
                value={formData.discountType || 'none'}
                onChange={(e) => handleInputChange('discountType', e.target.value)}
                disabled={saving}
                options={[
                  { value: 'none', label: 'İndirim Yok' },
                  { value: 'percentage', label: 'Yüzde (%)' },
                  { value: 'amount', label: 'Tutar (₺)' }
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İndirim Değeri
              </label>
              <Input
                type="number"
                step={formData.discountType === 'percentage' ? '1' : '0.01'}
                min="0"
                max={formData.discountType === 'percentage' ? '100' : undefined}
                value={formData.discountValue || ''}
                onChange={(e) => handleInputChange('discountValue', parseFloat(e.target.value) || 0)}
                placeholder={formData.discountType === 'percentage' ? '%' : '₺'}
                error={errors.discountValue}
                disabled={saving || formData.discountType === 'none'}
              />
            </div>
          </div>
          
          {/* Net Price Display */}
          <div className="mt-4 p-3 bg-white rounded border">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Deneme Ücreti:</span>
                <span className="text-sm">₺{formData.trialPrice?.toFixed(2) || '0.00'}</span>
              </div>
              {formData.discountType !== 'none' && (formData.discountValue || 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    İndirim ({formData.discountType === 'percentage' ? `${formData.discountValue}%` : `₺${formData.discountValue?.toFixed(2)}`}):
                  </span>
                  <span className="text-sm text-red-600">
                    -₺{(formData.trialPrice || 0) - calculateNetTrialPrice() + getSGKSupportAmount(formData.sgkScheme).toFixed(2)}
                  </span>
                </div>
              )}
              {getSGKSupportAmount(formData.sgkScheme) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">SGK Desteği:</span>
                  <span className="text-sm text-green-600">
                    -₺{getSGKSupportAmount(formData.sgkScheme).toFixed(2)}
                  </span>
                </div>
              )}
              <hr className="border-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Net Ödenecek:</span>
                <span className="text-lg font-bold text-green-600">
                  ₺{calculateNetTrialPrice().toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Trial Extensions */}
        {formData.extensions && formData.extensions.length > 0 && (
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <RotateCcw className="w-4 h-4 mr-2" />
              Deneme Uzatmaları
            </h3>
            <div className="space-y-2">
              {formData.extensions.map((extension, index) => (
                <div key={extension.id} className="bg-white p-3 rounded border">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        Uzatma {index + 1}: {extension.extendedFrom} → {extension.extendedTo}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Sebep: {extension.reason}
                      </div>
                      {extension.notes && (
                        <div className="text-sm text-gray-500 mt-1">
                          Not: {extension.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Extension Form */}
        {formData.status === 'active' && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900 flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Deneme Uzatma
              </h3>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowExtensionForm(!showExtensionForm)}
                disabled={saving}
              >
                {showExtensionForm ? 'İptal' : 'Uzatma Ekle'}
              </Button>
            </div>

            {showExtensionForm && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Yeni Bitiş Tarihi *
                    </label>
                    <Input
                      type="date"
                      value={extensionData.extendedTo}
                      onChange={(e) => setExtensionData(prev => ({ ...prev, extendedTo: e.target.value }))}
                      min={formData.endDate}
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Uzatma Sebebi *
                    </label>
                    <Select
                      value={extensionData.reason}
                      onChange={(e) => setExtensionData(prev => ({ ...prev, reason: e.target.value }))}
                      disabled={saving}
                      options={[
                        { value: '', label: 'Sebep seçin' },
                        { value: 'party_request', label: 'Hasta Talebi' },
                        { value: 'medical_reason', label: 'Tıbbi Sebep' },
                        { value: 'technical_issue', label: 'Teknik Sorun' },
                        { value: 'adaptation_period', label: 'Uyum Süreci' },
                        { value: 'other', label: 'Diğer' }
                      ]}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notlar
                  </label>
                  <Textarea
                    value={extensionData.notes}
                    onChange={(e) => setExtensionData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Uzatma ile ilgili notlar..."
                    rows={2}
                    disabled={saving}
                  />
                </div>
                {errors.extension && (
                  <p className="text-sm text-red-600">{errors.extension}</p>
                )}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddExtension}
                    disabled={saving}
                  >
                    Uzatmayı Ekle
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trial Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Deneme Özeti
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="bg-white p-3 rounded border">
              <div className="text-2xl font-bold text-blue-600">{getTrialDuration()}</div>
              <div className="text-sm text-gray-600">Toplam Gün</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className={`text-2xl font-bold ${getDaysRemaining() > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {getDaysRemaining()}
              </div>
              <div className="text-sm text-gray-600">Kalan Gün</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-2xl font-bold text-purple-600">{formData.extensions?.length || 0}</div>
              <div className="text-sm text-gray-600">Uzatma</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-2xl font-bold text-green-600">₺{getSGKSupportAmount(formData.sgkScheme).toFixed(2)}</div>
              <div className="text-sm text-gray-600">SGK Desteği</div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-2xl font-bold text-green-600">₺{calculateNetTrialPrice().toFixed(2)}</div>
              <div className="text-sm text-gray-600">Net Ödeme</div>
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
                { value: 'extended', label: 'Uzatıldı' },
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
                  { value: 'extended', label: 'Uzatıldı' },
                  { value: 'cancelled', label: 'İptal Edildi' },
                  { value: 'lost', label: 'Kayıp' },
                  { value: 'damaged', label: 'Hasarlı' }
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