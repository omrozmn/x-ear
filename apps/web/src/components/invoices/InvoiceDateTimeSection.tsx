import { Input, DatePicker } from '@x-ear/ui-web';

interface InvoiceDateTimeSectionProps {
  issueDate: string;
  issueTime?: string;
  discount?: number;
  discountType?: 'percentage' | 'amount';
  onChange: (field: string, value: string | number) => void;
}

export function InvoiceDateTimeSection({
  issueDate,
  issueTime,
  onChange
}: InvoiceDateTimeSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Fatura Tarihi</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fatura Tarihi */}
        <div>
          <DatePicker
            label="Fatura Tarihi *"
            value={issueDate ? new Date(issueDate) : null}
            onChange={(date) => {
              if (!date) return onChange('issueDate', '');
              const yyyy = date.getFullYear();
              const mm = String(date.getMonth() + 1).padStart(2, '0');
              const dd = String(date.getDate()).padStart(2, '0');
              onChange('issueDate', `${yyyy}-${mm}-${dd}`);
            }}
            placeholder="Tarih seçin"
            fullWidth
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
      </div>
    </div>
  );
}
