import { Button, Input } from '@x-ear/ui-web';
import { useState, useEffect } from 'react';

interface WithholdingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: WithholdingData) => void;
  initialData?: WithholdingData;
  itemIndex?: number;
}

interface WithholdingData {
  withholdingRate: number;
  taxFreeAmount: number;
  withholdingAmount: number;
}

export function WithholdingModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  itemIndex
}: WithholdingModalProps) {
  const [formData, setFormData] = useState<WithholdingData>({
    withholdingRate: initialData?.withholdingRate || 0,
    taxFreeAmount: initialData?.taxFreeAmount || 0,
    withholdingAmount: initialData?.withholdingAmount || 0
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Otomatik hesaplama
  useEffect(() => {
    if (formData.withholdingRate && formData.taxFreeAmount) {
      const calculated = (formData.withholdingRate / 100) * formData.taxFreeAmount;
      setFormData(prev => ({
        ...prev,
        withholdingAmount: parseFloat(calculated.toFixed(2))
      }));
    }
  }, [formData.withholdingRate, formData.taxFreeAmount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Tevkifat İade Bilgileri
                    {itemIndex !== undefined && ` - Satır ${itemIndex + 1}`}
                  </h3>

                  <div className="space-y-4">
                    {/* Tevkifat Oranı */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tevkifat İade Edilen Mal Oranı (%)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.withholdingRate}
                        onChange={(e) => setFormData({
                          ...formData,
                          withholdingRate: parseFloat(e.target.value) || 0
                        })}
                        className="w-full"
                        placeholder="Örn: 50"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        İade edilen mal için tevkifat oranını giriniz
                      </p>
                    </div>

                    {/* Tevkifatsız KDV Tutarı */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tevkifatsız İade KDV Tutarı (TL)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.taxFreeAmount}
                        onChange={(e) => setFormData({
                          ...formData,
                          taxFreeAmount: parseFloat(e.target.value) || 0
                        })}
                        className="w-full"
                        placeholder="0.00"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Tevkifatsız KDV tutarını giriniz
                      </p>
                    </div>

                    {/* Hesaplanan Tevkifat KDV Tutarı */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tevkifat İade KDV Tutarı (TL)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.withholdingAmount}
                        readOnly
                        className="w-full bg-gray-50"
                        placeholder="0.00"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Otomatik hesaplanır: (Oran × Tevkifatsız Tutar) / 100
                      </p>
                    </div>

                    {/* Hesaplama Özeti */}
                    {formData.withholdingRate > 0 && formData.taxFreeAmount > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <span className="text-blue-400 mr-2">ℹ️</span>
                          <div className="text-sm text-blue-700">
                            <p className="font-medium mb-1">Hesaplama:</p>
                            <p>
                              {formData.withholdingRate}% × {formData.taxFreeAmount.toFixed(2)} TL = {' '}
                              <span className="font-semibold">{formData.withholdingAmount.toFixed(2)} TL</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Uyarı */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex">
                        <span className="text-yellow-400 mr-2">⚠️</span>
                        <div className="text-sm text-yellow-700">
                          <p className="font-medium mb-1">Dikkat:</p>
                          <p>
                            Tevkifat iade bilgileri fatura satırına kaydedilecektir. 
                            Bu bilgiler BirFatura üzerinden GİB'e gönderilecektir.
                          </p>
                        </div>
                      </div>
                    </div>
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
