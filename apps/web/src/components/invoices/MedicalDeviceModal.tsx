import { useState, useEffect } from 'react';
import { Input, Select, Button } from '@x-ear/ui-web';

interface MedicalDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MedicalDeviceData) => void;
  initialData?: MedicalDeviceData;
  lineIndex?: number;
  itemName?: string;
}

export interface MedicalDeviceData {
  licenseNumber: string;
  serialNumber?: string;
  lotNumber?: string;
  deviceCode?: string;
  deviceType?: string;
  expiryDate?: string;
  manufacturer?: string;
}

// İlaç/Tıbbi Cihaz Tipleri
const DEVICE_TYPES = [
  { value: '', label: 'Seçiniz' },
  { value: 'medicine', label: 'İlaç' },
  { value: 'medical_device', label: 'Tıbbi Cihaz' },
  { value: 'medical_supply', label: 'Tıbbi Sarf Malzeme' },
  { value: 'diagnostic', label: 'Tanı Kiti' },
  { value: 'implant', label: 'İmplant' },
  { value: 'prosthesis', label: 'Protez' }
];

export function MedicalDeviceModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  lineIndex,
  itemName
}: MedicalDeviceModalProps) {
  const [formData, setFormData] = useState<MedicalDeviceData>({
    licenseNumber: initialData?.licenseNumber || '',
    serialNumber: initialData?.serialNumber || '',
    lotNumber: initialData?.lotNumber || '',
    deviceCode: initialData?.deviceCode || '',
    deviceType: initialData?.deviceType || '',
    expiryDate: initialData?.expiryDate || '',
    manufacturer: initialData?.manufacturer || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (field: keyof MedicalDeviceData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.licenseNumber || formData.licenseNumber.trim() === '') {
      newErrors.licenseNumber = 'Ruhsat numarası zorunludur';
    }

    if (!formData.deviceType) {
      newErrors.deviceType = 'Cihaz tipi seçilmelidir';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(formData);
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleCancel}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-purple-600 px-6 py-4">
            <h3 className="text-lg font-medium text-white">
              İlaç ve Tıbbi Cihaz Bilgileri
              {lineIndex !== undefined && ` - Satır ${lineIndex + 1}`}
            </h3>
            {itemName && (
              <p className="text-sm text-purple-100 mt-1">{itemName}</p>
            )}
          </div>

          {/* Body */}
          <div className="bg-white px-6 py-4">
            <div className="space-y-4">
              {/* Cihaz Tipi */}
              <div>
                <Select
                  label="Cihaz Tipi"
                  value={formData.deviceType}
                  onChange={(e) => handleChange('deviceType', e.target.value)}
                  options={DEVICE_TYPES}
                  error={errors.deviceType}
                  fullWidth
                  required
                />
              </div>

              {/* Ruhsat Numarası */}
              <div>
                <Input
                  type="text"
                  label="Ruhsat Numarası"
                  value={formData.licenseNumber}
                  onChange={(e) => handleChange('licenseNumber', e.target.value)}
                  placeholder="RN-12345678"
                  error={errors.licenseNumber}
                  fullWidth
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  İlaç veya tıbbi cihaz ruhsat numarasını giriniz
                </p>
              </div>

              {/* Cihaz Kodu */}
              <div>
                <Input
                  type="text"
                  label="Cihaz Kodu"
                  value={formData.deviceCode}
                  onChange={(e) => handleChange('deviceCode', e.target.value)}
                  placeholder="DC-12345"
                  fullWidth
                />
                <p className="mt-1 text-sm text-gray-500">
                  Ürün kodu veya barkod numarası
                </p>
              </div>

              {/* Seri ve Lot Numarası */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    type="text"
                    label="Seri Numarası"
                    value={formData.serialNumber}
                    onChange={(e) => handleChange('serialNumber', e.target.value)}
                    placeholder="SN-123456"
                    fullWidth
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Ürün seri numarası (varsa)
                  </p>
                </div>

                <div>
                  <Input
                    type="text"
                    label="Lot Numarası"
                    value={formData.lotNumber}
                    onChange={(e) => handleChange('lotNumber', e.target.value)}
                    placeholder="LOT-123456"
                    fullWidth
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Üretim lot numarası (varsa)
                  </p>
                </div>
              </div>

              {/* Son Kullanma Tarihi ve Üretici */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    type="date"
                    label="Son Kullanma Tarihi"
                    value={formData.expiryDate}
                    onChange={(e) => handleChange('expiryDate', e.target.value)}
                    fullWidth
                  />
                </div>

                <div>
                  <Input
                    type="text"
                    label="Üretici Firma"
                    value={formData.manufacturer}
                    onChange={(e) => handleChange('manufacturer', e.target.value)}
                    placeholder="Üretici firma adı"
                    fullWidth
                  />
                </div>
              </div>

              {/* Bilgilendirme */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-purple-400 mr-2">ℹ️</span>
                  <div>
                    <h4 className="text-sm font-medium text-purple-800 mb-1">
                      İlaç ve Tıbbi Cihaz Faturası
                    </h4>
                    <p className="text-sm text-purple-700">
                      İlaç ve tıbbi cihaz faturalarında ruhsat numarası zorunludur. 
                      Seri/Lot numarası ve son kullanma tarihi bilgileri önerilir.
                    </p>
                  </div>
                </div>
              </div>

              {/* Hata Mesajları */}
              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <span className="text-red-400 mr-2">⚠️</span>
                    <div>
                      <h4 className="text-sm font-medium text-red-800 mb-1">
                        Lütfen zorunlu alanları doldurun
                      </h4>
                      <ul className="text-sm text-red-700 list-disc list-inside">
                        {Object.values(errors).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
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
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Kaydet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
