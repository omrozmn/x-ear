import React, { useCallback, useState, useEffect } from 'react';
import { listInventory } from '@/api/client/inventory.client';
import { unwrapObject } from '@/utils/response-unwrap';
import { Input, Select } from '@x-ear/ui-web';
import { Calendar, CheckCircle } from 'lucide-react';
import type { InventoryItemRead } from '@/api/generated';

export interface DeviceAssignment {
  id?: string;
  deviceId: string;
  partyId: string;
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
  trialListPrice?: number;
  trialPrice?: number;
  salePrice?: number;
  sgkSupportType?: string;
  sgkReduction?: number;
  discountType?: 'none' | 'percentage' | 'amount';
  discountValue?: number;
  partyPayment?: number;
  downPayment?: number;
  remainingAmount?: number;
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'installment';
  installmentCount?: number;
  monthlyInstallment?: number;

  // Serial numbers
  serialNumber?: string;
  serialNumberLeft?: string;
  serialNumberRight?: string;

  // Delivery & Loaner
  deliveryStatus?: 'pending' | 'delivered';
  isLoaner?: boolean;
  loanerInventoryId?: string;
  loanerSerialNumber?: string;
  loanerSerialNumberLeft?: string;
  loanerSerialNumberRight?: string;
  loanerBrand?: string;
  loanerModel?: string;

  // Report
  reportStatus?: 'received' | 'pending' | 'none';

  // Submission/Mode fields (used during save)
  mode?: 'inventory' | 'manual';
  inventoryId?: string;
  manualBrand?: string;
  manualModel?: string;
  brand?: string;
  model?: string;
  deviceType?: string;
}

interface AssignmentDetailsFormProps {
  formData: Partial<DeviceAssignment>;
  onFormDataChange: (data: Partial<DeviceAssignment>) => void;
  errors?: Record<string, string>;
  isManualMode?: boolean;
}

export const AssignmentDetailsForm: React.FC<AssignmentDetailsFormProps> = ({
  formData,
  onFormDataChange,
  errors = {},
  isManualMode = false
}) => {
  const updateFormData = useCallback((field: keyof DeviceAssignment, value: string | number | boolean | null) => {
    onFormDataChange({ [field]: value });
  }, [onFormDataChange]);

  // Loaner Search State
  const [loanerSearch, setLoanerSearch] = useState('');
  const [loanerResults, setLoanerResults] = useState<InventoryItemRead[]>([]);
  const [showLoanerResults, setShowLoanerResults] = useState(false);
  const [activeSerialInput, setActiveSerialInput] = useState<string | null>(null);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (loanerSearch.length >= 2) {
        try {
          const response = await listInventory({
            search: loanerSearch,
            category: 'hearing_aid'
          });
          // Response is wrapped in ResponseEnvelope: { data: [...], meta: {...} }
          // Typed response handling
          interface InventoryResponseEnvelope {
            data?: Array<{ id: string; brand?: string; model?: string; barcode?: string }>;
            items?: Array<{ id: string; brand?: string; model?: string; barcode?: string }>;
          }
          const unwrapped = unwrapObject(response) as unknown as InventoryResponseEnvelope | Array<{ id: string; brand?: string; model?: string; barcode?: string }>;
          let items: InventoryItemRead[] = [];
          if (unwrapped) {
            if (Array.isArray(unwrapped)) {
              items = unwrapped as InventoryItemRead[];
            } else if (Array.isArray(unwrapped.data)) {
              items = unwrapped.data as InventoryItemRead[];
            } else if (unwrapped.items && Array.isArray(unwrapped.items)) {
              items = unwrapped.items as InventoryItemRead[];
            }
          }
          // Filter only items with available stock
          items = items.filter((item) => (item.availableInventory || 0) > 0);
          setLoanerResults(items);
          setShowLoanerResults(items.length > 0);
        } catch (error) {
          console.error("Loaner search failed", error);
          setLoanerResults([]);
          setShowLoanerResults(false);
        }
      } else {
        setLoanerResults([]);
        setShowLoanerResults(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [loanerSearch]);

  // Store selected loaner device to access its available serials
  const [selectedLoanerInventoryItem, setSelectedLoanerInventoryItem] = useState<InventoryItemRead | null>(null);

  const selectLoaner = (device: InventoryItemRead) => {
    setSelectedLoanerInventoryItem(device);
    onFormDataChange({
      loanerInventoryId: device.id,
      loanerBrand: device.brand,
      loanerModel: typeof device.model === 'string' ? device.model : undefined,
      loanerSerialNumber: undefined // Serial will be selected separately
    });
    setLoanerSearch(`${device.brand} ${typeof device.model === 'string' ? device.model : ''}`);
    setShowLoanerResults(false);
  };

  // Helper to get icon based on status - available for future use
  // const getStatusIcon = (status: string) => {
  //   switch (status) {
  //     case 'assigned': return <CheckCircle className="w-4 h-4 text-green-500" />;
  //     case 'trial': return <Clock className="w-4 h-4 text-blue-500" />;
  //     case 'returned': return <RotateCcw className="w-4 h-4 text-orange-500" />;
  //     case 'defective': return <AlertCircle className="w-4 h-4 text-red-500" />;
  //     default: return <CheckCircle className="w-4 h-4 text-gray-500" />;
  //   }
  // };

  return (
    <div className="space-y-6">
      {/* Assignment Information - 3 columns in one row: Sebep, Tarih, Atayan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Atama Sebebi *
          </label>
          <select
            value={formData.reason || ''}
            onChange={(e) => updateFormData('reason', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white ${errors.reason ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-slate-700'}`}
          >
            <option value="">Sebep seçiniz</option>
            {!isManualMode && <option value="sale">Satış</option>}
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Atama Tarihi *
          </label>
          <input
            type="date"
            value={formData.assignedDate || ''}
            onChange={(e) => updateFormData('assignedDate', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white ${errors.assignedDate ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-slate-700'}`}
          />
          {errors.assignedDate && (
            <p className="mt-1 text-sm text-red-600">{errors.assignedDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Atayan Kişi
          </label>
          <input
            type="text"
            value={formData.assignedBy || ''}
            onChange={(e) => updateFormData('assignedBy', e.target.value)}
            placeholder="Atayan kişi adı"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Ear Selection - BUTTONS with color coding: Right=Red, Bilateral=Gradient, Left=Blue */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Kulak Seçimi *
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'right', label: 'Sağ Kulak', color: 'red' },
            { value: 'both', label: 'Bilateral', color: 'gradient' },
            { value: 'left', label: 'Sol Kulak', color: 'blue' }
          ].map((ear) => {
            const isSelected = formData.ear === ear.value;
            const colorClasses = {
              blue: isSelected
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                : 'border-blue-300 bg-white text-blue-600 hover:bg-blue-50 dark:bg-slate-800 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/10',
              red: isSelected
                ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200'
                : 'border-red-300 bg-white text-red-600 hover:bg-red-50 dark:bg-slate-800 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/10',
              gradient: isSelected
                ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200'
                : 'border-green-300 bg-white text-green-600 hover:bg-green-50 dark:bg-slate-800 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/10'
            };

            return (
              <label key={ear.value} className="relative">
                <input
                  type="radio"
                  name="ear"
                  value={ear.value}
                  checked={isSelected}
                  onChange={(e) => updateFormData('ear', e.target.value)}
                  className="sr-only"
                />
                <div className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${colorClasses[ear.color as keyof typeof colorClasses]}`}>
                  <span className="text-sm font-medium">{ear.label}</span>
                </div>
              </label>
            );
          })}
        </div>
        {errors.ear && (
          <p className="mt-1 text-sm text-red-600">{errors.ear}</p>
        )}
      </div>

      {/* Trial End Date */}
      {formData.status === 'trial' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deneme Bitiş Tarihi *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <Input
              type="date"
              value={formData.trialEndDate || ''}
              onChange={(e) => updateFormData('trialEndDate', e.target.value)}
              className={`pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-white ${errors.trialEndDate ? 'border-red-300 dark:border-red-700' : ''}`}
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            İade Tarihi
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <Input
              type="date"
              value={formData.returnDate || ''}
              onChange={(e) => updateFormData('returnDate', e.target.value)}
              className="pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Device Condition */}
      {(formData.status === 'returned' || formData.status === 'defective') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cihaz Durumu
          </label>
          <Select
            value={formData.condition || ''}
            onChange={(e) => updateFormData('condition', e.target.value)}
            label=""
            options={[
              { value: '', label: 'Durum seçin...' },
              { value: 'excellent', label: 'Mükemmel' },
              { value: 'good', label: 'İyi' },
              { value: 'fair', label: 'Orta' },
              { value: 'poor', label: 'Kötü' },
              { value: 'damaged', label: 'Hasarlı' }
            ]}
          />
        </div>
      )}

      {/* Delivery & Report Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-slate-700">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Teslimat Durumu
          </label>
          <div className="relative">
            <select
              value={formData.deliveryStatus || 'pending'}
              onChange={(e) => {
                // Debug logging disabled to reduce console noise
                // console.log('📦 [AssignmentDetailsForm] Teslimat durumu değişiyor:', {...});
                updateFormData('deliveryStatus', e.target.value);
              }}
              className="w-full appearance-none bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            >
              <option value="pending" className="dark:bg-slate-800">Teslim Edilmedi</option>
              <option value="delivered" className="dark:bg-slate-800">Teslim Edildi</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {formData.reason === 'sale' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rapor Durumu
            </label>
            <div className="relative">
              <select
                value={formData.reportStatus || ''}
                onChange={(e) => updateFormData('reportStatus', e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              >
                <option value="" className="dark:bg-slate-800">Seçiniz...</option>
                <option value="received" className="dark:bg-slate-800">Rapor Teslim Alındı</option>
                <option value="pending" className="dark:bg-slate-800">Rapor Bekleniyor</option>
                <option value="none" className="dark:bg-slate-800">Raporsuz Özel Satış</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loaner Device Section */}
      <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
        <label className="flex items-center space-x-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={formData.isLoaner || false}
            onChange={(e) => updateFormData('isLoaner', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <span className="font-medium text-gray-900 dark:text-gray-100">Emanet Cihaz Verildi</span>
        </label>

        {formData.isLoaner && (
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg space-y-3 border border-purple-200 dark:border-purple-800">
            <h5 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">Emanet Cihaz Seçimi</h5>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={loanerSearch}
                onChange={(e) => setLoanerSearch(e.target.value)}
                className="w-full px-3 py-2 border border-purple-300 dark:border-purple-700 rounded-lg focus:ring-purple-500 focus:border-purple-500 placeholder-purple-300 dark:bg-slate-800 dark:text-white"
                placeholder="Envanterde emanet cihaz ara (Marka, Model...)"
              />

              {/* Results Dropdown */}
              {showLoanerResults && loanerResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-gray-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                  {loanerResults.map(device => {
                    const serials = device.availableSerials || [];
                    const stock = device.availableInventory ?? 0;
                    return (
                      <div
                        key={device.id}
                        onClick={() => selectLoaner(device)}
                        className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/30 cursor-pointer border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                      >
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{device.brand} {device.model}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {serials.length > 0 ? `SN: ${serials.slice(0, 3).join(', ')}${serials.length > 3 ? '...' : ''}` : 'Seri No Yok'} |
                          Stok: {stock}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected/Filled Details (Read Only or Editable) */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Marka</label>
                <input
                  type="text"
                  value={formData.loanerBrand || ''}
                  onChange={(e) => updateFormData('loanerBrand', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 dark:text-white"
                  placeholder="Marka"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Model</label>
                <input
                  type="text"
                  value={formData.loanerModel || ''}
                  onChange={(e) => updateFormData('loanerModel', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 dark:text-white"
                  placeholder="Model"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Seri No</label>
                {formData.ear === 'both' ? (
                  <div className="grid grid-cols-2 gap-2">
                    {/* Left Side (Visual) -> Right Ear (Red) */}
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.loanerSerialNumberRight || ''}
                        onChange={(e) => updateFormData('loanerSerialNumberRight', e.target.value)}
                        onFocus={() => setActiveSerialInput('right')}
                        onBlur={() => setTimeout(() => setActiveSerialInput(null), 200)}
                        className="w-full px-2 py-1.5 text-sm border-2 border-red-400 rounded bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-200"
                        placeholder="Sağ (R)"
                      />
                      {activeSerialInput === 'right' && selectedLoanerInventoryItem && selectedLoanerInventoryItem.availableSerials && selectedLoanerInventoryItem.availableSerials.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                          {selectedLoanerInventoryItem.availableSerials.map((sn: string) => (
                            <div
                              key={sn}
                              className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-sm text-gray-700"
                              onMouseDown={(e) => { e.preventDefault(); updateFormData('loanerSerialNumberRight', sn); setActiveSerialInput(null); }}
                            >
                              {sn}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="absolute right-2 top-1.5 text-xs text-red-500 font-bold">R</div>
                    </div>

                    {/* Right Side (Visual) -> Left Ear (Blue) */}
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.loanerSerialNumberLeft || ''}
                        onChange={(e) => updateFormData('loanerSerialNumberLeft', e.target.value)}
                        onFocus={() => setActiveSerialInput('left')}
                        onBlur={() => setTimeout(() => setActiveSerialInput(null), 200)}
                        className="w-full px-2 py-1.5 text-sm border-2 border-blue-400 rounded bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Sol (L)"
                      />
                      {activeSerialInput === 'left' && selectedLoanerInventoryItem && selectedLoanerInventoryItem.availableSerials && selectedLoanerInventoryItem.availableSerials.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                          {selectedLoanerInventoryItem.availableSerials.map((sn: string) => (
                            <div
                              key={sn}
                              className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-sm text-gray-700"
                              onMouseDown={(e) => { e.preventDefault(); updateFormData('loanerSerialNumberLeft', sn); setActiveSerialInput(null); }}
                            >
                              {sn}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="absolute right-2 top-1.5 text-xs text-blue-500 font-bold">L</div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.loanerSerialNumber || ''}
                      onChange={(e) => updateFormData('loanerSerialNumber', e.target.value)}
                      onFocus={() => setActiveSerialInput('single')}
                      onBlur={() => setTimeout(() => setActiveSerialInput(null), 200)}
                      className={`w-full px-2 py-1.5 text-sm border-2 rounded bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 ${formData.ear === 'left' ? 'border-blue-400 focus:ring-blue-200' :
                        formData.ear === 'right' ? 'border-red-400 focus:ring-red-200' :
                          'border-gray-300 dark:border-slate-600 focus:ring-gray-200'
                        }`}
                      placeholder="Seri No"
                    />
                    {activeSerialInput === 'single' && selectedLoanerInventoryItem && selectedLoanerInventoryItem.availableSerials && selectedLoanerInventoryItem.availableSerials.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {selectedLoanerInventoryItem.availableSerials.map((sn: string) => (
                          <div
                            key={sn}
                            className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-sm text-gray-700"
                            onMouseDown={(e) => { e.preventDefault(); updateFormData('loanerSerialNumber', sn); setActiveSerialInput(null); }}
                          >
                            {sn}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {formData.loanerInventoryId && (
                <div className="col-span-2 text-xs text-green-600 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Envanterden seçildi
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};