import { useState, useEffect } from 'react';
import { Input, Select, Button, DatePicker } from '@x-ear/ui-web';
import { Info, X } from 'lucide-react';

interface ExportDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExportDetailsData) => void;
  initialData?: ExportDetailsData;
}

export interface ExportDetailsData {
  customsDeclarationNumber?: string;
  customsDeclarationDate?: string;
  transportMode?: string;
  deliveryTerms?: string;
  gtipCode?: string;
  exportCountry?: string;
  exportPort?: string;
  containerNumber?: string;
  vehicleNumber?: string;
}

// Taşıma Şekilleri
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

// Teslim Şartları (INCOTERMS)
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

export function ExportDetailsModal({
  isOpen,
  onClose,
  onSave,
  initialData
}: ExportDetailsModalProps) {
  const [formData, setFormData] = useState<ExportDetailsData>({
    customsDeclarationNumber: initialData?.customsDeclarationNumber || '',
    customsDeclarationDate: initialData?.customsDeclarationDate || '',
    transportMode: initialData?.transportMode || '',
    deliveryTerms: initialData?.deliveryTerms || '',
    gtipCode: initialData?.gtipCode || '',
    exportCountry: initialData?.exportCountry || '',
    exportPort: initialData?.exportPort || '',
    containerNumber: initialData?.containerNumber || '',
    vehicleNumber: initialData?.vehicleNumber || ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (field: keyof ExportDetailsData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleCancel}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[600px] bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              İhracat Detay Bilgileri
            </h3>
            <Button
              type="button"
              onClick={handleCancel}
              variant="ghost"
              className="text-white hover:text-gray-200 hover:bg-green-700"
            >
              <X size={24} />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {/* Gümrük Beyannamesi */}
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
                  <p className="mt-1 text-sm text-gray-500">
                    Gümrük beyanname numarasını giriniz
                  </p>
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

              {/* Taşıma ve Teslim */}
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

              {/* GTİP Kodu */}
              <div>
                <Input
                  type="text"
                  label="GTİP Kodu"
                  value={formData.gtipCode}
                  onChange={(e) => handleChange('gtipCode', e.target.value)}
                  placeholder="12345678"
                  fullWidth
                />
                <p className="mt-1 text-sm text-gray-500">
                  Gümrük Tarife İstatistik Pozisyonu (8 haneli)
                </p>
              </div>

              {/* İhracat Ülke ve Liman */}
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

              {/* Konteyner ve Araç */}
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

              {/* Bilgilendirme */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="text-green-400 mr-2 flex-shrink-0" size={18} />
                  <div>
                    <h4 className="text-sm font-medium text-green-800 mb-1">
                      İhracat Faturası Bilgilendirme
                    </h4>
                    <p className="text-sm text-green-700">
                      İhracat faturaları için gümrük beyannamesi ve GTİP kodu zorunludur. 
                      Taşıma şekli ve teslim şartları (INCOTERMS) mutlaka belirtilmelidir.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
            <Button
              type="button"
              onClick={handleCancel}
              variant="default"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              İptal
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Kaydet
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
