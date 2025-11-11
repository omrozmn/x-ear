import { Select, Input, Checkbox } from '@x-ear/ui-web';
import { useState, useEffect } from 'react';
import { getCurrencyRestrictions } from '../../utils/currencyManager';

interface InvoiceTypeSectionProps {
  invoiceType: string;
  scenario?: string;
  currency?: string;
  specialTaxBase?: any;
  backdatedInvoice?: any;
  returnInvoiceDetails?: any;
  isTechnologySupport?: boolean;
  isMedicalDevice?: boolean;
  onChange: (field: string, value: any) => void;
  onSGKModeChange?: (isSGK: boolean) => void;
}

export function InvoiceTypeSection({
  invoiceType,
  scenario,
  currency,
  specialTaxBase,
  backdatedInvoice,
  returnInvoiceDetails,
  isTechnologySupport,
  isMedicalDevice,
  onChange,
  onSGKModeChange
}: InvoiceTypeSectionProps) {
  const invoiceTypes = [
    { value: '', label: 'Seçiniz' },
    { value: '0', label: 'Satış Faturası' },
    { value: '11', label: 'Tevkifat (11)' },
    { value: '18', label: 'Tevkifat (18)' },
    { value: '24', label: 'Tevkifat (24)' },
    { value: '32', label: 'Tevkifat (32)' },
    { value: '12', label: 'Özel Matrah (12)' },
    { value: '19', label: 'Özel Matrah (19)' },
    { value: '25', label: 'Özel Matrah (25)' },
    { value: '33', label: 'Özel Matrah (33)' },
    { value: '13', label: 'İhracat (13)' },
    { value: '14', label: 'SGK (14)' },
    { value: '15', label: 'Tevkifat İade (15)' },
    { value: '49', label: 'Tevkifat İade (49)' },
    { value: '50', label: 'İade (50)' },
    { value: '35', label: 'Teknoloji Destek (35)' }
  ];

  // Tevkifat tipleri
  const withholdingTypes = ['11', '18', '24', '32'];
  // Özel matrah tipleri
  const specialBaseTypes = ['12', '19', '25', '33'];
  // İade tipleri
  const returnTypes = ['15', '49', '50'];
  // SGK tipi
  const isSGKType = invoiceType === '14';

  // Fatura tipi değiştiğinde
  useEffect(() => {
    // SGK modu değişikliğini bildir
    if (onSGKModeChange) {
      onSGKModeChange(isSGKType);
    }

    // Para birimini kontrol et ve gerekirse TRY'ye zorla
    const restrictions = getCurrencyRestrictions(scenario, invoiceType);
    if (restrictions.forceTRY && currency !== 'TRY') {
      onChange('currency', 'TRY');
    }

    // İade faturası için KDV'leri 0 yap
    if (returnTypes.includes(invoiceType)) {
      // Bu işlem ProductLinesSection'da yapılacak
      console.log('İade faturası seçildi - KDV oranları 0 yapılmalı');
    }
  }, [invoiceType, scenario, currency, onSGKModeChange]);

  // Koşullu görünürlük kontrolleri
  const showWithholdingFields = withholdingTypes.includes(invoiceType);
  const showSpecialBaseFields = specialBaseTypes.includes(invoiceType);
  const showReturnFields = returnTypes.includes(invoiceType);
  const showSGKInfo = isSGKType;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Fatura Tipi ve Özel Durumlar</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fatura Tipi */}
        <div>
          <Select
            label="Fatura Tipi"
            value={invoiceType}
            onChange={(e) => onChange('invoiceType', e.target.value)}
            options={invoiceTypes}
            fullWidth
            required
          />
        </div>

        {/* SGK Bilgilendirme */}
        {showSGKInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-blue-400 mr-2">ℹ️</span>
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-1">
                  SGK Faturası
                </h4>
                <p className="text-sm text-blue-700">
                  SGK faturası için müşteri bilgileri otomatik olarak ayarlanacaktır. Para birimi TRY olmalıdır.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Özel Durumlar */}
        <div className="space-y-3">
          <label className="flex items-center space-x-2">
            <Checkbox
              checked={isTechnologySupport || false}
              onChange={(e) => onChange('isTechnologySupport', e.target.checked)}
            />
            <span className="text-sm font-medium text-gray-700">Teknoloji Destek Faturası</span>
          </label>

          <label className="flex items-center space-x-2">
            <Checkbox
              checked={isMedicalDevice || false}
              onChange={(e) => onChange('isMedicalDevice', e.target.checked)}
            />
            <span className="text-sm font-medium text-gray-700">İlaç ve Tıbbi Cihaz</span>
          </label>

          <label className="flex items-center space-x-2">
            <Checkbox
              checked={backdatedInvoice?.isBackdated || false}
              onChange={(e) => onChange('backdatedInvoice', {
                ...backdatedInvoice,
                isBackdated: e.target.checked
              })}
            />
            <span className="text-sm font-medium text-gray-700">Geriye Fatura</span>
          </label>
        </div>

        {/* Özel Matrah */}
        {invoiceType === 'special_tax_base' && (
          <div className="md:col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900 mb-3">Özel Matrah Bilgileri</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Özel Matrah Tutarı
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={specialTaxBase?.amount || ''}
                  onChange={(e) => onChange('specialTaxBase', {
                    ...specialTaxBase,
                    hasSpecialTaxBase: true,
                    amount: parseFloat(e.target.value)
                  })}
                  className="w-full"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  KDV Oranı (%)
                </label>
                <Input
                  type="number"
                  value={specialTaxBase?.taxRate || ''}
                  onChange={(e) => onChange('specialTaxBase', {
                    ...specialTaxBase,
                    taxRate: parseFloat(e.target.value)
                  })}
                  className="w-full"
                  placeholder="18"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <Input
                  type="text"
                  value={specialTaxBase?.description || ''}
                  onChange={(e) => onChange('specialTaxBase', {
                    ...specialTaxBase,
                    description: e.target.value
                  })}
                  className="w-full"
                  placeholder="Özel matrah açıklaması"
                />
              </div>
            </div>
          </div>
        )}

        {/* Geriye Fatura Detayları */}
        {backdatedInvoice?.isBackdated && (
          <div className="md:col-span-2 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-orange-900 mb-3">Geriye Fatura Bilgileri</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orijinal Tarih
                </label>
                <Input
                  type="date"
                  value={backdatedInvoice?.originalDate || ''}
                  onChange={(e) => onChange('backdatedInvoice', {
                    ...backdatedInvoice,
                    originalDate: e.target.value
                  })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Geriye Fatura Nedeni
                </label>
                <Input
                  type="text"
                  value={backdatedInvoice?.reason || ''}
                  onChange={(e) => onChange('backdatedInvoice', {
                    ...backdatedInvoice,
                    reason: e.target.value
                  })}
                  className="w-full"
                  placeholder="Neden belirtiniz"
                />
              </div>
            </div>
          </div>
        )}

        {/* İade Fatura Detayları */}
        {invoiceType === 'return' && (
          <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-900 mb-3">İade Fatura Bilgileri</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İade Fatura No
                </label>
                <Input
                  type="text"
                  value={returnInvoiceDetails?.returnInvoiceNumber || ''}
                  onChange={(e) => onChange('returnInvoiceDetails', {
                    ...returnInvoiceDetails,
                    returnInvoiceNumber: e.target.value
                  })}
                  className="w-full"
                  placeholder="İade edilen fatura numarası"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İade Fatura Tarihi
                </label>
                <Input
                  type="date"
                  value={returnInvoiceDetails?.returnInvoiceDate || ''}
                  onChange={(e) => onChange('returnInvoiceDetails', {
                    ...returnInvoiceDetails,
                    returnInvoiceDate: e.target.value
                  })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İade Nedeni
                </label>
                <Input
                  type="text"
                  value={returnInvoiceDetails?.returnReason || ''}
                  onChange={(e) => onChange('returnInvoiceDetails', {
                    ...returnInvoiceDetails,
                    returnReason: e.target.value
                  })}
                  className="w-full"
                  placeholder="İade nedeni"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
