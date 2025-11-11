import { Button, Input } from '@x-ear/ui-web';
import { useState, useEffect } from 'react';
import { WithholdingData, WithholdingCalculation } from '../../types/invoice';

interface WithholdingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: WithholdingData) => void;
  initialData?: WithholdingData;
  itemIndex?: number;
}

export function WithholdingModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  itemIndex
}: WithholdingModalProps) {
  const [formData, setFormData] = useState<WithholdingData>({
    withholdingRate: 0,
    withholdingAmount: 0,
    taxFreeAmount: 0,
    withholdingType: 'partial',
    ...initialData
  });

  const [calculation, setCalculation] = useState<WithholdingCalculation | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    }
  }, [initialData]);

  useEffect(() => {
    calculateWithholding();
  }, [formData.withholdingRate, formData.taxFreeAmount]);

  const calculateWithholding = () => {
    const rate = formData.withholdingRate || 0;
    const taxFree = formData.taxFreeAmount || 0;
    const withholdingAmount = (rate / 100) * taxFree;
    const netAmount = taxFree - withholdingAmount;

    setCalculation({
      baseAmount: taxFree,
      withholdingRate: rate,
      withholdingAmount,
      taxFreeAmount: taxFree,
      netAmount
    });

    setFormData(prev => ({
      ...prev,
      withholdingAmount
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
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
                    {itemIndex !== undefined && ` - Kalem ${itemIndex + 1}`}
                  </h3>

                  <div className="space-y-4">
                    {/* Tevkifat Oranı */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tevkifat Oranı (%)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.withholdingRate}
                        onChange={(e) => setFormData({ ...formData, withholdingRate: parseFloat(e.target.value) || 0 })}
                        className="w-full"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Örn: %10, %20, %50
                      </p>
                    </div>

                    {/* Tevkifatsız KDV Tutarı */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tevkifatsız KDV Tutarı (TL)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.taxFreeAmount}
                        onChange={(e) => setFormData({ ...formData, taxFreeAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Tevkifat uygulanmadan önceki KDV tutarı
                      </p>
                    </div>

                    {/* Hesaplanan Tevkifat Tutarı */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tevkifat KDV Tutarı (TL)
                      </label>
                      <Input
                        type="number"
                        value={formData.withholdingAmount}
                        readOnly
                        className="w-full bg-gray-50"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Otomatik hesaplanır
                      </p>
                    </div>

                    {/* Calculation Summary */}
                    {calculation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-900 mb-3">Hesaplama Özeti</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tevkifatsız KDV:</span>
                            <span className="font-medium text-gray-900">
                              ₺{formatCurrency(calculation.taxFreeAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tevkifat Oranı:</span>
                            <span className="font-medium text-gray-900">
                              %{formatCurrency(calculation.withholdingRate)}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-blue-300 pt-2">
                            <span className="text-gray-600">Tevkifat Tutarı:</span>
                            <span className="font-medium text-blue-900">
                              ₺{formatCurrency(calculation.withholdingAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Net Tutar:</span>
                            <span className="font-medium text-green-900">
                              ₺{formatCurrency(calculation.netAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Info Box */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <span className="text-yellow-400">⚠️</span>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Bilgilendirme</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>
                              Tevkifat, KDV'nin bir kısmının alıcı tarafından kesilmesi işlemidir.
                              Hesaplanan tevkifat tutarı, fatura toplamından düşülecektir.
                            </p>
                          </div>
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
