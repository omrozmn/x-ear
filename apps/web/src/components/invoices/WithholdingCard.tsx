import { Button, Input, Select } from '@x-ear/ui-web';
import { useState, useEffect } from 'react';
import { Info, AlertTriangle } from 'lucide-react';

interface WithholdingData {
  withholdingRate: number;
  taxFreeAmount: number;
  withholdingAmount: number;
  withholdingCode?: string;
  withholdingType?: 'partial' | 'full';
  code?: string;
}

interface WithholdingCardProps {
  value?: WithholdingData;
  onChange: (data: WithholdingData) => void;
}

export default function WithholdingCard({ value, onChange }: WithholdingCardProps) {
  const withholdingCodes = [
    { code: '601', label: '601 - Yapım İşleri', rate: 40, type: 'partial' as const },
    { code: '602', label: '602 - Danışmanlık ve Benzeri', rate: 90, type: 'partial' as const },
    { code: '606', label: '606 - İş Gücü Temin Hizmeti', rate: 90, type: 'partial' as const },
    { code: '612', label: '612 - Temizlik Hizmeti', rate: 90, type: 'partial' as const },
    { code: '624', label: '624 - Yük Taşımacılığı', rate: 20, type: 'partial' as const },
    { code: '625', label: '625 - Ticari Reklam Hizmeti', rate: 30, type: 'partial' as const },
    { code: '801', label: '801 - Yapım İşleri (Tam)', rate: 100, type: 'full' as const },
    { code: '806', label: '806 - İş Gücü Temin Hizmeti (Tam)', rate: 100, type: 'full' as const },
    { code: '812', label: '812 - Temizlik Hizmeti (Tam)', rate: 100, type: 'full' as const },
    { code: '823', label: '823 - Yük Taşımacılığı (Tam)', rate: 100, type: 'full' as const },
    { code: '824', label: '824 - Ticari Reklam Hizmeti (Tam)', rate: 100, type: 'full' as const }
  ];

  const [formData, setFormData] = useState<Omit<WithholdingData, 'withholdingRate' | 'taxFreeAmount'> & {
    withholdingRate: number | '';
    taxFreeAmount: number | '';
  }>({
    withholdingRate: value?.withholdingRate ?? 0,
    taxFreeAmount: value?.taxFreeAmount ?? 0,
    withholdingAmount: value?.withholdingAmount ?? 0,
    withholdingCode: value?.withholdingCode ?? value?.code ?? '',
    withholdingType: value?.withholdingType ?? 'partial',
    code: value?.code ?? value?.withholdingCode ?? ''
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

  const handleCodeChange = (code: string) => {
    const selected = withholdingCodes.find((item) => item.code === code);
    setFormData((prev) => ({
      ...prev,
      withholdingCode: code,
      code,
      withholdingRate: selected?.rate ?? prev.withholdingRate,
      withholdingType: selected?.type ?? prev.withholdingType
    }));
  };

  return (
    <div>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tevkifat Kodu</label>
          <Select
            value={formData.withholdingCode || ''}
            onChange={(e) => handleCodeChange(e.target.value)}
            options={[
              { value: '', label: 'Tevkifat kodu seçiniz' },
              ...withholdingCodes.map((item) => ({ value: item.code, label: item.label }))
            ]}
            fullWidth
          />
        </div>

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
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
            <div className="flex items-start">
              <Info className="text-blue-400 mr-2 flex-shrink-0" size={18} />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Hesaplama:</p>
                <p>{formData.withholdingRate}% × {Number(formData.taxFreeAmount).toFixed(2)} TL = <span className="font-semibold">{formData.withholdingAmount.toFixed(2)} TL</span></p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3">
          <div className="flex">
            <AlertTriangle className="text-yellow-400 mr-2 flex-shrink-0" size={18} />
            <div className="text-sm text-yellow-700">
              <p className="font-medium mb-1">Dikkat:</p>
              <p>Bu alan belge seviyesi tevkifat varsayılanıdır. Satırda ayrıca tevkifat tanımlı değilse XML üretiminde satırlara fallback olarak uygulanır.</p>
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
