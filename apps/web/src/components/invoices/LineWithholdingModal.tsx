import { Button, Input, Select } from '@x-ear/ui-web';
import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { LineWithholdingData } from '../../types/invoice';

interface LineWithholdingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LineWithholdingData) => void;
  initialData?: LineWithholdingData;
  itemIndex: number;
  itemName: string;
  itemAmount: number;
}

const withholdingCodes = [
  { code: 'TEV001', description: 'Serbest Meslek Makbuzu (%20)', rate: 20 },
  { code: 'TEV002', description: 'Kira Geliri (%20)', rate: 20 },
  { code: 'TEV003', description: 'Menkul Sermaye İradı (%15)', rate: 15 },
  { code: 'TEV004', description: 'Ticari Kazanç (%20)', rate: 20 },
  { code: 'TEV005', description: 'Yapım İşleri (%3)', rate: 3 },
  { code: 'TEV006', description: 'Etüd, Proje, Plan (%5)', rate: 5 },
  { code: 'TEV007', description: 'Makine, Teçhizat Kiralama (%5)', rate: 5 },
  { code: 'TEV008', description: 'Yemek Servisi (%5)', rate: 5 },
  { code: 'TEV009', description: 'Temizlik Hizmeti (%5)', rate: 5 },
  { code: 'TEV010', description: 'Özel Güvenlik Hizmeti (%5)', rate: 5 }
];

export function LineWithholdingModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  itemIndex,
  itemName,
  itemAmount
}: LineWithholdingModalProps) {
  const [formData, setFormData] = useState<Omit<LineWithholdingData, 'rate'> & { rate: number | '' }>({
    code: initialData?.code || '',
    rate: initialData?.rate ?? 0,
    amount: initialData?.amount ?? 0
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Otomatik hesaplama
  useEffect(() => {
    const rateVal = typeof formData.rate === 'number' ? formData.rate : 0;
    if (rateVal && itemAmount) {
      const calculated = (rateVal / 100) * itemAmount;
      setFormData(prev => ({
        ...prev,
        amount: parseFloat(calculated.toFixed(2))
      }));
    }
  }, [formData.rate, itemAmount]);

  const handleCodeSelect = (code: string) => {
    const selected = withholdingCodes.find(w => w.code === code);
    if (selected) {
      setFormData({
        code: selected.code,
        rate: selected.rate,
        amount: parseFloat(((selected.rate / 100) * itemAmount).toFixed(2))
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as LineWithholdingData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                    Satır Bazında Tevkifat
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-900">
                      <span className="font-medium">Satır {itemIndex + 1}:</span> {itemName}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Tutar: {itemAmount.toFixed(2)} TL
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Tevkifat Kodu */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tevkifat Kodu
                      </label>
                      <Select
                        value={formData.code}
                        onChange={(e) => handleCodeSelect(e.target.value)}
                        options={[
                          { value: '', label: 'Tevkifat Kodu Seçiniz' },
                          ...withholdingCodes.map(w => ({
                            value: w.code,
                            label: `${w.code} - ${w.description}`
                          }))
                        ]}
                        fullWidth
                        required
                      />
                    </div>

                    {/* Tevkifat Oranı */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tevkifat Oranı (%)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={String(formData.rate)}
                        onChange={(e) => setFormData({
                          ...formData,
                          rate: e.target.value === '' ? '' : parseFloat(e.target.value)
                        })}
                        className="w-full"
                        placeholder="20"
                        required
                      />
                    </div>

                    {/* Hesaplanan Tevkifat Tutarı */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tevkifat Tutarı (TL)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        readOnly
                        className="w-full bg-gray-50"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Otomatik hesaplanır: ({formData.rate}% × {itemAmount.toFixed(2)} TL)
                      </p>
                    </div>

                    {/* Hesaplama Özeti */}
                    {Number(formData.rate) > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <CheckCircle className="text-green-400 mr-2 flex-shrink-0" size={18} />
                          <div className="text-sm text-green-700">
                            <p className="font-medium mb-1">Tevkifat Hesaplaması:</p>
                            <p>Brüt Tutar: {itemAmount.toFixed(2)} TL</p>
                            <p>Tevkifat ({formData.rate}%): -{formData.amount.toFixed(2)} TL</p>
                            <p className="font-semibold mt-1">
                              Net Tutar: {(itemAmount - formData.amount).toFixed(2)} TL
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <Button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                variant="default">
                Kaydet
              </Button>
              <Button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                variant="default">
                İptal
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LineWithholdingModal;
