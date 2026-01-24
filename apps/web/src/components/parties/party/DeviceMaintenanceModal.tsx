import React, { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input, Select, Textarea } from '@x-ear/ui-web';
import { PartyDevice } from '../../../types/party';
import { Wrench, Calendar, Clock, DollarSign, User, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface DeviceMaintenanceModalProps {
  open: boolean;
  onClose: () => void;
  device: PartyDevice | null;
  onSubmit: (maintenanceData: DeviceMaintenanceData) => Promise<void>;
  isLoading?: boolean;
}

export interface DeviceMaintenanceData {
  id?: string;
  deviceId: string;
  maintenanceType: 'repair' | 'cleaning' | 'calibration' | 'replacement' | 'other';
  description: string;
  scheduledDate: string;
  estimatedDuration: number; // in days
  cost?: number;
  technician?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
}

export const DeviceMaintenanceModal: React.FC<DeviceMaintenanceModalProps> = ({
  open,
  onClose,
  device,
  onSubmit,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<DeviceMaintenanceData>({
    deviceId: device?.id || '',
    maintenanceType: 'repair',
    description: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    estimatedDuration: 1,
    priority: 'medium',
    status: 'scheduled',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (device && open) {
      setFormData(prev => ({
        ...prev,
        deviceId: device.id,
      }));
    }
    setErrors({});
  }, [device, open]);

  const handleInputChange = (field: keyof DeviceMaintenanceData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Bakım açıklaması gereklidir';
    }

    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Planlanan tarih gereklidir';
    }

    // Check if scheduled date is in the past
    const scheduledDate = new Date(formData.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (scheduledDate < today) {
      newErrors.scheduledDate = 'Planlanan tarih bugünden önce olamaz';
    }

    if (formData.estimatedDuration <= 0) {
      newErrors.estimatedDuration = 'Tahmini süre pozitif bir değer olmalıdır';
    }

    if (formData.estimatedDuration > 365) {
      newErrors.estimatedDuration = 'Tahmini süre 365 günden fazla olamaz';
    }

    if (formData.cost && formData.cost < 0) {
      newErrors.cost = 'Maliyet negatif olamaz';
    }

    if (formData.technician && formData.technician.trim().length < 2) {
      newErrors.technician = 'Teknisyen adı en az 2 karakter olmalıdır';
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
      const maintenanceData = {
        ...formData,
        // Convert date to ISO format for backend
        scheduledDate: new Date(formData.scheduledDate).toISOString(),
      };

      await onSubmit(maintenanceData);
      onClose();
    } catch (error) {
      console.error('Maintenance save error:', error);
      setErrors({ submit: 'Bakım kaydedilirken bir hata oluştu' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      deviceId: device?.id || '',
      maintenanceType: 'repair',
      description: '',
      scheduledDate: new Date().toISOString().split('T')[0],
      estimatedDuration: 1,
      priority: 'medium',
      status: 'scheduled',
    });
    setErrors({});
    onClose();
  };

  const title = device 
    ? `Cihaz Bakımı - ${device.brand} ${device.model} (${device.serialNumber})`
    : 'Cihaz Bakımı';

  const maintenanceTypeOptions = [
    { value: 'repair', label: 'Onarım' },
    { value: 'cleaning', label: 'Temizlik' },
    { value: 'calibration', label: 'Kalibrasyon' },
    { value: 'replacement', label: 'Parça Değişimi' },
    { value: 'other', label: 'Diğer' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Düşük' },
    { value: 'medium', label: 'Orta' },
    { value: 'high', label: 'Yüksek' },
    { value: 'urgent', label: 'Acil' },
  ];

  const statusOptions = [
    { value: 'scheduled', label: 'Planlandı' },
    { value: 'in_progress', label: 'Devam Ediyor' },
    { value: 'completed', label: 'Tamamlandı' },
    { value: 'cancelled', label: 'İptal Edildi' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getEstimatedEndDate = () => {
    if (formData.scheduledDate && formData.estimatedDuration) {
      const startDate = new Date(formData.scheduledDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + formData.estimatedDuration);
      return endDate.toLocaleDateString('tr-TR');
    }
    return null;
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Device Information */}
        {device && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Wrench className="w-4 h-4 mr-2" />
              Cihaz Bilgileri
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Cihaz:</span>
                <span className="ml-2 font-medium">{device.brand} {device.model}</span>
              </div>
              <div>
                <span className="text-gray-600">Seri No:</span>
                <span className="ml-2 font-medium">{device.serialNumber}</span>
              </div>
              {device.warrantyExpiry && (
                <div className="col-span-2">
                  <span className="text-gray-600">Garanti Bitiş:</span>
                  <span className="ml-2 font-medium">
                    {new Date(device.warrantyExpiry).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Maintenance Type and Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Bakım Türü *"
              value={formData.maintenanceType}
              onChange={(e) => handleInputChange('maintenanceType', e.target.value)}
              options={maintenanceTypeOptions}
              disabled={saving}
              error={errors.maintenanceType}
            />
          </div>
          <div>
            <Select
              label="Öncelik *"
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              options={priorityOptions}
              disabled={saving}
            />
            {formData.priority && (
              <div className={`mt-2 px-2 py-1 rounded text-xs font-medium ${getPriorityColor(formData.priority)}`}>
                {priorityOptions.find(opt => opt.value === formData.priority)?.label} Öncelik
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bakım Açıklaması *
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Yapılacak bakım işlemlerini detaylı olarak açıklayın"
            rows={3}
            disabled={saving}
            error={errors.description}
          />
        </div>

        {/* Scheduling */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Planlama
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planlanan Tarih *
              </label>
              <Input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                error={errors.scheduledDate}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tahmini Süre (Gün) *
              </label>
              <Input
                type="number"
                min="1"
                max="365"
                value={formData.estimatedDuration}
                onChange={(e) => handleInputChange('estimatedDuration', parseInt(e.target.value) || 1)}
                error={errors.estimatedDuration}
                disabled={saving}
              />
            </div>
          </div>
          {getEstimatedEndDate() && (
            <div className="mt-3 p-2 bg-blue-100 rounded text-sm text-blue-800">
              <Clock className="w-4 h-4 inline mr-1" />
              Tahmini bitiş tarihi: {getEstimatedEndDate()}
            </div>
          )}
        </div>

        {/* Cost and Technician */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <DollarSign className="w-4 h-4 mr-1" />
              Tahmini Maliyet (₺)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.cost || ''}
              onChange={(e) => handleInputChange('cost', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="0.00"
              error={errors.cost}
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <User className="w-4 h-4 mr-1" />
              Teknisyen
            </label>
            <Input
              type="text"
              value={formData.technician || ''}
              onChange={(e) => handleInputChange('technician', e.target.value)}
              placeholder="Teknisyen adı"
              error={errors.technician}
              disabled={saving}
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <Select
            label="Durum *"
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            options={statusOptions}
            disabled={saving}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notlar
          </label>
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Ek notlar ve özel talimatlar"
            rows={2}
            disabled={saving}
          />
        </div>

        {/* Error Display */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700">{errors.submit}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
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
                Bakım Planla
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};