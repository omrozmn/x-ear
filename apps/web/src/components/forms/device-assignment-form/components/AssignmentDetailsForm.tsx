import React, { useCallback, useState, useEffect } from 'react';
import { listInventory } from '@/api/client/inventory.client';
import { unwrapObject } from '@/utils/response-unwrap';
import { Input, Select, DatePicker } from '@x-ear/ui-web';
import { CheckCircle } from 'lucide-react';
import type { InventoryItemRead } from '@/api/generated';
import { useSector } from '@/hooks/useSector';

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
  errors = {}
}) => {
  const { isHearingSector } = useSector();

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
      loanerBrand: device.brand as string | undefined,
      loanerModel: typeof device.model === 'string' ? device.model : undefined,
      loanerSerialNumber: undefined // Serial will be selected separately
    });
    setLoanerSearch(`${device.brand} ${typeof device.model === 'string' ? device.model : ''}`);
    setShowLoanerResults(false);
  };

  // Helper to get icon based on status - available for future use
  // const getStatusIcon = (status: string) => {
  // switch (status) {
  // case 'assigned': return <CheckCircle className="w-4 h-4 text-success" />;
  // case 'trial': return <Clock className="w-4 h-4 text-primary" />;
  // case 'returned': return <RotateCcw className="w-4 h-4 text-orange-500" />;
  // case 'defective': return <AlertCircle className="w-4 h-4 text-destructive" />;
  // default: return <CheckCircle className="w-4 h-4 text-muted-foreground" />;
  // }
  // };

  return (
    <div className="space-y-6">
      {/* Assignment Information - 3 columns in one row: Sebep, Tarih, Atayan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Atama Sebebi *
          </label>
          <Select
            value={formData.reason || ''}
            onChange={(e) => updateFormData('reason', e.target.value)}
            options={[
              { value: '', label: 'Sebep seçiniz' },
              { value: 'sale', label: 'Satış' },
              { value: 'service', label: 'Servis' },
              { value: 'repair', label: 'Tamir' },
              { value: 'trial', label: 'Deneme' },
              { value: 'replacement', label: 'Değişim' },
              { value: 'proposal', label: 'Teklif' },
              { value: 'other', label: 'Diğer' }
            ]}
            error={errors.reason}
            fullWidth
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Atama Tarihi *
          </label>
          <DatePicker
            value={formData.assignedDate ? new Date(formData.assignedDate) : null}
            onChange={(date) => updateFormData('assignedDate', date ? date.toISOString().split('T')[0] : '')}
            fullWidth
            error={errors.assignedDate}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Atayan Kişi
          </label>
          <Input
            type="text"
            value={formData.assignedBy || ''}
            onChange={(e) => updateFormData('assignedBy', e.target.value)}
            placeholder="Atayan kişi adı"
            className="dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Ear Selection - Only shown for hearing sector */}
      {isHearingSector() && (
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Kulak Seçimi *
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'right', label: 'Sağ Kulak', icon: 'R', position: 'left' },
            { value: 'both', label: 'Bilateral', icon: 'B', position: 'center' },
            { value: 'left', label: 'Sol Kulak', icon: 'L', position: 'right' }
          ].map((ear) => {
            const isSelected = formData.ear === ear.value;

            // Gradient colors based on position
            let gradientClass = '';

            if (ear.position === 'left') {
              // Right ear - Red gradient
              gradientClass = isSelected
                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg ring-2 ring-red-300 dark:ring-red-700'
                : 'bg-white border-2 border-red-300 text-destructive hover:border-red-400 hover:bg-destructive/10 dark:bg-slate-800 dark:border-red-700 dark:hover:bg-red-900/20';
            } else if (ear.position === 'right') {
              // Left ear - Blue gradient
              gradientClass = isSelected
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg ring-2 ring-blue-300 dark:ring-blue-700'
                : 'bg-white border-2 border-blue-300 text-primary hover:border-blue-400 hover:bg-primary/10 dark:bg-slate-800 dark:border-blue-700 dark:hover:bg-blue-900/20';
            } else {
              // Bilateral - Red to Blue diagonal gradient (50-50 split)
              gradientClass = isSelected
                ? 'bg-gradient-to-br from-red-500 from-50% to-blue-500 to-50% text-white shadow-lg ring-2 ring-purple-300 dark:ring-purple-700'
                : 'bg-white border-2 border-purple-300 text-purple-600 hover:border-purple-400 hover:bg-purple-50 dark:bg-slate-800 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-900/20';
            }

            return (
              <label key={ear.value} className="relative cursor-pointer">
                <Input
                  type="radio"
                  name="ear"
                  value={ear.value}
                  checked={isSelected}
                  onChange={(e) => updateFormData('ear', e.target.value)}
                  className="sr-only"
                />
                <div className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-200 ${gradientClass}`}>
                  <div className={`text-base font-bold mb-0.5`}>{ear.icon}</div>
                  <span className={`text-xs ${isSelected ? 'font-semibold' : 'font-medium'}`}>{ear.label}</span>
                </div>
              </label>
            );
          })}
        </div>
        {errors.ear && (
          <p className="mt-2 text-sm text-destructive">{errors.ear}</p>
        )}
      </div>
      )}

      {/* Trial End Date */}
      {formData.status === 'trial' && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Deneme Bitiş Tarihi *
          </label>
          <DatePicker
            value={formData.trialEndDate ? new Date(formData.trialEndDate) : null}
            onChange={(date) => updateFormData('trialEndDate', date ? date.toISOString().split('T')[0] : '')}
            fullWidth
            error={errors.trialEndDate}
          />
        </div>
      )}

      {/* Return Date */}
      {formData.status === 'returned' && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            İade Tarihi
          </label>
          <DatePicker
            value={formData.returnDate ? new Date(formData.returnDate) : null}
            onChange={(date) => updateFormData('returnDate', date ? date.toISOString().split('T')[0] : '')}
            fullWidth
          />
        </div>
      )}

      {/* Device Condition */}
      {(formData.status === 'returned' || formData.status === 'defective') && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
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

      {/* Delivery & Report Status - Full width for consistency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border dark:border-slate-700">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-foreground mb-1">
            Teslimat Durumu
          </label>
          <Select
            value={formData.deliveryStatus || 'pending'}
            onChange={(e) => {
              updateFormData('deliveryStatus', e.target.value);
            }}
            options={[
              { value: 'pending', label: 'Teslim Edilmedi' },
              { value: 'delivered', label: 'Teslim Edildi' }
            ]}
            fullWidth
          />
        </div>

        {formData.reason === 'sale' && (
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-foreground mb-1">
              Rapor Durumu
            </label>
            <Select
              value={formData.reportStatus || ''}
              onChange={(e) => updateFormData('reportStatus', e.target.value)}
              options={[
                { value: '', label: 'Seçiniz...' },
                { value: 'received', label: 'Rapor Teslim Alındı' },
                { value: 'pending', label: 'Rapor Bekleniyor' },
                { value: 'none', label: 'Raporsuz Özel Satış' }
              ]}
              fullWidth
            />
          </div>
        )}
      </div>

      {/* Loaner Device Section */}
      <div className="pt-4 border-t border-border dark:border-slate-700">
        <label className="flex items-center space-x-2 cursor-pointer mb-3">
          <Input
            type="checkbox"
            checked={formData.isLoaner || false}
            onChange={(e) => updateFormData('isLoaner', e.target.checked)}
            className="w-4 h-4 text-primary rounded border-border focus:ring-ring dark:bg-gray-700"
          />
          <span className="font-medium text-gray-900 dark:text-gray-100">Emanet Cihaz Verildi</span>
        </label>

        {formData.isLoaner && (
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl space-y-3 border border-purple-200 dark:border-purple-800">
            <h5 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">Emanet Cihaz Seçimi</h5>

            {/* Search Input - Full width */}
            <div>
              <Input
                type="text"
                value={loanerSearch}
                onChange={(e) => setLoanerSearch(e.target.value)}
                placeholder="Envanterde emanet cihaz ara (Marka, Model...)"
                className="w-full border-purple-300 dark:border-purple-700 focus:ring-purple-500 focus:border-purple-500 placeholder-purple-300 dark:bg-slate-800 dark:text-white"
              />

              {/* Results Dropdown */}
              {showLoanerResults && loanerResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-border dark:border-slate-700 max-h-60 overflow-y-auto">
                  {loanerResults.map(device => {
                    const serials = device.availableSerials || [];
                    const stock = device.availableInventory ?? 0;
                    return (
                      <div
                        key={device.id}
                        onClick={() => selectLoaner(device)}
                        className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/30 cursor-pointer border-b border-border dark:border-slate-700 last:border-b-0"
                      >
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{device.brand} {device.model}</div>
                        <div className="text-xs text-muted-foreground">
                          {serials.length > 0 ? `SN: ${serials.slice(0, 3).join(', ')}${serials.length > 3 ? '...' : ''}` : 'Seri No Yok'} |
                          Stok: {stock}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Marka + Model - 2 columns (1/2 each), full width in each column */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Marka</label>
                <Input
                  type="text"
                  value={formData.loanerBrand || ''}
                  onChange={(e) => updateFormData('loanerBrand', e.target.value)}
                  placeholder="Marka"
                  className="w-full text-sm dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Model</label>
                <Input
                  type="text"
                  value={formData.loanerModel || ''}
                  onChange={(e) => updateFormData('loanerModel', e.target.value)}
                  placeholder="Model"
                  className="w-full text-sm dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Seri No - Full width or 2 columns based on ear */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Seri No</label>
              {formData.ear === 'both' ? (
                <div className="grid grid-cols-2 gap-2">
                  {/* Right Side (Visual) -> Right Ear (Red) */}
                  <div className="relative">
                    <Input
                      type="text"
                      value={formData.loanerSerialNumberRight || ''}
                      onChange={(e) => updateFormData('loanerSerialNumberRight', e.target.value)}
                      onFocus={() => setActiveSerialInput('right')}
                      onBlur={() => setTimeout(() => setActiveSerialInput(null), 200)}
                      placeholder="Sağ (R)"
                      className="w-full text-sm border-2 border-red-400 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-red-200 pr-8"
                    />
                    {activeSerialInput === 'right' && selectedLoanerInventoryItem && selectedLoanerInventoryItem.availableSerials && selectedLoanerInventoryItem.availableSerials.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                        {selectedLoanerInventoryItem.availableSerials.map((sn: string) => (
                          <div
                            key={sn}
                            className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-sm text-foreground"
                            onMouseDown={(e) => { e.preventDefault(); updateFormData('loanerSerialNumberRight', sn); setActiveSerialInput(null); }}
                          >
                            {sn}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="absolute right-2 top-1.5 text-xs text-destructive font-bold">R</div>
                  </div>

                  {/* Left Side (Visual) -> Left Ear (Blue) */}
                  <div className="relative">
                    <Input
                      type="text"
                      value={formData.loanerSerialNumberLeft || ''}
                      onChange={(e) => updateFormData('loanerSerialNumberLeft', e.target.value)}
                      onFocus={() => setActiveSerialInput('left')}
                      onBlur={() => setTimeout(() => setActiveSerialInput(null), 200)}
                      placeholder="Sol (L)"
                      className="w-full text-sm border-2 border-blue-400 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-200 pr-8"
                    />
                    {activeSerialInput === 'left' && selectedLoanerInventoryItem && selectedLoanerInventoryItem.availableSerials && selectedLoanerInventoryItem.availableSerials.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                        {selectedLoanerInventoryItem.availableSerials.map((sn: string) => (
                          <div
                            key={sn}
                            className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-sm text-foreground"
                            onMouseDown={(e) => { e.preventDefault(); updateFormData('loanerSerialNumberLeft', sn); setActiveSerialInput(null); }}
                          >
                            {sn}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="absolute right-2 top-1.5 text-xs text-primary font-bold">L</div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="text"
                    value={formData.loanerSerialNumber || ''}
                    onChange={(e) => updateFormData('loanerSerialNumber', e.target.value)}
                    onFocus={() => setActiveSerialInput('single')}
                    onBlur={() => setTimeout(() => setActiveSerialInput(null), 200)}
                    placeholder="Seri No"
                    className={`w-full text-sm border-2 dark:bg-slate-800 dark:text-white ${formData.ear === 'left' ? 'border-blue-400 focus:ring-blue-200' :
                      formData.ear === 'right' ? 'border-red-400 focus:ring-red-200' :
                        'border-border dark:border-slate-600 focus:ring-gray-200'
                      }`}
                  />
                  {activeSerialInput === 'single' && selectedLoanerInventoryItem && selectedLoanerInventoryItem.availableSerials && selectedLoanerInventoryItem.availableSerials.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                      {selectedLoanerInventoryItem.availableSerials.map((sn: string) => (
                        <div
                          key={sn}
                          className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-sm text-foreground"
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
              <div className="text-xs text-success flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" />
                Envanterden seçildi
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
