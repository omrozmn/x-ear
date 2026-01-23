// import { Select, Input, Checkbox, DatePicker } from '@x-ear/ui-web'; // UI components not used
import { useEffect } from 'react';
import { Info } from 'lucide-react';
import { getCurrencyRestrictions } from '../../utils/currencyManager';

interface InvoiceTypeSectionProps {
  invoiceType: string;
  scenario?: string;
  currency?: string;
  specialTaxBase?: any;
  returnInvoiceDetails?: any;
  onChange: (field: string, value: any) => void;
  onSGKModeChange?: (isSGK: boolean) => void;
}

export function InvoiceTypeSection({
  invoiceType,
  scenario,
  currency,
  // specialTaxBase, // Not used in current implementation
  // returnInvoiceDetails, // Not used in current implementation
  onChange,
  onSGKModeChange
}: InvoiceTypeSectionProps) {
  const invoiceTypes = [
    { value: '', label: 'Seçiniz' },
    { value: '0', label: 'Satış Faturası' },
    { value: '50', label: 'İade' },
    { value: '13', label: 'İstisna' },
    { value: '11', label: 'Tevkifat' },
    { value: '12', label: 'Özel Matrah' },
    // representative code for İhraç Kayıtlı fatura (kept separate label)
    { value: '27', label: 'İhraç Kayıtlı Fatura' },
    { value: '14', label: 'SGK' },
    { value: '15', label: 'Tevkifat İade' },
    { value: '35', label: 'Teknoloji Destek' },
    // custom option
    { value: 'other', label: 'Diğer (Custom)' }
  ];

  // Representative groups (single representative per category)
  const withholdingTypes = ['11'];
  const specialBaseTypes = ['12'];
  const returnTypes = ['50', '15'];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceType, scenario, currency, onSGKModeChange]);

  // Koşullu görünürlük kontrolleri (currently not used in JSX but kept for future use)
  // const showWithholdingFields = withholdingTypes.includes(invoiceType);
  // const showSpecialBaseFields = specialBaseTypes.includes(invoiceType);
  // const showReturnFields = returnTypes.includes(invoiceType);
  const showSGKInfo = isSGKType;

  // Filter available invoice types based on selected scenario
  const allowedTypesForScenario = () => {
    // Accept both string keys and numeric codes for scenarios
    // scenario may be: 'other' | 'export' | 'government' | 'medical' OR '36' | '5' | '7' | '45'
    const s = String(scenario);
    // İhracat
    if (s === 'export' || s === '5') {
      return ['13'];
    }

    // Kamu
    if (s === 'government' || s === '7') {
      return ['', '0', '13', '11', '12', '27'];
    }

    // İlaç / Tıbbi Cihaz
    if (s === 'medical' || s === '45') {
      return ['', '0', '13', '11', '15', '50', '27'];
    }

    // Diğer (varsayılan) - includes scenario 'other' or code '36'
    return ['', '0', '50', '13', '11', '12', '27', '14', '15', '35'];
  };
  const allowedTypes = allowedTypesForScenario();

  return (
    <div className="space-y-4">
      {/* Fatura Tipi */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fatura Tipi <span className="text-red-500">*</span>
        </label>
        <select
          value={invoiceType}
          onChange={(e) => onChange('invoiceType', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          {invoiceTypes
            .filter((type) => allowedTypes.includes(type.value))
            .map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
        </select>
      </div>

      {/* SGK Bilgilendirme */}
      {showSGKInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="text-blue-400 mr-2 flex-shrink-0" size={18} />
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

      {/* Special-case checkboxes removed (handled via scenario / invoice type) */}

      {/* Özel matrah detayları taşındı: sağ sütunda gösterilecektir */}

      {/* Backdated invoice UI removed (handled in other flows) */}

      {/* Return invoice details are shown in the right-hand sidebar now */}
    </div>
  );
}
