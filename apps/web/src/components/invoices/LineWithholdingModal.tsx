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
  { code: '601', description: 'Yapım İşleri', rate: 40 },
  { code: '602', description: 'Etüt, Plan, Proje, Danışmanlık', rate: 90 },
  { code: '603', description: 'Makine, Teçhizat, Demirbaş Tadil/Bakım', rate: 70 },
  { code: '604', description: 'Yemek Servisi', rate: 50 },
  { code: '605', description: 'Organizasyon Hizmeti', rate: 50 },
  { code: '606', description: 'İş Gücü Temin Hizmeti', rate: 90 },
  { code: '607', description: 'Özel Güvenlik Hizmeti', rate: 90 },
  { code: '608', description: 'Yapı Denetim Hizmeti', rate: 90 },
  { code: '609', description: 'Fason Tekstil ve Konfeksiyon', rate: 70 },
  { code: '610', description: 'Turistik Mağazalara Verilen Müşteri Bulma', rate: 90 },
  { code: '611', description: 'Spor Kulübü Yayın/Reklam/İsim Hakkı', rate: 90 },
  { code: '612', description: 'Temizlik Hizmeti', rate: 90 },
  { code: '613', description: 'Çevre ve Bahçe Bakım Hizmeti', rate: 90 },
  { code: '614', description: 'Servis Taşımacılığı', rate: 50 },
  { code: '615', description: 'Baskı ve Basım Hizmeti', rate: 70 },
  { code: '616', description: '5018 Kapsamı Diğer Hizmetler', rate: 50 },
  { code: '617', description: 'Hurda Metalden Elde Edilen Külçe', rate: 70 },
  { code: '618', description: 'Bakır/Çinko/Alüminyum Külçe', rate: 70 },
  { code: '619', description: 'Bakır/Çinko/Alüminyum Ürünleri', rate: 70 },
  { code: '620', description: 'İstisnadan Vazgeçenlerin Hurda/Atık Teslimi', rate: 70 },
  { code: '621', description: 'Hurda ve Atıklardan Elde Edilen Hammadde', rate: 90 },
  { code: '622', description: 'Pamuk/Tiftik/Yün/Yapağı/Ham Post-Deri', rate: 90 },
  { code: '623', description: 'Ağaç ve Orman Ürünleri', rate: 50 },
  { code: '624', description: 'Yük Taşımacılığı', rate: 20 },
  { code: '625', description: 'Ticari Reklam Hizmetleri', rate: 30 },
  { code: '626', description: 'Diğer Teslimler', rate: 20 },
  { code: '627', description: 'Demir-Çelik Ürünleri', rate: 50 },
  { code: '801', description: 'Yapım İşleri (Tam Tevkifat)', rate: 100 },
  { code: '802', description: 'Danışmanlık ve Benzeri (Tam Tevkifat)', rate: 100 },
  { code: '803', description: 'Makine/Teçhizat Tadil-Bakım (Tam)', rate: 100 },
  { code: '804', description: 'Yemek Servisi (Tam)', rate: 100 },
  { code: '805', description: 'Organizasyon Hizmeti (Tam)', rate: 100 },
  { code: '806', description: 'İş Gücü Temin Hizmeti (Tam)', rate: 100 },
  { code: '807', description: 'Özel Güvenlik Hizmeti (Tam)', rate: 100 },
  { code: '808', description: 'Yapı Denetim Hizmeti (Tam)', rate: 100 },
  { code: '809', description: 'Fason Tekstil ve Konfeksiyon (Tam)', rate: 100 },
  { code: '810', description: 'Müşteri Bulma / Götürme Hizmeti (Tam)', rate: 100 },
  { code: '811', description: 'Spor Kulübü Gelirleri (Tam)', rate: 100 },
  { code: '812', description: 'Temizlik Hizmeti (Tam)', rate: 100 },
  { code: '813', description: 'Çevre ve Bahçe Bakım Hizmeti (Tam)', rate: 100 },
  { code: '814', description: 'Servis Taşımacılığı (Tam)', rate: 100 },
  { code: '815', description: 'Baskı ve Basım Hizmeti (Tam)', rate: 100 },
  { code: '816', description: 'Hurda Metal Külçe Teslimi (Tam)', rate: 100 },
  { code: '817', description: 'Bakır/Çinko/Demir-Çelik Külçe (Tam)', rate: 100 },
  { code: '818', description: 'Bakır/Çinko/Alüminyum/Kurşun Ürünleri (Tam)', rate: 100 },
  { code: '819', description: 'Hurda ve Atık Teslimi (Tam)', rate: 100 },
  { code: '820', description: 'Hurda ve Atıktan Hammadde (Tam)', rate: 100 },
  { code: '821', description: 'Pamuk/Tiftik/Yün/Yapağı/Ham Post-Deri (Tam)', rate: 100 },
  { code: '822', description: 'Ağaç ve Orman Ürünleri (Tam)', rate: 100 },
  { code: '823', description: 'Yük Taşımacılığı (Tam)', rate: 100 },
  { code: '824', description: 'Ticari Reklam Hizmetleri (Tam)', rate: 100 },
  { code: '825', description: 'Demir-Çelik Ürünleri (Tam)', rate: 100 }
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
                      Referans satır tutarı: {itemAmount.toFixed(2)} TL
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
                        Önizleme hesaplamasıdır. XML üretiminde provider kuralına göre tevkifat tutarı KDV/vergisel matrah üzerinden yeniden hesaplanır.
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
