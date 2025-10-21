import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { 
  Headphones, 
  Calendar, 
  User, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Search,
  CreditCard,
  Calculator,
  Package
} from 'lucide-react';

interface DeviceInventoryItem {
  id: string;
  uniqueId?: string;
  brand: string;
  model: string;
  price: number;
  ear: 'left' | 'right' | 'both' | 'bilateral';
  direction?: 'left' | 'right' | 'both';
  availableInventory: number;
  serialNumbers?: string[];
  availableSerials?: string[];
  barcode?: string;
  category: string;
  status: 'available' | 'out_of_stock';
}

interface DeviceAssignment {
  id?: string;
  deviceId: string;
  patientId: string;
  assignedDate: string;
  assignedBy: string;
  status: 'assigned' | 'trial' | 'returned' | 'defective';
  ear: 'left' | 'right' | 'both';
  reason: 'sale' | 'service' | 'repair' | 'trial' | 'replacement' | 'proposal' | 'other';
  notes?: string;
  trialEndDate?: string;
  returnDate?: string;
  condition?: string;
  // Pricing fields
  listPrice?: number;
  salePrice?: number;
  sgkSupportType?: string;
  sgkReduction?: number;
  discountType?: 'none' | 'percentage' | 'amount';
  discountValue?: number;
  patientPayment?: number;
  downPayment?: number;
  remainingAmount?: number;
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'installment';
  installmentCount?: number;
  monthlyInstallment?: number;
  // Serial numbers
  serialNumber?: string;
  serialNumberLeft?: string;
  serialNumberRight?: string;
  // Trial pricing
  trialListPrice?: number;
  trialPrice?: number;
}

interface DeviceAssignmentFormProps {
  patientId: string;
  assignment?: DeviceAssignment | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (assignmentData: Partial<DeviceAssignment>) => Promise<void>;
  isLoading?: boolean;
}

export const DeviceAssignmentForm: React.FC<DeviceAssignmentFormProps> = ({
  patientId,
  assignment,
  isOpen,
  onClose,
  onSave,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<Partial<DeviceAssignment>>({
    patientId,
    assignedDate: new Date().toISOString().split('T')[0],
    status: 'assigned',
    assignedBy: 'current_user', // TODO: Get from auth context
    ear: 'left',
    reason: 'sale',
    discountType: 'none',
    paymentMethod: 'cash'
  });

  const [availableDevices, setAvailableDevices] = useState<DeviceInventoryItem[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<DeviceInventoryItem[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceInventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // SGK support amounts (default values)
  const sgkAmounts = {
    'under4_parent_working': 6104.44,
    'under4_parent_retired': 7630.56,
    'age5_12_parent_working': 5426.17,
    'age5_12_parent_retired': 6782.72,
    'age13_18_parent_working': 5087.04,
    'age13_18_parent_retired': 6358.88,
    'over18_working': 3391.36,
    'over18_retired': 4239.20
  };

  // Reset form when modal opens/closes or assignment changes
  useEffect(() => {
    if (isOpen) {
      if (assignment) {
        // Edit mode
        setFormData({
          ...assignment,
          assignedDate: assignment.assignedDate.split('T')[0] // Convert to date input format
        });
      } else {
        // Create mode
        setFormData({
          patientId,
          assignedDate: new Date().toISOString().split('T')[0],
          status: 'assigned',
          assignedBy: 'current_user', // TODO: Get from auth context
          ear: 'left',
          reason: 'sale',
          discountType: 'none',
          paymentMethod: 'cash'
        });
      }
      setErrors({});
      setSearchTerm('');
      setSelectedDevice(null);
    }
  }, [isOpen, assignment, patientId]);

  // Load available devices
  useEffect(() => {
    if (isOpen) {
      // TODO: Load available devices from API - for now using mock data
      const mockDevices: DeviceInventoryItem[] = [
        {
          id: '1',
          brand: 'Phonak',
          model: 'Audeo B90',
          price: 15000,
          ear: 'right',
          availableInventory: 5,
          serialNumbers: ['PH001', 'PH002', 'PH003'],
          availableSerials: ['PH001', 'PH002', 'PH003'],
          barcode: 'BC001',
          category: 'hearing_aid',
          status: 'available'
        },
        {
          id: '2',
          brand: 'Oticon',
          model: 'Opn S',
          price: 18000,
          ear: 'left',
          availableInventory: 3,
          serialNumbers: ['OT001', 'OT002'],
          availableSerials: ['OT001', 'OT002'],
          barcode: 'BC002',
          category: 'hearing_aid',
          status: 'available'
        },
        {
          id: '3',
          brand: 'Widex',
          model: 'Beyond 440',
          price: 20000,
          ear: 'both',
          availableInventory: 8,
          serialNumbers: ['WX001', 'WX002', 'WX003', 'WX004'],
          availableSerials: ['WX001', 'WX002', 'WX003', 'WX004'],
          barcode: 'BC003',
          category: 'hearing_aid',
          status: 'available'
        }
      ];
      setAvailableDevices(mockDevices);
      setFilteredDevices(mockDevices);
    }
  }, [isOpen]);

  // Filter devices based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDevices(availableDevices);
    } else {
      const filtered = availableDevices.filter(device => {
        const searchText = `${device.brand} ${device.model} ${device.barcode || ''}`.toLowerCase();
        return searchText.includes(searchTerm.toLowerCase());
      });
      setFilteredDevices(filtered);
    }
  }, [searchTerm, availableDevices]);

  // Calculate pricing when relevant fields change
  useEffect(() => {
    if (formData.listPrice) {
      calculateSalePrice();
    }
  }, [formData.listPrice, formData.discountType, formData.discountValue, formData.sgkSupportType]);

  // Calculate remaining amount when down payment changes
  useEffect(() => {
    if (formData.patientPayment && formData.downPayment !== undefined) {
      calculateRemainingAmount();
    }
  }, [formData.patientPayment, formData.downPayment, formData.ear]);

  const calculateSalePrice = () => {
    const listPrice = formData.listPrice || 0;
    const discountType = formData.discountType || 'none';
    const discountValue = formData.discountValue || 0;
    const sgkType = formData.sgkSupportType || '';

    let salePrice = listPrice;

    // Apply discount
    if (discountType === 'percentage' && discountValue > 0) {
      const discountAmount = (listPrice * discountValue) / 100;
      salePrice = Math.max(0, listPrice - discountAmount);
    } else if (discountType === 'amount' && discountValue > 0) {
      salePrice = Math.max(0, listPrice - discountValue);
    }

    // Calculate SGK reduction from list price
    let sgkReduction = 0;
    if (sgkType && sgkType !== '' && sgkType !== 'no_coverage') {
      const sgkAmount = sgkAmounts[sgkType as keyof typeof sgkAmounts] || 0;
      sgkReduction = Math.min(sgkAmount, listPrice);
    }

    // Calculate patient payment
    const quantity = formData.ear === 'both' ? 2 : 1;
    const patientPayment = Math.max(0, (salePrice - sgkReduction) * quantity);

    setFormData(prev => ({
      ...prev,
      salePrice,
      sgkReduction,
      patientPayment
    }));
  };

  const calculateRemainingAmount = () => {
    const patientPayment = formData.patientPayment || 0;
    const downPayment = formData.downPayment || 0;
    const remainingAmount = Math.max(0, patientPayment - downPayment);

    setFormData(prev => ({
      ...prev,
      remainingAmount
    }));
  };

  const handleDeviceSelect = (device: DeviceInventoryItem) => {
    setSelectedDevice(device);
    setFormData(prev => ({
      ...prev,
      deviceId: device.id,
      listPrice: device.price,
      trialListPrice: device.price,
      trialPrice: device.price
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.deviceId) {
      newErrors.deviceId = 'Cihaz seçimi zorunludur';
    }

    if (!formData.assignedDate) {
      newErrors.assignedDate = 'Atama tarihi zorunludur';
    }

    if (!formData.status) {
      newErrors.status = 'Durum seçimi zorunludur';
    }

    if (!formData.reason) {
      newErrors.reason = 'Atama sebebi zorunludur';
    }

    if (formData.status === 'trial' && !formData.trialEndDate) {
      newErrors.trialEndDate = 'Deneme bitiş tarihi zorunludur';
    }

    if (['sale', 'proposal'].includes(formData.reason || '') && formData.paymentMethod && !formData.paymentMethod) {
      newErrors.paymentMethod = 'Ödeme yöntemi seçimi zorunludur';
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
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Cihaz ataması kaydedilirken hata:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'trial':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'returned':
        return <User className="w-4 h-4 text-gray-500" />;
      case 'defective':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Headphones className="w-4 h-4 text-gray-400" />;
    }
  };

  const showPricingSection = ['sale', 'proposal'].includes(formData.reason || '');
  const showTrialPricingSection = formData.reason === 'trial';
  const showDownPaymentSection = formData.reason === 'sale';
  const showPaymentSection = ['sale', 'proposal'].includes(formData.reason || '');

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={assignment ? 'Cihaz Atamasını Düzenle' : 'Yeni Cihaz Ataması'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Device Search and Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cihaz Arama ve Seçimi *
          </label>
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cihaz ara (marka, model, barkod)..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Device List */}
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            <div className="grid grid-cols-1 gap-2 p-2">
              {filteredDevices.map((device) => (
                <div
                  key={device.id}
                  onClick={() => handleDeviceSelect(device)}
                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedDevice?.id === device.id
                      ? 'border-blue-500 bg-blue-50 shadow-lg'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-gray-600 uppercase">
                        {device.ear === 'left' ? 'Sol' : device.ear === 'right' ? 'Sağ' : 'Bilateral'}
                      </span>
                    </div>
                    {device.availableInventory > 0 ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        ✓ Stokta
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                        ⚠️ Stokta Yok
                      </span>
                    )}
                  </div>
                  
                  <h4 className="font-semibold text-sm text-gray-900 mb-1">
                    {device.brand} {device.model}
                  </h4>
                  
                  {device.barcode && (
                    <p className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded mb-1">
                      {device.barcode}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center mt-2 text-xs">
                    <span className="text-gray-600">Stok: {device.availableInventory}</span>
                    <span className="text-gray-700 font-medium">₺{device.price.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {errors.deviceId && (
            <p className="mt-1 text-sm text-red-600">{errors.deviceId}</p>
          )}
        </div>

        {/* Ear Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kulak Seçimi *
          </label>
          <div className="flex gap-2">
            {[
              { value: 'left', label: 'Sol' },
              { value: 'right', label: 'Sağ' },
              { value: 'both', label: 'İkisi (Bilateral)' }
            ].map((ear) => (
              <label key={ear.value} className="flex-1">
                <input
                  type="radio"
                  name="ear"
                  value={ear.value}
                  checked={formData.ear === ear.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, ear: e.target.value as any }))}
                  className="sr-only"
                />
                <div className={`px-6 py-3 text-center border-2 rounded-lg cursor-pointer transition-all ${
                  formData.ear === ear.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                }`}>
                  <span className="text-sm font-medium">{ear.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Assignment Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Atama Sebebi *
          </label>
          <select
            value={formData.reason || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value as any }))}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.reason ? 'border-red-300' : ''}`}
          >
            <option value="">Sebep seçin...</option>
            <option value="sale">Satış</option>
            <option value="service">Servis</option>
            <option value="repair">Tamir</option>
            <option value="trial">Deneme</option>
            <option value="replacement">Değişim</option>
            <option value="proposal">Teklif</option>
            <option value="other">Diğer</option>
          </select>
          {errors.reason && (
            <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
          )}
        </div>

        {/* Serial Number Selection */}
        {selectedDevice && selectedDevice.availableSerials && selectedDevice.availableSerials.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seri Numarası (İsteğe Bağlı)
            </label>
            {formData.ear === 'both' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Sol Kulak Seri No</label>
                  <select
                    value={formData.serialNumberLeft || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, serialNumberLeft: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Sol seri seçin (opsiyonel)</option>
                    {selectedDevice.availableSerials.map(serial => (
                      <option key={serial} value={serial}>{serial}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Sağ Kulak Seri No</label>
                  <select
                    value={formData.serialNumberRight || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, serialNumberRight: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Sağ seri seçin (opsiyonel)</option>
                    {selectedDevice.availableSerials.map(serial => (
                      <option key={serial} value={serial}>{serial}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <select
                value={formData.serialNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Seri numarası seçin (opsiyonel)</option>
                {selectedDevice.availableSerials.map(serial => (
                  <option key={serial} value={serial}>{serial}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Pricing Section (for sale/proposal) */}
        {showPricingSection && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-4">
              <Calculator className="w-5 h-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Fiyatlandırma</h3>
            </div>
            
            {/* First Row: Liste Fiyatı and SGK Desteği */}
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Liste Fiyatı</label>
                <input
                  type="number"
                  value={formData.listPrice || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, listPrice: parseFloat(e.target.value) || 0 }))}
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">SGK Desteği</label>
                <select
                  value={formData.sgkSupportType || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, sgkSupportType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Yok</option>
                  <option value="no_coverage">Hakkı yok</option>
                  <option value="under4_parent_working">0-4 yaş, çalışan</option>
                  <option value="under4_parent_retired">0-4 yaş, emekli</option>
                  <option value="age5_12_parent_working">5-12 yaş, çalışan</option>
                  <option value="age5_12_parent_retired">5-12 yaş, emekli</option>
                  <option value="age13_18_parent_working">13-18 yaş, çalışan</option>
                  <option value="age13_18_parent_retired">13-18 yaş, emekli</option>
                  <option value="over18_working">18+ yaş, çalışan</option>
                  <option value="over18_retired">18+ yaş, emekli</option>
                </select>
              </div>
            </div>
            
            {/* Second Row: Satış Fiyatı, İndirim Type, İndirim Miktarı */}
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Satış Fiyatı</label>
                <input
                  type="number"
                  value={formData.salePrice?.toFixed(2) || '0.00'}
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">İndirim</label>
                <select
                  value={formData.discountType || 'none'}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm"
                >
                  <option value="none">İndirim Yok</option>
                  <option value="percentage">Oran (%)</option>
                  <option value="amount">Miktar (₺)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">İndirim Miktarı</label>
                <input
                  type="number"
                  value={formData.discountValue || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="0"
                  disabled={formData.discountType === 'none'}
                />
              </div>
            </div>

            {/* Patient Payment Display */}
            <div className="bg-blue-50 p-3 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-900">Hasta Ödemesi:</span>
                <span className="text-lg font-bold text-blue-900">
                  ₺{formData.patientPayment?.toFixed(2) || '0.00'}
                </span>
              </div>
              {formData.sgkReduction && formData.sgkReduction > 0 && (
                <div className="text-xs text-blue-700 mt-1">
                  SGK İndirimi: ₺{formData.sgkReduction.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trial Pricing Section */}
        {showTrialPricingSection && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-4">
              <Calendar className="w-5 h-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Deneme Fiyatlandırması</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Liste Fiyatı</label>
                <input
                  type="number"
                  value={formData.trialListPrice?.toFixed(2) || '0.00'}
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Deneme Fiyatı</label>
                <input
                  type="number"
                  value={formData.trialPrice || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, trialPrice: parseFloat(e.target.value) || 0 }))}
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Hastanın deneme süresince ödeyeceği tutar</p>
              </div>
            </div>
          </div>
        )}

        {/* Down Payment Section */}
        {showDownPaymentSection && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-4">
              <CreditCard className="w-5 h-5 text-green-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Ödeme Bilgileri</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Ödenecek Tutar (₺)</label>
                <input
                  type="number"
                  value={formData.patientPayment?.toFixed(2) || '0.00'}
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">SGK indirimi sonrası hasta ödemesi</p>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Ön Ödeme (₺)</label>
                <input
                  type="number"
                  value={formData.downPayment || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, downPayment: parseFloat(e.target.value) || 0 }))}
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Peşin ödenen tutar</p>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Kalan Tutar (₺)</label>
                <input
                  type="number"
                  value={formData.remainingAmount?.toFixed(2) || '0.00'}
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Ön ödeme sonrası kalan tutar</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method Section */}
        {showPaymentSection && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ödeme Yöntemi</label>
            <select
              value={formData.paymentMethod || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
              className={`w-full border border-gray-300 rounded-md px-3 py-2 ${errors.paymentMethod ? 'border-red-300' : ''}`}
            >
              <option value="">Ödeme yöntemini seçiniz</option>
              <option value="cash">Nakit</option>
              <option value="card">Kredi Kartı</option>
              <option value="transfer">Havale/EFT</option>
              <option value="installment">Taksit</option>
            </select>
            {errors.paymentMethod && (
              <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>
            )}

            {/* Installment Options */}
            {formData.paymentMethod === 'installment' && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Taksit Sayısı</label>
                  <select
                    value={formData.installmentCount || ''}
                    onChange={(e) => {
                      const count = parseInt(e.target.value);
                      const monthly = formData.remainingAmount ? formData.remainingAmount / count : 0;
                      setFormData(prev => ({ 
                        ...prev, 
                        installmentCount: count,
                        monthlyInstallment: monthly
                      }));
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Taksit seçin</option>
                    <option value="3">3 Taksit</option>
                    <option value="6">6 Taksit</option>
                    <option value="9">9 Taksit</option>
                    <option value="12">12 Taksit</option>
                    <option value="18">18 Taksit</option>
                    <option value="24">24 Taksit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Aylık Taksit</label>
                  <input
                    type="number"
                    value={formData.monthlyInstallment?.toFixed(2) || '0.00'}
                    readOnly
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assignment Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Atama Tarihi *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={formData.assignedDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedDate: e.target.value }))}
                className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.assignedDate ? 'border-red-300' : ''}`}
              />
              {errors.assignedDate && (
                <p className="mt-1 text-sm text-red-600">{errors.assignedDate}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Atayan Kişi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={formData.assignedBy || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedBy: e.target.value }))}
                placeholder="Atayan kişi adı"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Status Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Durum *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: 'assigned', label: 'Atandı' },
              { value: 'trial', label: 'Deneme' },
              { value: 'returned', label: 'İade Edildi' },
              { value: 'defective', label: 'Arızalı' }
            ].map((status) => (
              <label key={status.value} className="relative">
                <input
                  type="radio"
                  name="status"
                  value={status.value}
                  checked={formData.status === status.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="sr-only"
                />
                <div className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  formData.status === status.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}>
                  {getStatusIcon(status.value)}
                  <span className="ml-2 text-sm font-medium">{status.label}</span>
                </div>
              </label>
            ))}
          </div>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status}</p>
          )}
        </div>

        {/* Trial End Date */}
        {formData.status === 'trial' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deneme Bitiş Tarihi *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={formData.trialEndDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, trialEndDate: e.target.value }))}
                className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.trialEndDate ? 'border-red-300' : ''}`}
              />
              {errors.trialEndDate && (
                <p className="mt-1 text-sm text-red-600">{errors.trialEndDate}</p>
              )}
            </div>
          </div>
        )}

        {/* Return Date */}
        {formData.status === 'returned' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İade Tarihi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="date"
                value={formData.returnDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, returnDate: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Device Condition */}
        {(formData.status === 'returned' || formData.status === 'defective') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cihaz Durumu
            </label>
            <select
              value={formData.condition || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Durum seçin...</option>
              <option value="excellent">Mükemmel</option>
              <option value="good">İyi</option>
              <option value="fair">Orta</option>
              <option value="poor">Kötü</option>
              <option value="damaged">Hasarlı</option>
            </select>
          </div>
        )}

        {/* Notes */}
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
              placeholder="Cihaz ataması ile ilgili notlar..."
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
            {isLoading ? 'Kaydediliyor...' : (assignment ? 'Güncelle' : 'Cihazı Ata')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};