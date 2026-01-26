import { Button, Select, Checkbox } from '@x-ear/ui-web';
import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { GovernmentInvoiceData, ExemptionReason, ExportReason } from '../../types/invoice';

interface GovernmentInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: GovernmentInvoiceData) => void;
  initialData?: GovernmentInvoiceData;
}

export function GovernmentInvoiceModal({
  isOpen,
  onClose,
  onSave,
  initialData
}: GovernmentInvoiceModalProps) {
  const [formData, setFormData] = useState<GovernmentInvoiceData>({
    isExempt: false,
    isExportRegistered: false,
    ...initialData
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    }
  }, [initialData]);

  const exemptionReasons: ExemptionReason[] = [
    { code: '101', description: 'İhracat İstisnası', category: 'export' },
    { code: '102', description: 'Diplomatik İstisna', category: 'diplomatic' },
    { code: '103', description: 'Askeri Amaçlı İstisna', category: 'military' },
    { code: '104', description: 'Uluslararası Kuruluşlar', category: 'diplomatic' },
    { code: '105', description: 'Yabancı Elçilikler', category: 'diplomatic' },
    { code: '250', description: 'Diğerleri', category: 'other' }
  ];

  const exportReasons: ExportReason[] = [
    { code: '701', description: 'İhraç Kayıtlı Satış', category: 'export_registered' },
    { code: '702', description: 'Dahilde İşleme Rejimi', category: 'inward_processing' },
    { code: '703', description: 'Geçici İthalat', category: 'temporary_import' },
    { code: '704', description: 'Gümrük Antrepo', category: 'other' },
    { code: '705', description: 'Serbest Bölge', category: 'other' }
  ];

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
                    Kamu Faturası Bilgileri
                  </h3>

                  <div className="space-y-4">
                    {/* İstisna Checkbox */}
                    <div>
                      <Checkbox
                        label="İstisna Faturası"
                        checked={formData.isExempt || false}
                        onChange={(e) => setFormData({ ...formData, isExempt: e.target.checked })}
                      />
                    </div>

                    {/* İstisna Sebepleri */}
                    {formData.isExempt && (
                      <div>
                        <Select
                          label="İstisna Sebebi"
                          value={formData.exemptionCode || ''}
                          onChange={(e) => {
                            const reason = exemptionReasons.find(r => r.code === e.target.value);
                            setFormData({
                              ...formData,
                              exemptionCode: e.target.value,
                              exemptionDescription: reason?.description,
                              exemptionReason: reason?.category
                            });
                          }}
                          options={[
                            { value: '', label: 'Seçiniz' },
                            ...exemptionReasons.map(r => ({
                              value: r.code,
                              label: `${r.code} - ${r.description}`
                            }))
                          ]}
                          fullWidth
                          required={formData.isExempt}
                        />
                      </div>
                    )}

                    {/* İhraç Kayıtlı Checkbox */}
                    <div>
                      <Checkbox
                        label="İhraç Kayıtlı Satış"
                        checked={formData.isExportRegistered || false}
                        onChange={(e) => setFormData({ ...formData, isExportRegistered: e.target.checked })}
                      />
                    </div>

                    {/* İhraç Sebepleri */}
                    {formData.isExportRegistered && (
                      <div>
                        <Select
                          label="İhraç Sebebi"
                          value={formData.exportCode || ''}
                          onChange={(e) => {
                            const reason = exportReasons.find(r => r.code === e.target.value);
                            setFormData({
                              ...formData,
                              exportCode: e.target.value,
                              exportDescription: reason?.description,
                              exportReason: reason?.category
                            });
                          }}
                          options={[
                            { value: '', label: 'Seçiniz' },
                            ...exportReasons.map(r => ({
                              value: r.code,
                              label: `${r.code} - ${r.description}`
                            }))
                          ]}
                          fullWidth
                          required={formData.isExportRegistered}
                        />
                      </div>
                    )}

                    {/* Info Box */}
                    {(formData.isExempt || formData.isExportRegistered) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <Info className="text-blue-400" size={18} />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">Bilgilendirme</h3>
                            <div className="mt-2 text-sm text-blue-700">
                              <p>
                                {formData.isExempt && 'İstisna faturalarında KDV hesaplanmaz. '}
                                {formData.isExportRegistered && 'İhraç kayıtlı satışlarda özel düzenlemeler geçerlidir.'}
                              </p>
                            </div>
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
