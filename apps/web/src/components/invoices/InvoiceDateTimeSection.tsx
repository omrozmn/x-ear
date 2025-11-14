import { Input, Checkbox } from '@x-ear/ui-web';
import { Info } from 'lucide-react';

interface InvoiceDateTimeSectionProps {
  issueDate: string;
  issueTime?: string;
  dueDate?: string;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  onChange: (field: string, value: any) => void;
}

export function InvoiceDateTimeSection({
  issueDate,
  issueTime,
  dueDate,
  discount,
  discountType,
  onChange
}: InvoiceDateTimeSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tarih ve İskonto Bilgileri</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fatura Tarihi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fatura Tarihi *
          </label>
          <Input
            type="date"
            value={issueDate}
            onChange={(e) => onChange('issueDate', e.target.value)}
            className="w-full"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Faturanın düzenlenme tarihi
          </p>
        </div>

        {/* Fatura Saati */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fatura Saati *
          </label>
          <Input
            type="time"
            value={issueTime || ''}
            onChange={(e) => onChange('issueTime', e.target.value)}
            className="w-full"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            GİB için zorunlu alan (HH:mm)
          </p>
        </div>

        {/* Vade Tarihi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vade Tarihi
          </label>
          <Input
            type="date"
            value={dueDate || ''}
            onChange={(e) => onChange('dueDate', e.target.value)}
            className="w-full"
          />
          <p className="mt-1 text-xs text-gray-500">
            Ödeme vade tarihi (opsiyonel)
          </p>
        </div>

        {/* İskonto */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Genel İskonto
          </label>
          <div className="flex items-center space-x-3">
            <Input
              type="number"
              step="0.01"
              value={discount || ''}
              onChange={(e) => onChange('discount', parseFloat(e.target.value) || 0)}
              className="flex-1"
              placeholder="0.00"
            />
            <label className="flex items-center space-x-2 whitespace-nowrap">
              <Checkbox
                checked={discountType === 'percentage'}
                onChange={(e) => onChange('discountType', e.target.checked ? 'percentage' : 'amount')}
              />
              <span className="text-sm text-gray-700">Yüzde (%)</span>
            </label>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Tüm faturaya uygulanacak genel iskonto. 
            {discountType === 'percentage' ? ' Yüzde olarak hesaplanır.' : ' Tutar olarak düşülür.'}
          </p>
        </div>

      </div>
    </div>
  );
}
