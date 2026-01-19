import {useListSettings} from '@/api/client/settings.client';
import React, { useCallback, useEffect, useState } from 'react';
import { Input, Select } from '@x-ear/ui-web';
import { CreditCard, Calculator, Percent, DollarSign } from 'lucide-react';

export interface DeviceAssignment {
  listPrice?: number;
  salePrice?: number;
  sgkSupportType?: string;
  sgkReduction?: number;
  kdvRate?: number;
  discountType?: 'none' | 'percentage' | 'amount';
  discountValue?: number;
  partyPayment?: number;
  downPayment?: number;
  remainingAmount?: number;
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'installment';
  installmentCount?: number;
  monthlyInstallment?: number;
  trialListPrice?: number;
  trialPrice?: number;
  ear?: 'left' | 'right' | 'both';
}

interface PricingFormProps {
  formData: Partial<DeviceAssignment>;
  onFormDataChange: (data: Partial<DeviceAssignment>) => void;
  errors?: Record<string, string>;
  showTrialPricing?: boolean;
}

export const PricingForm: React.FC<PricingFormProps> = ({
  formData,
  onFormDataChange,
  errors = {},
  showTrialPricing = false
}) => {
  const updateFormData = useCallback((field: keyof DeviceAssignment, value: any) => {
    onFormDataChange({ [field]: value });
  }, [onFormDataChange]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const sgkSupportOptions = [
    { value: '', label: 'SGK desteği seçiniz' },
    { value: 'no_coverage', label: 'SGK Desteği Yok' },
    { value: 'under4_parent_working', label: '4 Yaş Altı (Veli Çalışan)' },
    { value: 'under4_parent_retired', label: '4 Yaş Altı (Veli Emekli)' },
    { value: 'age5_12_parent_working', label: '5-12 Yaş (Veli Çalışan)' },
    { value: 'age5_12_parent_retired', label: '5-12 Yaş (Veli Emekli)' },
    { value: 'age13_18_parent_working', label: '13-18 Yaş (Veli Çalışan)' },
    { value: 'age13_18_parent_retired', label: '13-18 Yaş (Veli Emekli)' },
    { value: 'over18_working', label: '18+ Yaş (Çalışan)' },
    { value: 'over18_retired', label: '18+ Yaş (Emekli)' }
  ];

  // 'standard' option removed completely - no longer supported

  // Map select values to settings scheme keys (settings may use PascalCase)
  const selectToSettingsKey: Record<string, string> = {
    '': '',
    'no_coverage': 'NoCoverage',
    'under4_parent_working': 'Under4_ParentWorking',
    'under4_parent_retired': 'Under4_ParentRetired',
    'age5_12_parent_working': 'Age5_12_ParentWorking',
    'age5_12_parent_retired': 'Age5_12_ParentRetired',
    'age13_18_parent_working': 'Age13_18_ParentWorking',
    'age13_18_parent_retired': 'Age13_18_ParentRetired',
    'over18_working': 'Over18_Working',
    'over18_retired': 'Over18_Retired'
  };

  const [settingsSchemes, setSettingsSchemes] = useState<Record<string, SchemeDef>>({});
  const [schemeAmount, setSchemeAmount] = useState<number>(0);

  // Type for settings response
  interface SettingsResponse {
    schemes?: Record<string, SchemeDef>;
    sgk?: { schemes?: Record<string, SchemeDef> };
    sgkSchemes?: Record<string, SchemeDef>;
    data?: { schemes?: Record<string, SchemeDef> } | Record<string, SchemeDef>;
  }
  interface SchemeDef {
    amount?: number;
    maxAmount?: number;
    max?: number;
    coveragePercent?: number;
    coverage?: number;
  }

  const { data: settingsData } = useListSettings();

  useEffect(() => {
    if (settingsData) {
      // Handle different possible response structures
      const j = settingsData as unknown as SettingsResponse;
      const schemes = (j && (j.schemes || j.sgk?.schemes || j.sgkSchemes || (j.data && 'schemes' in j.data ? j.data.schemes : j.data))) || {};
      setSettingsSchemes(schemes as Record<string, SchemeDef>);
    }
  }, [settingsData]);

  // Recompute scheme amount when selection or list price changes
  useEffect(() => {
    const selected = formData.sgkSupportType || '';
    const key = selectToSettingsKey[selected] || selected;
    const schemeDef = settingsSchemes[key] || settingsSchemes[selected] || null;

    let amount = 0;
    const list = Number(formData.listPrice || 0);

    if (schemeDef !== null && schemeDef !== undefined) {
      // schemeDef may be a number (absolute amount) or object { amount } or { coveragePercent, maxAmount }
      if (typeof schemeDef === 'number') {
        amount = schemeDef;
      } else if (typeof schemeDef === 'object') {
        if ('amount' in schemeDef && typeof schemeDef.amount === 'number') {
          amount = schemeDef.amount;
        } else if ('maxAmount' in schemeDef || 'coveragePercent' in schemeDef) {
          const percent = Number(schemeDef.coveragePercent || schemeDef.coverage || 0);
          const maxAmt = Number(schemeDef.maxAmount || schemeDef.max || Infinity);
          amount = Math.min(list * (percent / 100), maxAmt || Infinity);
        }
      }
    }

    // Fallback: if no schemes defined in settings, use legacy amounts mapping
    if ((!schemeDef || Object.keys(settingsSchemes).length === 0) && amount === 0) {
      const fallback: Record<string, number> = {
        'no_coverage': 0,
        'under4_parent_working': 6104.44,
        'under4_parent_retired': 7630.56,
        'age5_12_parent_working': 5426.17,
        'age5_12_parent_retired': 6782.72,
        'age13_18_parent_working': 5087.04,
        'age13_18_parent_retired': 6358.88,
        'over18_working': 3391.36,
        'over18_retired': 4239.20
      };

      if (fallback[selected]) {
        amount = Math.min(fallback[selected], list);
      }
    }

    setSchemeAmount(isFinite(amount) ? amount : 0);
    // Do NOT write back to parent formData here to avoid conflicting updates.
    // The canonical source of truth for sgkReduction is the `useDeviceAssignment` hook
    // which computes pricing. We only show the computed scheme amount in this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.sgkSupportType, formData.listPrice, settingsSchemes]);

  return (
    <div className="space-y-6">
      {/* Trial Pricing Section */}
      {showTrialPricing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
            <Calculator className="w-4 h-4 mr-2" />
            Deneme Fiyatlandırması
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-blue-700 dark:text-blue-300 mb-1">Deneme Liste Fiyatı</label>
              <input
                type="number"
                value={formData.trialListPrice || ''}
                onChange={(e) => updateFormData('trialListPrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-blue-700 dark:text-blue-300 mb-1">Deneme Fiyatı</label>
              <input
                type="number"
                value={formData.trialPrice || ''}
                onChange={(e) => updateFormData('trialPrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Pricing Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <DollarSign className="w-4 h-4 mr-2" />
          Fiyatlandırma Bilgileri
        </h4>

        {/* List Price and SGK Support - 2 columns in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* List Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Liste Fiyatı
            </label>
            <input
              type="number"
              value={formData.listPrice || ''}
              onChange={(e) => updateFormData('listPrice', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white ${errors.listPrice ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-slate-700'}`}
            />
            {errors.listPrice && (
              <p className="mt-1 text-sm text-red-600">{errors.listPrice}</p>
            )}
          </div>

          {/* SGK Support */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SGK Destek Türü
            </label>
            <select
              value={formData.sgkSupportType || ''}
              onChange={(e) => updateFormData('sgkSupportType', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white ${errors.sgkSupportType ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-slate-700'}`}
            >
              {sgkSupportOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.sgkSupportType && (
              <p className="mt-1 text-sm text-red-600">{errors.sgkSupportType}</p>
            )}
          </div>
        </div>

        {/* SGK Reduction Display */}
        {formData.sgkReduction && formData.sgkReduction > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-700 dark:text-green-300">SGK Desteği:</span>
              <span className="font-medium text-green-900 dark:text-green-100">
                -{formatCurrency(formData.sgkReduction)}
              </span>
            </div>
          </div>
        )}

        {/* Discount Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              İndirim Türü
            </label>
            <select
              value={formData.discountType || 'none'}
              onChange={(e) => updateFormData('discountType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
            >
              <option value="none">İndirim Yok</option>
              <option value="percentage">Yüzde (%)</option>
              <option value="amount">Tutar (₺)</option>
            </select>
          </div>

          {formData.discountType !== 'none' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                İndirim Değeri
              </label>
              <input
                type="number"
                value={formData.discountValue || ''}
                onChange={(e) => updateFormData('discountValue', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* Price Summary */}
        {formData.listPrice && formData.listPrice > 0 && (
          <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Fiyat Özeti</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Liste Fiyatı:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(formData.listPrice)}</span>
              </div>
              {/* NOTE: we intentionally do not duplicate a separate 'Seçilen SGK Desteği' row here.
                  The canonical SGK reduction is shown via `SGK Desteği` (from formData.sgkReduction)
                  and the scheme amount is only used for display elsewhere. */}
              {formData.sgkReduction && formData.sgkReduction > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>SGK Desteği:</span>
                  <span>-{formatCurrency(formData.sgkReduction)}</span>
                </div>
              )}
              {typeof formData.kdvRate !== 'undefined' && formData.kdvRate !== null && (
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>KDV Oranı:</span>
                  <span className="font-medium">{`${formData.kdvRate}%`}</span>
                </div>
              )}
              {formData.discountValue && formData.discountValue > 0 && (
                <div className="flex justify-between text-blue-600 dark:text-blue-400">
                  <span>İndirim ({formData.discountType === 'percentage' ? '%' : '₺'}):</span>
                  <span>-{formData.discountType === 'percentage' ?
                    `${formData.discountValue}%` :
                    formatCurrency(formData.discountValue)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium text-lg border-t dark:border-slate-700 pt-2 text-gray-900 dark:text-gray-100">
                <span>Satış Fiyatı:</span>
                <span>
                  {formatCurrency((formData.salePrice ?? formData.listPrice) * (formData.ear === 'both' ? 2 : 1))}
                  {formData.ear === 'both' && (
                    <span className="text-sm text-purple-600 dark:text-purple-400">{' '}(Bilateral)</span>
                  )}
                </span>
              </div>
              {/* Show per-device (per-item) sale price when bilateral so user sees per-ear cost */}
              {formData.ear === 'both' && (
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mt-1">
                  <span>Bilateral x 2</span>
                  <span className="font-medium">{formatCurrency(formData.salePrice ?? formData.listPrice)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <CreditCard className="w-4 h-4 mr-2" />
          Ödeme Bilgileri
        </h4>

        {/* Down Payment and Payment Method - 2 columns in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Down Payment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Peşinat
            </label>
            <input
              type="number"
              value={formData.downPayment || ''}
              onChange={(e) => updateFormData('downPayment', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ödeme Yöntemi
            </label>
            <select
              value={formData.paymentMethod || ''}
              onChange={(e) => updateFormData('paymentMethod', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white ${errors.paymentMethod ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-slate-700'}`}
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
          </div>
        </div>

        {/* Remaining Amount Display */}
        {formData.remainingAmount !== undefined && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 dark:text-blue-300">Kalan Tutar:</span>
              <span className="font-medium text-blue-900 dark:text-blue-100">
                {formatCurrency(formData.remainingAmount)}
              </span>
            </div>
          </div>
        )}

        {/* Installment Options */}
        {formData.paymentMethod === 'installment' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h5 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-3">Taksit Bilgileri</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-yellow-700 dark:text-yellow-300 mb-1">Taksit Sayısı</label>
                <select
                  value={formData.installmentCount?.toString() || ''}
                  onChange={(e) => {
                    const count = parseInt(e.target.value);
                    const monthly = formData.remainingAmount ? formData.remainingAmount / count : 0;
                    updateFormData('installmentCount', count);
                    updateFormData('monthlyInstallment', monthly);
                  }}
                  className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-slate-800 text-sm dark:text-white"
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
                <label className="block text-xs text-yellow-700 dark:text-yellow-300 mb-1">Aylık Taksit</label>
                <input
                  type="text"
                  value={formData.monthlyInstallment ? formatCurrency(formData.monthlyInstallment) : '₺0.00'}
                  readOnly
                  className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-700 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 text-sm dark:text-yellow-100"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};