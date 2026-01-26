import React, { useState } from 'react';
import { Button, Input } from '@x-ear/ui-web';
import { CheckCircle, Loader2 } from 'lucide-react';

interface Material {
  code: string;
  name: string;
  kdv: string;
  direction: string;
  available: boolean;
}

interface EReceiptResult {
  success: boolean;
  receiptNo: string;
  receiptDate: string;
  doctorName: string;
  validUntil: string;
  materials: Material[];
}

interface EReceiptQuerySectionProps {
  eReceiptNo: string;
  setEReceiptNo: (value: string) => void;
  eReceiptResult: EReceiptResult | null;
  eReceiptLoading: boolean;
  onQueryEReceipt: () => void;
  onSaveEReceipt: (eReceiptData: {
    id: string;
    number: string;
    date: string;
    doctorName: string;
    validUntil: string;
    materials: Array<{
      code: string;
      name: string;
      applicationDate: string;
      deliveryStatus: 'saved' | 'delivered';
    }>;
    status: 'saved' | 'delivered';
  }) => void;
  onError?: (message: string) => void;
}

export const EReceiptQuerySection: React.FC<EReceiptQuerySectionProps> = ({
  eReceiptNo,
  setEReceiptNo,
  eReceiptResult,
  eReceiptLoading,
  onQueryEReceipt,
  onSaveEReceipt,
  onError
}) => {
  const [globalDate, setGlobalDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [materialSelections, setMaterialSelections] = useState<Record<string, { selected: boolean; date: string }>>({});

  // Global tarih değişikliği
  const handleGlobalDateChange = (newDate: string) => {
    setGlobalDate(newDate);
    // Tüm seçili malzemelerin tarihlerini güncelle
    setMaterialSelections(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(code => {
        if (updated[code].selected) {
          updated[code] = { ...updated[code], date: newDate };
        }
      });
      return updated;
    });
  };

  // Malzeme seçimi değişikliği
  const handleMaterialSelection = (code: string, selected: boolean) => {
    setMaterialSelections(prev => ({
      ...prev,
      [code]: {
        selected,
        date: selected ? (prev[code]?.date || globalDate) : prev[code]?.date || globalDate
      }
    }));
  };

  // Malzeme tarihi değişikliği
  const handleMaterialDateChange = (code: string, date: string) => {
    setMaterialSelections(prev => ({
      ...prev,
      [code]: {
        ...prev[code],
        date
      }
    }));
  };

  // Hepsini seç
  const selectAll = () => {
    if (!eReceiptResult) return;
    const newSelections = { ...materialSelections };
    eReceiptResult.materials.forEach(material => {
      newSelections[material.code] = {
        selected: true,
        date: globalDate
      };
    });
    setMaterialSelections(newSelections);
  };

  // Seçimi temizle
  const clearSelection = () => {
    setMaterialSelections({});
  };

  // E-reçete kaydet
  const saveEReceipt = () => {
    if (!eReceiptResult) {
      if (onError) {
        onError('Önce e-reçete sorgulayın');
      } else {
        alert('Önce e-reçete sorgulayın');
      }
      return;
    }

    const selectedMaterials = Object.entries(materialSelections)
      .filter(([, selection]) => selection.selected)
      .map(([code, selection]) => ({
        code,
        date: selection.date
      }));

    if (selectedMaterials.length === 0) {
      if (onError) {
        onError('Lütfen en az bir malzeme seçin');
      } else {
        alert('Lütfen en az bir malzeme seçin');
      }
      return;
    }

    // E-reçete verisini oluştur
    const eReceiptData = {
      id: `er_${Date.now()}`,
      number: eReceiptResult.receiptNo,
      date: eReceiptResult.receiptDate,
      doctorName: eReceiptResult.doctorName,
      validUntil: eReceiptResult.validUntil,
      materials: selectedMaterials.map(material => ({
        code: material.code,
        name: eReceiptResult.materials.find(m => m.code === material.code)?.name || '',
        applicationDate: material.date,
        deliveryStatus: 'saved' as const // Başlangıçta "saved" olarak kaydet
      })),
      status: 'saved' as const
    };

    onSaveEReceipt(eReceiptData);
  };

  return (
    <div className="bg-white rounded-lg border p-6" data-section="e-receipt-query">
      <h3 className="text-lg font-semibold mb-4">E-Reçete Sorgulama</h3>
      <div className="space-y-4">
        <div className="flex space-x-3">
          <Input
            type="text"
            placeholder="E-reçete numarasını giriniz"
            value={eReceiptNo}
            onChange={(e) => setEReceiptNo(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={onQueryEReceipt}
            disabled={eReceiptLoading || !eReceiptNo.trim()}
          >
            {eReceiptLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            <span>Sorgula</span>
          </Button>
        </div>

        {/* E-Receipt Result */}
        {eReceiptResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-green-900 mb-2">E-reçete Bulundu</h4>
                <div className="grid grid-cols-2 gap-4 text-sm text-green-800 mb-4">
                  <div><strong>E-reçete No:</strong> {eReceiptResult.receiptNo}</div>
                  <div><strong>Tarih:</strong> {eReceiptResult.receiptDate}</div>
                  <div><strong>Doktor:</strong> {eReceiptResult.doctorName}</div>
                  <div><strong>Geçerlilik:</strong> {eReceiptResult.validUntil}</div>
                </div>

                {/* Global Date Setting */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <label htmlFor="globalDate" className="text-sm font-medium text-blue-800">
                        Tüm malzemeler için başvuru tarihi:
                      </label>
                      <input
                        data-allow-raw="true"
                        type="date"
                        id="globalDate"
                        value={globalDate}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => handleGlobalDateChange(e.target.value)}
                        className="text-sm border border-blue-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <Button
                      onClick={() => handleGlobalDateChange(globalDate)}
                      variant="outline"
                      size="sm"
                    >
                      Tarihi Uygula
                    </Button>
                  </div>
                </div>

                <h5 className="font-medium text-green-900 mb-3">Malzemeler (Seçiniz):</h5>
                <div className="space-y-3 mb-4">
                  {eReceiptResult.materials.map((material, index) => {
                    const selection = materialSelections[material.code] || { selected: false, date: globalDate };
                    return (
                      <div key={material.code} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <input
                            data-allow-raw="true"
                            type="checkbox"
                            id={`material_${index}`}
                            checked={selection.selected}
                            onChange={(e) => handleMaterialSelection(material.code, e.target.checked)}
                            className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <label htmlFor={`material_${index}`} className="font-medium text-gray-900 cursor-pointer">
                              {material.name}
                            </label>
                            <p className="text-sm text-gray-600">Kod: {material.code} • {material.kdv}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            <label htmlFor={`date_${index}`} className="block text-gray-600 mb-1">
                              Başvuru Tarihi:
                            </label>
                            <input
                              data-allow-raw="true"
                              type="date"
                              id={`date_${index}`}
                              value={selection.date}
                              max={new Date().toISOString().split('T')[0]}
                              onChange={(e) => handleMaterialDateChange(material.code, e.target.value)}
                              disabled={!selection.selected}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <Button onClick={selectAll} variant="outline" size="sm">
                      Hepsini Seç
                    </Button>
                    <Button onClick={clearSelection} variant="outline" size="sm">
                      Seçimi Temizle
                    </Button>
                  </div>
                  <Button onClick={saveEReceipt}>
                    E-reçete Kaydet
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};