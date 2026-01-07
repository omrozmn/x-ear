import { useState, useCallback, useEffect } from 'react';
import { Button } from '@x-ear/ui-web';
import { Invoice, CreateInvoiceData } from '../../types/invoice';
import { InvoiceScenarioSection } from './InvoiceScenarioSection';
import { InvoiceTypeSection } from './InvoiceTypeSection';
import { InvoiceDateTimeSection } from './InvoiceDateTimeSection';
import { AdditionalInfoSection } from './AdditionalInfoSection';
import { CustomerSectionCompact } from './CustomerSectionCompact';
import ExportDetailsCard from './ExportDetailsCard';
import { SGKInvoiceSection } from './SGKInvoiceSection';
import { GovernmentSection, GOVERNMENT_EXEMPTION_REASONS } from './GovernmentSection';
import WithholdingCard from './WithholdingCard';
import { Select } from '@x-ear/ui-web';
import { WithholdingModal } from './WithholdingModal';
import { GovernmentInvoiceModal } from './GovernmentInvoiceModal';
import { SGKInvoiceData } from '../../types/invoice';
import { ExportDetailsModal, ExportDetailsData } from './ExportDetailsModal';
import MedicalDeviceModal from './MedicalDeviceModal';
import { MedicalDeviceData } from '../../types/invoice';
import { getAutoCurrency } from '../../utils/currencyManager';
import { ProductLinesSection } from './ProductLinesSection';

interface InvoiceFormExtendedProps {
  invoice?: Invoice;
  onSubmit: (data: CreateInvoiceData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  onDataChange?: (field: string, value: any) => void;
  initialData?: any;
  onRequestLineEditor?: (type: 'withholding' | 'special' | 'medical', index: number) => void;
}

export function InvoiceFormExtended({
  invoice,
  onSubmit,
  onCancel,
  isLoading = false,
  onDataChange,
  initialData,
  onRequestLineEditor,
}: InvoiceFormExtendedProps) {
  const isModal = !onDataChange; // quick-invoice modal if parent didn't provide onDataChange
  const [extendedData, setExtendedData] = useState({
    ...initialData,
    scenarioData: invoice?.scenarioData || initialData?.scenarioData,
    specialTaxBase: invoice?.specialTaxBase,
    returnInvoiceDetails: invoice?.returnInvoiceDetails,
    customerLabel: invoice?.customerLabel,
    shipmentInfo: invoice?.shipmentInfo,
    bankInfo: invoice?.bankInfo,
    paymentTerms: invoice?.paymentTerms,
    issueTime: invoice?.issueTime || new Date().toTimeString().slice(0, 5),
    
    orderInfo: invoice?.orderInfo,
    deliveryInfo: invoice?.deliveryInfo,
    governmentData: invoice?.governmentData,
    withholdingData: invoice?.withholdingData,
    sgkData: (invoice as any)?.sgkData as SGKInvoiceData | undefined,
    exportDetails: (invoice as any)?.exportDetails as ExportDetailsData | undefined,
    medicalDeviceData: (invoice as any)?.medicalDeviceData as MedicalDeviceData | undefined,
    invoiceType: initialData?.invoiceType || invoice?.type || '',
    scenario: initialData?.scenario || invoice?.scenarioData?.scenario || 'other',
    currency: initialData?.currency || invoice?.currency || 'TRY',
    totalDiscount: initialData?.totalDiscount ?? invoice?.totalDiscount ?? 0,
    customerId: invoice?.customerId || '',
    customerName: invoice?.customerName || ''
  });

  // Modal states
  const [withholdingModalOpen, setWithholdingModalOpen] = useState(false);
  const [governmentModalOpen, setGovernmentModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [medicalModalOpen, setMedicalModalOpen] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number>();

  // Koşullu görünürlük
  const currentScenario = extendedData.scenarioData?.scenario;
  const currentInvoiceType = extendedData.invoiceType;

  // Allowed invoice types mapping (should match InvoiceTypeSection)
  const allowedTypesForScenario = (scenario?: string) => {
    if (scenario === 'export') return ['13'];
    if (scenario === 'government') return ['', '0', '13', '11', '18', '24', '32', '12', '19', '25', '33'];
    return ['', '0', '50', '13', '11', '18', '24', '32', '12', '19', '25', '33', '14', '15', '49', '35'];
  };

  // If scenario changes and current invoiceType is not allowed, reset it to empty
  useEffect(() => {
    const scenario = extendedData.scenario || extendedData.scenarioData?.scenario || 'other';
    const allowed = allowedTypesForScenario(scenario);
    if (extendedData.invoiceType && !allowed.includes(String(extendedData.invoiceType))) {
      handleExtendedFieldChange('invoiceType', '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extendedData.scenario, extendedData.scenarioData?.scenario]);

  // Özel durumlar
  const autoBasicTypes = ['14', '15', '35']; // Otomatik Temel'e geçen tipler
  const shouldForceBasic = currentScenario === 'other' && autoBasicTypes.includes(currentInvoiceType);

  // Para birimi otomatik kontrolü
  useEffect(() => {
    const autoCurrency = getAutoCurrency(
      extendedData.currency,
      extendedData.scenario,
      extendedData.invoiceType
    );

    if (autoCurrency !== extendedData.currency) {
      handleExtendedFieldChange('currency', autoCurrency);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extendedData.scenario, extendedData.invoiceType]);

  // Tip 14, 15, 35 için otomatik Temel'e geçiş
  useEffect(() => {
    if (shouldForceBasic && extendedData.scenarioData?.currentScenarioType !== '2') {
      handleExtendedFieldChange('scenarioData', {
        ...extendedData.scenarioData,
        currentScenarioType: '2'
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldForceBasic, extendedData.scenarioData?.currentScenarioType]);

  // İhracat tipi (13) seçildiğinde sidebar'ı aç
  // Removed auto-opening export modal when invoice type is 13.
  // Export details should be shown in the right-hand sidebar instead.

  const handleExtendedFieldChange = useCallback((field: string, value: any) => {
    setExtendedData(prev => {
      if (field === 'scenarioData') {
        const newScenario = value?.scenario || prev.scenario || 'other';
        return { ...prev, scenarioData: value, scenario: newScenario };
      }
      return { ...prev, [field]: value };
    });

    if (onDataChange) {
      if (field === 'scenarioData') {
        onDataChange('scenarioData', value);
        onDataChange('scenario', value?.scenario || 'other');
      } else {
        onDataChange(field, value);
      }
    }
  }, [onDataChange]);

  const handleOpenWithholdingModal = useCallback((itemIndex?: number) => {
    setCurrentItemIndex(itemIndex);
    setWithholdingModalOpen(true);
  }, []);

  const handleSaveWithholding = useCallback((data: any) => {
    console.log('Withholding data saved:', data, 'for item:', currentItemIndex);
    // TODO: Update item withholding data
  }, [currentItemIndex]);

  const handleSaveGovernment = useCallback((data: any) => {
    setExtendedData(prev => ({ ...prev, governmentData: data }));
  }, []);

  const handleSaveExport = useCallback((data: ExportDetailsData) => {
    setExtendedData(prev => ({ ...prev, exportDetails: data }));
    setExportModalOpen(false);
  }, []);

  const handleSaveMedical = useCallback((data: MedicalDeviceData) => {
    setExtendedData(prev => ({ ...prev, medicalDeviceData: data }));
    setMedicalModalOpen(false);
  }, []);

  // Normalize items to ProductLinesSection shape, prefer extendedData.items then initialData then invoice
  const normalizedItems = (extendedData.items ?? initialData?.items ?? invoice?.items ?? []).map((item: any, idx: number) => ({
    id: item.id || `line-${idx}`,
    name: item.name || item.description || item.description || `Ürün ${idx + 1}`,
    description: item.description || '',
    quantity: Number(item.quantity ?? 1),
    unit: item.unit || 'Adet',
    unitPrice: Number(item.unitPrice ?? item.price ?? 0),
    discount: item.discount ?? 0,
    discountType: item.discountType ?? 'percentage',
    taxRate: Number(item.taxRate ?? item.kdv ?? item.vatRate ?? 18),
    taxAmount: Number(item.taxAmount ?? 0),
    total: Number(item.total ?? item.totalPrice ?? ((Number(item.unitPrice ?? 0) * Number(item.quantity ?? 1)) || 0))
  }));

  return (
    <div className="w-full">
      <div className="flex gap-6">
        {/* Left - Main form */}
        <div className="flex-1">
          <div className="space-y-6 p-6">
            {/* Senaryo ve Fatura Tipi - Tek Kart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Senaryo ve Fatura Tipi</h3>
              <div className="flex flex-col md:flex-row md:items-start md:gap-6">
                <div className="flex-1 space-y-4">
                  <InvoiceScenarioSection
                    scenarioData={extendedData.scenarioData}
                    onChange={(data) => handleExtendedFieldChange('scenarioData', data)}
                    disableSubScenario={shouldForceBasic}
                  />

                  <InvoiceTypeSection
                    invoiceType={extendedData.invoiceType || ''}
                    scenario={extendedData.scenario || extendedData.scenarioData?.scenario || 'other'}
                    specialTaxBase={extendedData.specialTaxBase}
                    returnInvoiceDetails={extendedData.returnInvoiceDetails}
                    onChange={handleExtendedFieldChange}
                  />
                  {/* Informational cards (conditional) - reuse scenarioData state */}
                  <div className="mt-4 space-y-3">
                    {extendedData.scenarioData?.scenario && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <svg className="text-blue-400 mr-2 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zM11 10h2v6h-2v-6zm0-4h2v2h-2V6z" fill="currentColor"/></svg>
                          <div>
                            <h4 className="text-sm font-medium text-blue-800 mb-1">
                              {extendedData.scenarioData.scenarioName}
                              {extendedData.scenarioData.currentScenarioType && ` - ${extendedData.scenarioData.currentScenarioType === '2' ? 'Temel' : 'Ticari'}`}
                            </h4>
                            <p className="text-sm text-blue-700">
                              {extendedData.scenarioData.scenarioDescription}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {extendedData.scenarioData?.scenario === 'other' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <svg className="text-amber-400 mr-2 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <div>
                          <h4 className="text-sm font-medium text-amber-800 mb-1">E-Arşiv Fatura Bilgilendirmesi</h4>
                          <p className="text-sm text-amber-700">Alıcı E-Fatura mükellefi değilse, fatura otomatik olarak E-Arşiv fatura olarak düzenlenir.</p>
                        </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right - fixed-width sidebar for modal and page. Make wider in modal so cards aren't cramped */}
                <div className={"mt-4 md:mt-0 md:ml-4 w-full " + (isModal ? 'md:w-96' : 'md:w-80') + ' flex-shrink-0'}>
                  <div className="p-4 md:p-6 space-y-4">
                    {/* When used inside a modal (no onDataChange provided by page), render a compact customer section
                        For the full-page `NewInvoicePage`, the sidebar provides the customer controls so we avoid duplication. */}
                    {!onDataChange && (
                      <CustomerSectionCompact
                        isSGK={extendedData.invoiceType === '14'}
                        customerId={extendedData.customerId}
                        customerFirstName={(extendedData.customerName || '').split(' ')[0] || ''}
                        customerLastName={(extendedData.customerName || '').split(' ').slice(1).join(' ') || ''}
                        customerTcNumber={(extendedData as any).customerTcNumber || ''}
                        customerTaxNumber={(extendedData as any).customerTaxNumber || ''}
                        customerAddress={(extendedData as any).customerAddress || ''}
                        customerCity={(extendedData as any).customerCity || ''}
                        customerDistrict={(extendedData as any).customerDistrict || ''}
                        onChange={(field: string, value: any) => handleExtendedFieldChange(field, value)}
                      />
                    )}

                    {/* AdditionalInfoSection moved to main column to avoid duplication */}

                    {/* Modal-only conditional sidebar cards (mirror NewInvoicePage sidebar) */}
                    {!onDataChange && (
                      <>
                        {/* SGK */}
                        {extendedData.invoiceType === '14' && (
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="p-4 border-b border-gray-200 bg-blue-50">
                              <h3 className="text-sm font-bold text-gray-900">SGK Fatura Bilgileri</h3>
                              <p className="text-xs text-gray-600 mt-1">SGK faturası için gerekli bilgileri girin</p>
                            </div>
                            <div className="p-4">
                              <SGKInvoiceSection
                                sgkData={extendedData.sgkData}
                                onChange={(data: any) => handleExtendedFieldChange('sgkData', data)}
                              />
                            </div>
                          </div>
                        )}

                        {/* Government */}
                        {extendedData.scenario === 'government' && (
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="p-4 border-b border-gray-200 bg-purple-50">
                              <h3 className="text-sm font-bold text-gray-900">Kamu Fatura Bilgileri</h3>
                              <p className="text-xs text-gray-600 mt-1">Kamu kurumu faturası bilgileri</p>
                            </div>
                            <div className="p-4">
                              <GovernmentSection
                                formData={extendedData}
                                onChange={(data: any) => handleExtendedFieldChange('governmentData', data)}
                              />
                            </div>
                          </div>
                        )}

                        {/* Istisna Sebebi */}
                        {extendedData.invoiceType === '13' && extendedData.scenario !== 'export' && extendedData.scenario !== 'government' && (
                          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <div className="mb-3">
                              <h3 className="text-sm font-bold text-gray-900">İstisna Sebebi</h3>
                              <p className="text-xs text-gray-500">Seçilen istisna için neden kodunu belirtiniz</p>
                            </div>
                            <div>
                              <Select
                                label="İstisna Sebebi"
                                value={(extendedData as any).governmentExemptionReason || '0'}
                                onChange={(e: any) => handleExtendedFieldChange('governmentExemptionReason', e.target.value)}
                                options={GOVERNMENT_EXEMPTION_REASONS}
                                fullWidth
                              />
                            </div>
                          </div>
                        )}

                        {/* Export */}
                        {extendedData.scenario === 'export' && (
                          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <div className="mb-3">
                              <h3 className="text-sm font-bold text-gray-900">İhracat Bilgileri</h3>
                            </div>
                            <div>
                              <ExportDetailsCard
                                value={extendedData.exportDetails}
                                onChange={(data: any) => handleExtendedFieldChange('exportDetails', data)}
                              />
                            </div>
                          </div>
                        )}

                        {/* Special Base */}
                        {['12', '19', '25', '33'].includes(String(extendedData.invoiceType)) && (
                          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-3">Özel Matrah Bilgileri</h3>
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Özel Matrah Tutarı</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={(extendedData as any).specialTaxBase?.amount || ''}
                                  onChange={(e) => handleExtendedFieldChange('specialTaxBase', {
                                    ...(extendedData as any).specialTaxBase,
                                    hasSpecialTaxBase: true,
                                    amount: parseFloat(e.target.value)
                                  })}
                                  className="w-full border rounded px-2 py-1"
                                  placeholder="0.00"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">KDV Oranı (%)</label>
                                <input
                                  type="number"
                                  value={(extendedData as any).specialTaxBase?.taxRate || ''}
                                  onChange={(e) => handleExtendedFieldChange('specialTaxBase', {
                                    ...(extendedData as any).specialTaxBase,
                                    taxRate: parseFloat(e.target.value)
                                  })}
                                  className="w-full border rounded px-2 py-1"
                                  placeholder="18"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                                <input
                                  type="text"
                                  value={(extendedData as any).specialTaxBase?.description || ''}
                                  onChange={(e) => handleExtendedFieldChange('specialTaxBase', {
                                    ...(extendedData as any).specialTaxBase,
                                    description: e.target.value
                                  })}
                                  className="w-full border rounded px-2 py-1"
                                  placeholder="Özel matrah açıklaması"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Return Invoice */}
                        {[ '15', '49', '50' ].includes(String(extendedData.invoiceType)) && (
                          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <div className="mb-3">
                              <h3 className="text-sm font-bold text-gray-900">İade Fatura Bilgileri</h3>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">İade Fatura No</label>
                                <input
                                  type="text"
                                  value={(extendedData as any).returnInvoiceDetails?.returnInvoiceNumber || ''}
                                  onChange={(e) => handleExtendedFieldChange('returnInvoiceDetails', {
                                    ...(extendedData as any).returnInvoiceDetails,
                                    returnInvoiceNumber: e.target.value
                                  })}
                                  className="w-full border rounded px-2 py-1"
                                  placeholder="İade edilen fatura numarası"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">İade Fatura Tarihi</label>
                                <input
                                  type="date"
                                  value={(extendedData as any).returnInvoiceDetails?.returnInvoiceDate || ''}
                                  onChange={(e) => handleExtendedFieldChange('returnInvoiceDetails', {
                                    ...(extendedData as any).returnInvoiceDetails,
                                    returnInvoiceDate: e.target.value
                                  })}
                                  className="w-full border rounded px-2 py-1"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">İade Nedeni</label>
                                <input
                                  type="text"
                                  value={(extendedData as any).returnInvoiceDetails?.returnReason || ''}
                                  onChange={(e) => handleExtendedFieldChange('returnInvoiceDetails', {
                                    ...(extendedData as any).returnInvoiceDetails,
                                    returnReason: e.target.value
                                  })}
                                  className="w-full border rounded px-2 py-1"
                                  placeholder="İade nedeni"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Medical Section */}
                        {extendedData.scenario === 'medical' && (
                          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-bold text-gray-900">İlaç/Tıbbi Cihaz</h3>
                              <button
                                type="button"
                                onClick={() => setMedicalModalOpen(true)}
                                className="text-xs px-3 py-1 bg-purple-600 text-white rounded"
                              >
                                Detaylar
                              </button>
                            </div>
                            {(extendedData as any).medicalDeviceData ? (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                  <svg className="text-green-600" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  <p className="text-xs text-green-800">Tıbbi cihaz bilgileri kaydedildi</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">Tıbbi cihaz detaylarını eklemek için butona tıklayın</p>
                            )}
                          </div>
                        )}

                        {/* Special Operations / Withholding */}
                        {(['11','18','24','32'].includes(String(extendedData.invoiceType))) && (
                          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-3">Özel İşlemler</h3>
                            <div className="space-y-3">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                <p className="text-xs text-blue-800 leading-relaxed">
                                  <strong>Tevkifatlı Fatura</strong>
                                  <br />Bu fatura tipi için tevkifat bilgileri zorunludur. Ürün satırlarında tevkifat kodu ve oranı belirtiniz.
                                </p>
                              </div>
                              <WithholdingCard
                                value={(extendedData as any).withholdingData}
                                onChange={(data: any) => handleExtendedFieldChange('withholdingData', data)}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tarih, Saat ve İskonto */}
            <InvoiceDateTimeSection
              issueDate={invoice?.issueDate || new Date().toISOString().split('T')[0]}
              issueTime={extendedData.issueTime}
              dueDate={invoice?.dueDate}
              discount={invoice?.totalDiscount}
              discountType="amount"
              onChange={handleExtendedFieldChange}
            />

            {/* Ek Bilgiler - moved to main column as its own card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ek Bilgiler</h3>
              <AdditionalInfoSection
                orderInfo={extendedData.orderInfo}
                deliveryInfo={extendedData.deliveryInfo}
                shipmentInfo={extendedData.shipmentInfo}
                bankInfo={extendedData.bankInfo}
                paymentTerms={extendedData.paymentTerms}
                onChange={handleExtendedFieldChange}
              />
            </div>

            {/* Notes / Açıklama (editable) */}
            <div className="bg-white rounded-lg shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
              <textarea
                value={extendedData.notes || ''}
                onChange={(e) => handleExtendedFieldChange('notes', e.target.value)}
                placeholder="Fatura açıklaması (ör. Değişim: Phonak Audeo Paradise P90)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Product Lines */}
          <ProductLinesSection
            lines={normalizedItems}
            onChange={(lines) => {
              handleExtendedFieldChange('items', lines);
            }}
            invoiceType={extendedData.invoiceType}
            scenario={extendedData.scenario}
            currency={extendedData.currency}
            onCurrencyChange={(c) => handleExtendedFieldChange('currency', c)}
            generalDiscount={extendedData.totalDiscount}
            onGeneralDiscountChange={(v) => handleExtendedFieldChange('totalDiscount', v)}
            onRequestLineEditor={onRequestLineEditor}
          />

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 p-6 border-t bg-white">
                <Button type="button" variant="outline" onClick={onCancel} className="px-4 py-2">
                  İptal
                </Button>
                <Button type="button" onClick={() => onSubmit(extendedData as any)} className="px-4 py-2 bg-blue-600 text-white">
                  {isLoading ? 'Kaydediliyor...' : 'Fatura Oluştur'}
                </Button>
              </div>

              {/* Modals */}
      <WithholdingModal
        isOpen={withholdingModalOpen}
        onClose={() => setWithholdingModalOpen(false)}
        onSave={handleSaveWithholding}
        itemIndex={currentItemIndex}
      />

      <GovernmentInvoiceModal
        isOpen={governmentModalOpen}
        onClose={() => setGovernmentModalOpen(false)}
        onSave={handleSaveGovernment}
        initialData={extendedData.governmentData}
      />

      <ExportDetailsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onSave={handleSaveExport}
        initialData={extendedData.exportDetails}
      />

      <MedicalDeviceModal
        isOpen={medicalModalOpen}
        onClose={() => setMedicalModalOpen(false)}
        onSave={handleSaveMedical}
        initialData={extendedData.medicalDeviceData}
        lineIndex={0}
        itemName="Genel"
      />
      </div>
    </div>
  </div>
  );
}

export default InvoiceFormExtended;
