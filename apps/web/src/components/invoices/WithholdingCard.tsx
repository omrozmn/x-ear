import { Button, Input } from '@x-ear/ui-web';
import { useState, useEffect } from 'react';
import { Info, AlertTriangle } from 'lucide-react';

interface WithholdingData {
  withholdingRate: number;
  taxFreeAmount: number;
  withholdingAmount: number;
}

interface WithholdingCardProps {
  value?: WithholdingData;
  onChange: (data: WithholdingData) => void;
}

export default function WithholdingCard({ value, onChange }: WithholdingCardProps) {
  const [formData, setFormData] = useState<Omit<WithholdingData, 'withholdingRate' | 'taxFreeAmount'> & {
    withholdingRate: number | '';
    taxFreeAmount: number | '';
  }>({
    withholdingRate: value?.withholdingRate ?? 0,
    taxFreeAmount: value?.taxFreeAmount ?? 0,
    withholdingAmount: value?.withholdingAmount ?? 0
  });

  useEffect(() => {
    if (value) setFormData(value);
  }, [value]);

  useEffect(() => {
    const rate = typeof formData.withholdingRate === 'number' ? formData.withholdingRate : 0;
    const amount = typeof formData.taxFreeAmount === 'number' ? formData.taxFreeAmount : 0;

    if (rate && amount) {
      const calculated = (rate / 100) * amount;
      setFormData(prev => ({ ...prev, withholdingAmount: parseFloat(calculated.toFixed(2)) }));
    }
  }, [formData.withholdingRate, formData.taxFreeAmount]);

  const handleSave = () => {
    onChange(formData as WithholdingData);
  };

  return (
    <div>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tevkifat İade Edilen Mal Oranı (%)</label>
          <Input
            type="number"
            step="0.01"
            value={String(formData.withholdingRate)}
            onChange={(e) => setFormData({ ...formData, withholdingRate: e.target.value === '' ? '' : parseFloat(e.target.value) })}
            placeholder="Örn: 50"
            fullWidth
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tevkifatsız İade KDV Tutarı (TL)</label>
          <Input
            type="number"
            step="0.01"
            value={String(formData.taxFreeAmount)}
            onChange={(e) => setFormData({ ...formData, taxFreeAmount: e.target.value === '' ? '' : parseFloat(e.target.value) })}
            placeholder="0.00"
            fullWidth
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tevkifat İade KDV Tutarı (TL)</label>
          <Input type="number" step="0.01" value={formData.withholdingAmount} readOnly className="bg-gray-50" fullWidth />
        </div>

        {Number(formData.withholdingRate) > 0 && Number(formData.taxFreeAmount) > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start">
              <Info className="text-blue-400 mr-2 flex-shrink-0" size={18} />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Hesaplama:</p>
                <p>{formData.withholdingRate}% × {Number(formData.taxFreeAmount).toFixed(2)} TL = <span className="font-semibold">{formData.withholdingAmount.toFixed(2)} TL</span></p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex">
            <AlertTriangle className="text-yellow-400 mr-2 flex-shrink-0" size={18} />
            <div className="text-sm text-yellow-700">
              <p className="font-medium mb-1">Dikkat:</p>
              <p>Tevkifat iade bilgileri fatura satırına kaydedilecektir. Bu bilgiler BirFatura üzerinden GİB'e gönderilecektir.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} variant="default">Kaydet</Button>
        </div>
      </div>
    </div>
  );
}
