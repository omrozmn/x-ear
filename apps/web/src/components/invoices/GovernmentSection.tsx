import { Select, Checkbox } from '@x-ear/ui-web';
import { AlertTriangle } from 'lucide-react';
import type { InvoiceFormData } from '../../types/invoice';
import {
  GOVERNMENT_EXEMPTION_REASONS,
  GOVERNMENT_EXPORT_REGISTERED_REASONS
} from '../../constants/governmentInvoiceConstants';

interface GovernmentSectionProps {
  formData: InvoiceFormData;
  onChange: <K extends keyof InvoiceFormData>(field: K, value: InvoiceFormData[K]) => void;
  errors?: Record<string, string>;
}

export function GovernmentSection({
  formData,
  onChange,
  errors = {}
}: GovernmentSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Kamu Faturası Özel Bilgileri</h3>
      
      <div className="space-y-4">
        {/* Kamu Ödeme Yapacak Alıcı */}
        <div>
          <Checkbox
            id="governmentPayingCustomer"
            label="Kamu Ödeme Yapacak Alıcı"
            checked={formData.governmentPayingCustomer || false}
            onChange={(e) => onChange('governmentPayingCustomer', e.target.checked)}
          />
        </div>

        {/* Kamu İstisna Sebebi */}
        <div>
          <Select
            label="Kamu İstisna Sebebi"
            value={formData.governmentExemptionReason || '0'}
            onChange={(e) => onChange('governmentExemptionReason', e.target.value)}
            options={GOVERNMENT_EXEMPTION_REASONS}
            error={errors.governmentExemptionReason}
            fullWidth
          />
          <p className="mt-1 text-sm text-gray-500">
            Kamu faturası için istisna sebebini seçiniz
          </p>
        </div>

        {/* Kamu İhraç Kayıtlı Sebebi */}
        <div>
          <Select
            label="Kamu İhraç Kayıtlı Sebebi"
            value={formData.governmentExportRegisteredReason || '0'}
            onChange={(e) => onChange('governmentExportRegisteredReason', e.target.value)}
            options={GOVERNMENT_EXPORT_REGISTERED_REASONS}
            error={errors.governmentExportRegisteredReason}
            fullWidth
          />
          <p className="mt-1 text-sm text-gray-500">
            İhraç kayıtlı satış için sebep seçiniz
          </p>
        </div>

        {/* Bilgilendirme */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="text-amber-400 mr-2 flex-shrink-0" size={18} />
            <div>
              <h4 className="text-sm font-medium text-amber-800 mb-1">
                Kamu Faturası Uyarısı
              </h4>
              <p className="text-sm text-amber-700">
                Kamu faturalarında para birimi TRY olmalıdır. Ödeme bilgisi paneli otomatik olarak açılacaktır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
