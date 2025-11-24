import React, { useState, useEffect } from 'react';
import { PatientDevice } from '../../types/patient';
import { Modal } from '../ui/Modal';
import { Input, Select, Textarea, Button } from '@x-ear/ui-web';
import {
  Search,
  Calendar,
  DollarSign,
  CreditCard,
  Calculator,
  Clock,
  FileText,
  CheckCircle
} from 'lucide-react';

interface DeviceEditModalProps {
  open: boolean;
  device: PatientDevice | null;
  onClose: () => void;
  onSave: (device: PatientDevice) => void;
}

interface DeviceInventoryItem {
  id: string;
  brand: string;
  model: string;
  type: 'hearing_aid' | 'cochlear_implant' | 'bone_anchored';
  listPrice: number;
  availableSerials: string[];
  specifications?: Record<string, string | number | boolean>;
}

interface ExtendedFormData extends Partial<PatientDevice> {
  discountValue?: number;
  discountType?: 'amount' | 'percentage';
  downPayment?: number;
}

export const DeviceEditModal: React.FC<DeviceEditModalProps> = ({
  open,
  device,
  onClose,
  onSave
}) => {
  // Form state
  const [formData, setFormData] = useState<ExtendedFormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Device selection and inventory
  const [availableDevices, setAvailableDevices] = useState<DeviceInventoryItem[]>([]);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<DeviceInventoryItem | null>(null);

  // Helper to format currency as TR locale with TRY suffix
  const formatCurrencyTR = (amount: number) => {
    try {
      return (amount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TRY';
    } catch (e) {
      return `${Number(amount || 0).toFixed(2)} TRY`;
    }
  };
  
  // SGK and pricing
  const sgkAmounts = {
    hearingAid: 2500,
    cochlearImplant: 15000,
    boneAnchored: 8000
  };
  
  // Mock device inventory
  useEffect(() => {
    const mockDevices: DeviceInventoryItem[] = [
      {
        id: '1',
        brand: 'Phonak',
        model: 'Audéo Paradise P90',
        type: 'hearing_aid',
        listPrice: 12000,
        availableSerials: ['PH001', 'PH002', 'PH003', 'PH004']
      },
      {
        id: '2',
        brand: 'Oticon',
        model: 'More 1',
        type: 'hearing_aid',
        listPrice: 11500,
        availableSerials: ['OT001', 'OT002', 'OT003']
      },
      {
        id: '3',
        brand: 'Cochlear',
        model: 'Nucleus 8',
        type: 'cochlear_implant',
        listPrice: 45000,
        availableSerials: ['CO001', 'CO002']
      },
      {
        id: '4',
        brand: 'Baha',
        model: 'Attract System',
        type: 'bone_anchored',
        listPrice: 25000,
        availableSerials: ['BA001', 'BA002']
      }
    ];
    setAvailableDevices(mockDevices);
  }, []);

  // Initialize form data when device changes
  useEffect(() => {
    if (device) {
      setFormData({
        ...device,
        // Ensure all required fields have default values
        ear: device.ear || device.side || 'left',
        reason: device.reason || 'new',
        status: device.status || 'assigned',
        assignedDate: device.assignedDate || new Date().toISOString().split('T')[0],
        listPrice: device.listPrice || device.price || 0,
        salePrice: device.salePrice || device.price || 0,
        sgkReduction: device.sgkReduction || 0,
        patientPayment: device.patientPayment || 0,
        paymentMethod: device.paymentMethod || 'cash',
        discountValue: 0,
        discountType: 'amount',
        downPayment: 0
      });
      
      // Find and set the selected device
      const foundDevice = availableDevices.find(d => 
        d.brand === device.brand && d.model === device.model
      );
      if (foundDevice) {
        setSelectedDevice(foundDevice);
      }
    } else {
      // Reset form for new device
      setFormData({
        id: `device_${Date.now()}`,
        brand: '',
        model: '',
        serialNumber: '',
        ear: 'left',
        type: 'hearing_aid',
        status: 'assigned',
        assignedDate: new Date().toISOString().split('T')[0],
        reason: 'new',
        listPrice: 0,
        salePrice: 0,
        sgkReduction: 0,
        patientPayment: 0,
        paymentMethod: 'cash',
        notes: '',
        discountValue: 0,
        discountType: 'amount',
        downPayment: 0
      });
      setSelectedDevice(null);
    }
    setErrors({});
  }, [device, open, availableDevices]);

  const filteredDevices = availableDevices.filter(d => {
    const q = deviceSearch.trim().toLowerCase();
    if (!q) return true;
    const searchString = [d.brand, d.model, (d as any).name, d.type].filter(Boolean).join(' ').toLowerCase();
    return searchString.includes(q);
  });

  const handleDeviceSelect = (device: DeviceInventoryItem) => {
    setSelectedDevice(device);
    setFormData(prev => ({
      ...prev,
      brand: device.brand,
      model: device.model,
      type: device.type,
      listPrice: device.listPrice,
      salePrice: device.listPrice,
      serialNumber: '', // Reset serial number when device changes
    }));
    
    // Auto-calculate SGK reduction based on device type
    const sgkAmount = sgkAmounts[device.type === 'hearing_aid' ? 'hearingAid' : 
                                device.type === 'cochlear_implant' ? 'cochlearImplant' : 'boneAnchored'];
    
    setFormData(prev => ({
      ...prev,
      sgkReduction: Math.min(sgkAmount, device.listPrice),
      patientPayment: Math.max(0, device.listPrice - Math.min(sgkAmount, device.listPrice))
    }));
  };

  const calculateSalePrice = () => {
    const listPrice = formData.listPrice || 0;
    const discountValue = formData.discountValue || 0;
    const discountType = formData.discountType || 'amount';
    
    if (discountType === 'percentage') {
      return listPrice * (1 - discountValue / 100);
    } else {
      return listPrice - discountValue;
    }
  };

  const handleInputChange = (field: keyof ExtendedFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Auto-calculate dependent fields
    if (field === 'listPrice' || field === 'discountValue' || field === 'discountType') {
      const newSalePrice = calculateSalePrice();
      setFormData(prev => ({
        ...prev,
        salePrice: newSalePrice,
        patientPayment: Math.max(0, newSalePrice - (prev.sgkReduction || 0))
      }));
    }
    
    if (field === 'sgkReduction') {
      const salePrice = formData.salePrice || calculateSalePrice();
      const numericValue = typeof value === 'number' ? value : (parseFloat(value as string) || 0);
      setFormData(prev => ({
        ...prev,
        patientPayment: Math.max(0, salePrice - numericValue)
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.brand) newErrors.brand = 'Marka seçimi zorunludur';
    if (!formData.model) newErrors.model = 'Model seçimi zorunludur';
    if (!formData.serialNumber) newErrors.serialNumber = 'Seri numarası zorunludur';
    if (!formData.ear) newErrors.ear = 'Kulak seçimi zorunludur';
    if (!formData.assignedDate) newErrors.assignedDate = 'Atama tarihi zorunludur';
    if (!formData.reason) newErrors.reason = 'Atama sebebi zorunludur';
    
    // Validate pricing
    if ((formData.listPrice || 0) <= 0) {
      newErrors.listPrice = 'Liste fiyatı 0\'dan büyük olmalıdır';
    }
    
    if ((formData.salePrice || 0) > (formData.listPrice || 0)) {
      newErrors.salePrice = 'Satış fiyatı liste fiyatından büyük olamaz';
    }
    
    if ((formData.sgkReduction || 0) > (formData.salePrice || 0)) {
      newErrors.sgkReduction = 'SGK katkısı satış fiyatından büyük olamaz';
    }
    
    // Validate serial number availability
    if (selectedDevice && formData.serialNumber) {
      const isSerialAvailable = selectedDevice.availableSerials.includes(formData.serialNumber);
      const isCurrentSerial = device?.serialNumber === formData.serialNumber;
      
      if (!isSerialAvailable && !isCurrentSerial) {
        newErrors.serialNumber = 'Bu seri numarası mevcut değil';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const deviceData: PatientDevice = {
      id: formData.id || `device_${Date.now()}`,
      brand: formData.brand!,
      model: formData.model!,
      serialNumber: formData.serialNumber!,
      side: formData.ear as 'left' | 'right' | 'both',
      ear: formData.ear,
      type: formData.type!,
      status: formData.status!,
      assignedDate: formData.assignedDate,
      reason: formData.reason,
      listPrice: formData.listPrice,
      salePrice: formData.salePrice,
      sgkReduction: formData.sgkReduction,
      patientPayment: formData.patientPayment,
      paymentMethod: formData.paymentMethod,
      trialEndDate: formData.status === 'trial' ? formData.trialEndDate : undefined,
      notes: formData.notes,
      assignedBy: 'Current User', // TODO: Get from auth context
      purchaseDate: formData.assignedDate, // For compatibility
      price: formData.salePrice // For compatibility
    };
    
    onSave(deviceData);
  };

  const handleClose = () => {
    setFormData({});
    setErrors({});
    setSelectedDevice(null);
    setDeviceSearch('');
    onClose();
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      title={device ? 'Cihaz Düzenle' : 'Yeni Cihaz Ekle'}
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Device Search and Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Cihaz Seçimi</h3>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Cihaz ara (marka, model)..."
              value={deviceSearch}
              onChange={(e) => setDeviceSearch(e.target.value)}
            />
          </div>
          
          {deviceSearch && (
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredDevices.map((device) => (
                <div
                  key={device.id}
                  onClick={() => handleDeviceSelect(device)}
                  className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                    selectedDevice?.id === device.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{device.brand} {device.model}</p>
                      <p className="text-sm text-gray-500 capitalize">{device.type.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrencyTR(device.listPrice)}</p>
                      <p className="text-sm text-gray-500">{device.availableSerials.length} adet mevcut</p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredDevices.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  Arama kriterinize uygun cihaz bulunamadı
                </div>
              )}
            </div>
          )}
          
          {selectedDevice && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Seçili Cihaz</span>
              </div>
              <p className="text-blue-800">{selectedDevice.brand} {selectedDevice.model}</p>
              <p className="text-sm text-blue-600">{formatCurrencyTR(selectedDevice.listPrice)}</p>
            </div>
          )}
          
          {errors.brand && <p className="text-red-600 text-sm">{errors.brand}</p>}
        </div>

        {/* Serial Number Selection */}
        {selectedDevice && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Seri Numarası *
            </label>
            <Select
              value={formData.serialNumber || ''}
              onChange={(event) => handleInputChange('serialNumber', event.target.value)}
              options={[
                { value: '', label: 'Seri numarası seçin' },
                ...selectedDevice.availableSerials.map((serial) => ({
                  value: serial,
                  label: serial
                }))
              ]}
              className={errors.serialNumber ? 'border-red-300' : ''}
            />
            {errors.serialNumber && <p className="text-red-600 text-sm">{errors.serialNumber}</p>}
          </div>
        )}

        {/* Ear Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Kulak Seçimi *
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'left', label: 'Sol Kulak', color: 'blue' },
              { value: 'right', label: 'Sağ Kulak', color: 'red' },
              { value: 'both', label: 'Bilateral', color: 'purple' }
            ].map((option) => (
              <button
                data-allow-raw="true"
                key={option.value}
                type="button"
                onClick={() => handleInputChange('ear', option.value)}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  formData.ear === option.value
                    ? `border-${option.color}-500 bg-${option.color}-50 text-${option.color}-700`
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {errors.ear && <p className="text-red-600 text-sm">{errors.ear}</p>}
        </div>

        {/* Assignment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Atama Tarihi *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="date"
                value={formData.assignedDate || ''}
                onChange={(e) => handleInputChange('assignedDate', e.target.value)}
                className={errors.assignedDate ? 'border-red-300' : ''}
              />
            </div>
            {errors.assignedDate && <p className="text-red-600 text-sm">{errors.assignedDate}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Atama Sebebi *
            </label>
            <Select
              value={formData.reason || ''}
              onChange={(event) => handleInputChange('reason', event.target.value)}
              options={[
                { value: '', label: 'Sebep seçin' },
                { value: 'new', label: 'Yeni Hasta' },
                { value: 'replacement', label: 'Değişim' },
                { value: 'upgrade', label: 'Yükseltme' },
                { value: 'trial', label: 'Deneme' },
                { value: 'warranty', label: 'Garanti' }
              ]}
              className={errors.reason ? 'border-red-300' : ''}
            />
            {errors.reason && <p className="text-red-600 text-sm">{errors.reason}</p>}
          </div>
        </div>

        {/* Status Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Durum
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: 'assigned', label: 'Atandı', color: 'green' },
              { value: 'trial', label: 'Deneme', color: 'blue' },
              { value: 'returned', label: 'İade', color: 'yellow' },
              { value: 'defective', label: 'Arızalı', color: 'red' }
            ].map((status) => (
              <button
                data-allow-raw="true"
                key={status.value}
                type="button"
                onClick={() => handleInputChange('status', status.value)}
                className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                  formData.status === status.value
                    ? `border-${status.color}-500 bg-${status.color}-50 text-${status.color}-700`
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trial End Date (if status is trial) */}
        {formData.status === 'trial' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Deneme Bitiş Tarihi
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="date"
                value={formData.trialEndDate || ''}
                onChange={(e) => handleInputChange('trialEndDate', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Pricing Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Fiyatlandırma
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Liste Fiyatı *
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={formData.listPrice || ''}
                  onChange={(e) => handleInputChange('listPrice', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={errors.listPrice ? 'border-red-300' : ''}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">₺</span>
              </div>
              {errors.listPrice && <p className="text-red-600 text-sm">{errors.listPrice}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Satış Fiyatı
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={formData.salePrice || ''}
                  onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={errors.salePrice ? 'border-red-300' : ''}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">₺</span>
              </div>
              {errors.salePrice && <p className="text-red-600 text-sm">{errors.salePrice}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                SGK Katkısı
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={formData.sgkReduction || ''}
                  onChange={(e) => handleInputChange('sgkReduction', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={errors.sgkReduction ? 'border-red-300' : ''}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">₺</span>
              </div>
              {errors.sgkReduction && <p className="text-red-600 text-sm">{errors.sgkReduction}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Hasta Ödemesi
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={formData.patientPayment || ''}
                  onChange={(e) => handleInputChange('patientPayment', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  readOnly
                  className="bg-gray-50"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">₺</span>
              </div>
              <p className="text-xs text-gray-500">Otomatik hesaplanır (Satış Fiyatı - SGK Katkısı)</p>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Ödeme Yöntemi
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: 'cash', label: 'Nakit', icon: DollarSign },
              { value: 'card', label: 'Kart', icon: CreditCard },
              { value: 'transfer', label: 'Havale', icon: Calculator },
              { value: 'installment', label: 'Taksit', icon: Calendar }
            ].map((method) => {
              const Icon = method.icon;
              return (
                <button
                  data-allow-raw="true"
                  key={method.value}
                  type="button"
                  onClick={() => handleInputChange('paymentMethod', method.value)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                    formData.paymentMethod === method.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Notlar
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              placeholder="Cihaz ataması ile ilgili notlar..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            onClick={handleClose}
            variant="ghost"
          >
            İptal
          </Button>
          <Button
            type="submit"
            variant="primary"
          >
            {device ? 'Güncelle' : 'Kaydet'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};