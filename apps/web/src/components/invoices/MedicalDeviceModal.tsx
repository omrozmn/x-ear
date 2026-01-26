import { useState, useEffect } from 'react';
import { Input, Button, DatePicker, RadioGroup } from '@x-ear/ui-web';
import { Info, AlertTriangle } from 'lucide-react';
import { MedicalDeviceData } from '../../types/invoice';

interface MedicalDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MedicalDeviceData) => void;
  initialData?: MedicalDeviceData;
  lineIndex?: number;
  itemName?: string;
}

export function MedicalDeviceModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  lineIndex,
  itemName
}: MedicalDeviceModalProps) {
  const [formData, setFormData] = useState<MedicalDeviceData>({
    productType: initialData?.productType || 'ilac',
    urunNo: initialData?.urunNo || '',
    partiNo: initialData?.partiNo || '',
    seriNo: initialData?.seriNo || '',
    tarih: initialData?.tarih || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (field: keyof MedicalDeviceData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    if (field === 'partiNo' && formData.productType === 'tibbicihaz') {
      if (value.trim() !== '') {
        setFormData(prev => ({ ...prev, seriNo: '' }));
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.productType) {
      newErrors.productType = 'Ürün türü seçilmelidir';
    }

    if (!formData.urunNo || formData.urunNo.trim() === '') {
      newErrors.urunNo = formData.productType === 'ilac'
        ? 'GTIN numarası zorunludur'
        : 'UNO (Ürün Numarası) zorunludur';
    }

    if (!formData.partiNo || formData.partiNo.trim() === '') {
      newErrors.partiNo = formData.productType === 'ilac'
        ? 'Parti numarası zorunludur'
        : 'LNO (Lot Numarası) zorunludur';
    }

    if (formData.productType === 'ilac' && (!formData.seriNo || formData.seriNo.trim() === '')) {
      newErrors.seriNo = 'SN - Sıra Numarası zorunludur';
    }

    if (formData.productType === 'tibbicihaz') {
      if ((!formData.partiNo || formData.partiNo.trim() === '') &&
        (!formData.seriNo || formData.seriNo.trim() === '')) {
        newErrors.seriNo = 'LNO veya SNO dan biri zorunludur';
      }
    }

    if (!formData.tarih || formData.tarih.trim() === '') {
      newErrors.tarih = formData.productType === 'ilac'
        ? 'Son kullanma tarihi zorunludur'
        : 'Üretim tarihi zorunludur';
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

  const labels = formData.productType === 'ilac' ? {
    urunNo: 'GTIN Numarası',
    partiNo: 'Parti Numarası',
    seriNo: 'SN - Sıra Numarası',
    tarih: 'Son Kullanma Tarihi'
  } : {
    urunNo: 'UNO (Ürün Numarası)',
    partiNo: 'LNO (Lot/Batch Numarası)',
    seriNo: 'SNO (Seri/Sıra Numarası)',
    tarih: 'Üretim Tarihi'
  };

  const seriNoDisabled = formData.productType === 'tibbicihaz' &&
    formData.partiNo &&
    formData.partiNo.trim() !== '';


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleCancel}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-purple-600 px-6 py-4">
            <h3 className="text-lg font-medium text-white">
              İlaç ve Tıbbi Cihaz Bilgileri
              {lineIndex !== undefined && ` - Satır ${lineIndex + 1}`}
            </h3>
            {itemName && (
              <p className="text-sm text-purple-100 mt-1">{itemName}</p>
            )}
          </div>

          <div className="bg-white px-6 py-4">
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <RadioGroup
                  label="Ürün Türü *"
                  name="productType"
                  value={formData.productType}
                  onChange={(value) => handleChange('productType', value)}
                  options={[
                    { value: 'ilac', label: 'İlaç' },
                    { value: 'tibbicihaz', label: 'Tıbbi Cihaz' }
                  ]}
                  error={errors.productType}
                />
              </div>


              <div>
                <Input
                  type="text"
                  label={labels.urunNo}
                  value={formData.urunNo}
                  onChange={(e) => handleChange('urunNo', e.target.value)}
                  placeholder={formData.productType === 'ilac' ? 'GTIN-12345678' : 'UNO-12345678'}
                  error={errors.urunNo}
                  fullWidth
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.productType === 'ilac'
                    ? 'İlaç GTIN numarasını giriniz'
                    : 'Tıbbi cihaz ürün numarasını giriniz'}
                </p>
              </div>

              <div>
                <Input
                  type="text"
                  label={labels.partiNo}
                  value={formData.partiNo}
                  onChange={(e) => handleChange('partiNo', e.target.value)}
                  placeholder={formData.productType === 'ilac' ? 'PARTI-123456' : 'LNO-123456'}
                  error={errors.partiNo}
                  fullWidth
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.productType === 'ilac'
                    ? 'İlaç parti numarasını giriniz'
                    : 'Tıbbi cihaz lot numarasını giriniz'}
                </p>
              </div>

              <div>
                <Input
                  type="text"
                  label={labels.seriNo}
                  value={formData.seriNo}
                  onChange={(e) => handleChange('seriNo', e.target.value)}
                  placeholder={formData.productType === 'ilac' ? 'SN-123456' : 'SNO-123456'}
                  error={errors.seriNo}
                  disabled={seriNoDisabled ? true : false}
                  fullWidth
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.productType === 'ilac'
                    ? 'İlaç sıra numarası (zorunlu)'
                    : seriNoDisabled
                      ? 'LNO dolu olduğunda SNO devre dışıdır'
                      : 'Tıbbi cihaz seri numarası (LNO boşsa zorunlu)'}
                </p>
              </div>

              <div>
                <DatePicker
                  label={labels.tarih}
                  value={formData.tarih ? new Date(formData.tarih) : null}
                  onChange={(date) => handleChange('tarih', date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : '')}
                  error={errors.tarih}
                  fullWidth
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.productType === 'ilac'
                    ? 'İlaç son kullanma tarihi'
                    : 'Tıbbi cihaz üretim tarihi'}
                </p>
              </div>


              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="text-purple-400 mr-2 flex-shrink-0" size={18} />
                  <div>
                    <h4 className="text-sm font-medium text-purple-800 mb-1">
                      {formData.productType === 'ilac' ? 'İlaç Faturası' : 'Tıbbi Cihaz Faturası'}
                    </h4>
                    <ul className="text-sm text-purple-700 list-disc list-inside space-y-1">
                      {formData.productType === 'ilac' ? (
                        <>
                          <li>GTIN, Parti No, SN ve Son Kullanma Tarihi zorunludur</li>
                          <li>Tüm alanlar aktiftir</li>
                        </>
                      ) : (
                        <>
                          <li>UNO, LNO/SNO ve Üretim Tarihi zorunludur</li>
                          <li>LNO dolu ise SNO devre dışı kalır</li>
                          <li>LNO boş ise SNO zorunludur</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="text-red-400 mr-2 flex-shrink-0" size={18} />
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

export default MedicalDeviceModal;
