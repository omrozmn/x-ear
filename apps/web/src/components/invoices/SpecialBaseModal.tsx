import { useState, useEffect } from 'react';
import { Input, Button } from '@x-ear/ui-web';

interface SpecialBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SpecialBaseData) => void;
  initialData?: SpecialBaseData;
  lineIndex?: number;
}

export interface SpecialBaseData {
  specialBaseAmount: number;
  specialBaseRate: number;
  calculatedTax: number;
}

export function SpecialBaseModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  lineIndex
}: SpecialBaseModalProps) {
  const [specialBaseAmount, setSpecialBaseAmount] = useState<string>(
    initialData?.specialBaseAmount?.toString() || ''
  );
  const [specialBaseRate, setSpecialBaseRate] = useState<string>(
    initialData?.specialBaseRate?.toString() || ''
  );
  const [calculatedTax, setCalculatedTax] = useState<string>(
    initialData?.calculatedTax?.toString() || ''
  );

  // Otomatik hesaplama
  useEffect(() => {
    const amount = parseFloat(specialBaseAmount) || 0;
    const rate = parseFloat(specialBaseRate) || 0;
    
    if (amount > 0 && rate > 0) {
      const tax = (amount * rate) / 100;
      setCalculatedTax(tax.toFixed(2));
    } else {
      setCalculatedTax('');
    }
  }, [specialBaseAmount, specialBaseRate]);

  const handleSave = () => {
    const data: SpecialBaseData = {
      specialBaseAmount: parseFloat(specialBaseAmount) || 0,
      specialBaseRate: parseFloat(specialBaseRate) || 0,
      calculatedTax: parseFloat(calculatedTax) || 0
    };
    
    onSave(data);
    onClose();
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
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4">
            <h3 className="text-lg font-medium text-white">
              Özel Matrah Bilgileri
              {lineIndex !== undefined && ` - Satır ${lineIndex + 1}`}
            </h3>
          </div>

          {/* Body */}
          <div className="bg-white px-6 py-4">
            <div className="space-y-4">
              {/* Özel Matrah Tutarı */}
              <div>
                <Input
                  type="number"
                  label="Özel Matrah Tutarı (TL)"
                  value={specialBaseAmount}
                  onChange={(e) => setSpecialBaseAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  fullWidth
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Özel matrah tutarını giriniz
                </p>
              </div>

              {/* Özel Matrah Oranı */}
              <div>
                <Input
                  type="number"
                  label="Özel Matrah Oranı (%)"
                  value={specialBaseRate}
                  onChange={(e) => setSpecialBaseRate(e.target.value)}
                  placeholder="0"
                  step="0.01"
                  min="0"
                  max="100"
                  fullWidth
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Özel matrah oranını giriniz (0-100 arası)
                </p>
              </div>

              {/* Hesaplanan KDV */}
              <div>
                <Input
                  type="text"
                  label="Hesaplanan KDV (TL)"
                  value={calculatedTax}
                  readOnly
                  disabled
                  fullWidth
                  className="bg-gray-50"
                />
                <p className="mt-1 text-sm text-blue-600">
                  Otomatik hesaplanmıştır
                </p>
              </div>

              {/* Hesaplama Formülü */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Hesaplama:</strong> KDV = (Özel Matrah Tutarı × Özel Matrah Oranı) / 100
                </p>
                {specialBaseAmount && specialBaseRate && (
                  <p className="text-sm text-blue-700 mt-1">
                    KDV = ({specialBaseAmount} × {specialBaseRate}) / 100 = {calculatedTax} TL
                  </p>
                )}
              </div>
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!specialBaseAmount || !specialBaseRate}
            >
              Kaydet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpecialBaseModal;
