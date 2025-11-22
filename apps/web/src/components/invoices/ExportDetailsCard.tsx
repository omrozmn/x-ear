import { useEffect, useState } from 'react';
import { Input, Select, Button, DatePicker } from '@x-ear/ui-web';
import { Info } from 'lucide-react';
import type { ExportDetailsData } from './ExportDetailsModal';

interface ExportDetailsCardProps {
  value?: ExportDetailsData;
  onChange: (data: ExportDetailsData) => void;
}

const TRANSPORT_MODES = [
  { value: '', label: 'Seçiniz' },
  { value: '1', label: 'Deniz Yolu' },
  { value: '2', label: 'Demiryolu' },
  { value: '3', label: 'Karayolu' },
  { value: '4', label: 'Havayolu' },
  { value: '5', label: 'Posta' },
  { value: '6', label: 'Çok Araçlı Taşıma' },
  { value: '7', label: 'Sabit Taşıma Tesisleri' },
  { value: '8', label: 'İç Su Taşımacılığı' },
  { value: '9', label: 'Kendi İmkanları' }
];

const DELIVERY_TERMS = [
  { value: '', label: 'Seçiniz' },
  { value: 'EXW', label: 'EXW - Ex Works (Fabrikada Teslim)' },
  { value: 'FCA', label: 'FCA - Free Carrier (Taşıyıcıya Teslim)' },
  { value: 'CPT', label: 'CPT - Carriage Paid To (Taşıma Ücreti Ödenmiş)' },
  { value: 'CIP', label: 'CIP - Carriage and Insurance Paid (Taşıma ve Sigorta Ödenmiş)' },
  { value: 'DAP', label: 'DAP - Delivered at Place (Yerde Teslim)' },
  { value: 'DPU', label: 'DPU - Delivered at Place Unloaded (Boşaltılmış Teslim)' },
  { value: 'DDP', label: 'DDP - Delivered Duty Paid (Gümrük Ödenmiş Teslim)' },
  { value: 'FAS', label: 'FAS - Free Alongside Ship (Gemi Doğrultusunda Teslim)' },
  { value: 'FOB', label: 'FOB - Free on Board (Gemide Teslim)' },
  { value: 'CFR', label: 'CFR - Cost and Freight (Maliyet ve Navlun)' },
  { value: 'CIF', label: 'CIF - Cost, Insurance and Freight (Maliyet, Sigorta ve Navlun)' }
];

export default function ExportDetailsCard({ value, onChange }: ExportDetailsCardProps) {
  const [formData, setFormData] = useState<ExportDetailsData>({
    customsDeclarationNumber: value?.customsDeclarationNumber || '',
    customsDeclarationDate: value?.customsDeclarationDate || '',
    transportMode: value?.transportMode || '',
    deliveryTerms: value?.deliveryTerms || '',
    gtipCode: value?.gtipCode || '',
    exportCountry: value?.exportCountry || '',
    exportPort: value?.exportPort || '',
    containerNumber: value?.containerNumber || '',
    vehicleNumber: value?.vehicleNumber || ''
  });

  useEffect(() => {
    if (value) setFormData(value);
  }, [value]);

  const handleChange = (field: keyof ExportDetailsData, v: string) => {
    const next = { ...formData, [field]: v };
    setFormData(next);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            type="text"
            label="Gümrük Beyanname Numarası"
            value={formData.customsDeclarationNumber}
            onChange={(e) => handleChange('customsDeclarationNumber', e.target.value)}
            placeholder="GB123456789"
            fullWidth
          />
        </div>
        <div>
          <DatePicker
            label="Gümrük Beyanname Tarihi"
            value={formData.customsDeclarationDate ? new Date(formData.customsDeclarationDate) : null}
            onChange={(date) => {
              if (!date) return handleChange('customsDeclarationDate', '');
              const yyyy = date.getFullYear();
              const mm = String(date.getMonth() + 1).padStart(2, '0');
              const dd = String(date.getDate()).padStart(2, '0');
              handleChange('customsDeclarationDate', `${yyyy}-${mm}-${dd}`);
            }}
            fullWidth
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Select
            label="Taşıma Şekli"
            value={formData.transportMode}
            onChange={(e) => handleChange('transportMode', e.target.value)}
            options={TRANSPORT_MODES}
            fullWidth
          />
        </div>
        <div>
          <Select
            label="Teslim Şartı (INCOTERMS)"
            value={formData.deliveryTerms}
            onChange={(e) => handleChange('deliveryTerms', e.target.value)}
            options={DELIVERY_TERMS}
            fullWidth
          />
        </div>
      </div>

      <div>
        <Input
          type="text"
          label="GTİP Kodu"
          value={formData.gtipCode}
          onChange={(e) => handleChange('gtipCode', e.target.value)}
          placeholder="12345678"
          fullWidth
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            type="text"
            label="İhracat Ülkesi"
            value={formData.exportCountry}
            onChange={(e) => handleChange('exportCountry', e.target.value)}
            placeholder="Almanya"
            fullWidth
          />
        </div>
        <div>
          <Input
            type="text"
            label="İhracat Limanı"
            value={formData.exportPort}
            onChange={(e) => handleChange('exportPort', e.target.value)}
            placeholder="Hamburg"
            fullWidth
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            type="text"
            label="Konteyner Numarası"
            value={formData.containerNumber}
            onChange={(e) => handleChange('containerNumber', e.target.value)}
            placeholder="ABCD1234567"
            fullWidth
          />
        </div>
        <div>
          <Input
            type="text"
            label="Araç Plakası / Uçak No"
            value={formData.vehicleNumber}
            onChange={(e) => handleChange('vehicleNumber', e.target.value)}
            placeholder="34 ABC 123"
            fullWidth
          />
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-start">
          <Info className="text-green-400 mr-2 flex-shrink-0" size={18} />
          <div>
            <h4 className="text-sm font-medium text-green-800 mb-1">İhracat Faturası Bilgilendirme</h4>
            <p className="text-sm text-green-700">İhracat faturaları için gümrük beyannamesi ve GTİP kodu zorunludur. Taşıma şekli ve teslim şartları (INCOTERMS) mutlaka belirtilmelidir.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
