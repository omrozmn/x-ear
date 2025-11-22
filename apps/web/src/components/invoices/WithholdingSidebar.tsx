import { Button, Input } from '@x-ear/ui-web';
import { useState, useEffect } from 'react';
import { Info, AlertTriangle, X } from 'lucide-react';

interface WithholdingSidebarProps {
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

export function WithholdingSidebar({
  isOpen,
  onClose,
  onSave,
  initialData,
  itemIndex
}: WithholdingSidebarProps) {
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
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-white shadow-2xl z-50 overflow-y-auto">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-orange-600 text-white px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Tevkifat İade Bilgileri
              {itemIndex !== undefined && ` - Satır ${itemIndex + 1}`}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:text-gray-200"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
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
                    <Info className="text-blue-400 mr-2 flex-shrink-0" size={18} />
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
                  <AlertTriangle className="text-yellow-400 mr-2 flex-shrink-0" size={18} />
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

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="default"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            >
              İptal
            </Button>
            <Button
              type="submit"
              variant="default"
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              Kaydet
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
