import { Button } from '@x-ear/ui-web';
import { useState, useCallback, useEffect } from 'react';
import { Invoice, CreateInvoiceData } from '../../types/invoice';
import { InvoiceScenarioSection } from './InvoiceScenarioSection';
import { InvoiceTypeSection } from './InvoiceTypeSection';
import { InvoiceDateTimeSection } from './InvoiceDateTimeSection';
import { AdditionalInfoSection } from './AdditionalInfoSection';
import { WithholdingModal } from './WithholdingModal';
import { GovernmentInvoiceModal } from './GovernmentInvoiceModal';
import { CustomerSection } from './CustomerSection';
import { GovernmentSection } from './GovernmentSection';
import { SGKInvoiceSection, SGKInvoiceData } from './SGKInvoiceSection';
import { SpecialBaseModal } from './SpecialBaseModal';
import { ExportDetailsModal, ExportDetailsData } from './ExportDetailsModal';
import { MedicalDeviceModal, MedicalDeviceData } from './MedicalDeviceModal';
import { getCurrencyRestrictions, getAutoCurrency } from '../../utils/currencyManager';
import InvoiceForm from './InvoiceForm';

interface InvoiceFormExtendedProps {
  invoice?: Invoice;
  onSubmit: (data: CreateInvoiceData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function InvoiceFormExtended({
  invoice,
  onSubmit,
  onCancel,
  isLoading = false
}: InvoiceFormExtendedProps) {
  const [extendedData, setExtendedData] = useState({
    scenarioData: invoice?.scenarioData,
    specialTaxBase: invoice?.specialTaxBase,
    backdatedInvoice: invoice?.backdatedInvoice,
    returnInvoiceDetails: invoice?.returnInvoiceDetails,
    customerLabel: invoice?.customerLabel,
    shipmentInfo: invoice?.shipmentInfo,
    bankInfo: invoice?.bankInfo,
    paymentTerms: invoice?.paymentTerms,
    issueTime: invoice?.issueTime || new Date().toTimeString().slice(0, 5),
    isTechnologySupport: invoice?.isTechnologySupport,
    isMedicalDevice: invoice?.isMedicalDevice,
    orderInfo: invoice?.orderInfo,
    deliveryInfo: invoice?.deliveryInfo,
    governmentData: invoice?.governmentData,
    withholdingData: invoice?.withholdingData,
    sgkData: (invoice as any)?.sgkData as SGKInvoiceData | undefined,
    exportDetails: (invoice as any)?.exportDetails as ExportDetailsData | undefined,
    medicalDeviceData: (invoice as any)?.medicalDeviceData as MedicalDeviceData | undefined,
    invoiceType: invoice?.type || '',
    scenario: invoice?.scenarioData?.scenario || '',
    currency: invoice?.currency || 'TRY',
    customerId: invoice?.customerId || '',
    customerName: invoice?.customerName || ''
  });

  // Modal states
  const [withholdingModalOpen, setWithholdingModalOpen] = useState(false);
  const [governmentModalOpen, setGovernmentModalOpen] = useState(false);
  const [specialBaseModalOpen, setSpecialBaseModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [medicalModalOpen, setMedicalModalOpen] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState<number>();

  // SGK mode state
  const [isSGKMode, setIsSGKMode] = useState(false);

  // Koşullu görünürlük
  const currentScenario = extendedData.scenarioData?.scenario;
  const showGovernmentSection = currentScenario === 'government';
  const showSGKSection = extendedData.invoiceType === '14' || isSGKMode;
  const showExportSection = currentScenario === 'export';
  const showMedicalSection = currentScenario === 'medical';

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
  }, [extendedData.scenario, extendedData.invoiceType]);

  const handleExtendedFieldChange = useCallback((field: string, value: any) => {
    setExtendedData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleBaseFormSubmit = useCallback((baseData: any) => {
    // Merge base data with extended data
    const completeData: CreateInvoiceData = {
      ...baseData,
      ...extendedData
    };
    onSubmit(completeData);
  }, [extendedData, onSubmit]);

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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Extended Sections */}
      <div className="space-y-6 mb-6">
        {/* Senaryo */}
        <InvoiceScenarioSection
          scenarioData={extendedData.scenarioData}
          onChange={(data) => handleExtendedFieldChange('scenarioData', data)}
        />

        {/* Fatura Tipi ve Özel Durumlar */}
        <InvoiceTypeSection
          invoiceType={invoice?.type || 'sale'}
          specialTaxBase={extendedData.specialTaxBase}
          backdatedInvoice={extendedData.backdatedInvoice}
          returnInvoiceDetails={extendedData.returnInvoiceDetails}
          isTechnologySupport={extendedData.isTechnologySupport}
          isMedicalDevice={extendedData.isMedicalDevice}
          onChange={handleExtendedFieldChange}
        />

        {/* Tarih, Saat ve İskonto */}
        <InvoiceDateTimeSection
          issueDate={invoice?.issueDate || new Date().toISOString().split('T')[0]}
          issueTime={extendedData.issueTime}
          dueDate={invoice?.dueDate}
          discount={invoice?.totalDiscount}
          discountType="amount"
          onChange={handleExtendedFieldChange}
        />

        {/* Ek Bilgiler */}
        <AdditionalInfoSection
          orderInfo={extendedData.orderInfo}
          deliveryInfo={extendedData.deliveryInfo}
          shipmentInfo={extendedData.shipmentInfo}
          bankInfo={extendedData.bankInfo}
          paymentTerms={extendedData.paymentTerms}
          onChange={handleExtendedFieldChange}
        />
      </div>

      {/* Base Invoice Form */}
      <InvoiceForm
        invoice={invoice}
        onSubmit={handleBaseFormSubmit}
        onCancel={onCancel}
        isLoading={isLoading}
      />

      {/* Koşullu Bölümler - Senaryoya Göre */}
      {showGovernmentSection && (
        <GovernmentSection
          formData={extendedData as any}
          onChange={handleExtendedFieldChange}
        />
      )}

      {showSGKSection && (
        <SGKInvoiceSection
          sgkData={extendedData.sgkData}
          onChange={(data) => handleExtendedFieldChange('sgkData', data)}
        />
      )}

      {showExportSection && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">İhracat Bilgileri</h3>
            <Button
              type="button"
              onClick={() => setExportModalOpen(true)}
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 text-white">
              📋 İhracat Detayları
            </Button>
          </div>
          {extendedData.exportDetails && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✓ İhracat bilgileri kaydedildi
              </p>
            </div>
          )}
        </div>
      )}

      {showMedicalSection && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">İlaç/Tıbbi Cihaz Bilgileri</h3>
            <Button
              type="button"
              onClick={() => setMedicalModalOpen(true)}
              variant="default"
              className="bg-purple-600 hover:bg-purple-700 text-white">
              💊 İlaç/Tıbbi Cihaz Detayları
            </Button>
          </div>
          {extendedData.medicalDeviceData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✓ İlaç/Tıbbi cihaz bilgileri kaydedildi
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons for Special Features */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Özel İşlemler</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => handleOpenWithholdingModal()}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            variant="default">
            📊 Tevkifat İade Bilgileri
          </Button>
        </div>
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

      {/* BirFatura Entegrasyon Bilgisi */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mt-6">
        <div className="flex items-start">
          <span className="text-3xl mr-4">🔗</span>
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              BirFatura Entegrasyonu
            </h4>
            <p className="text-sm text-gray-700 mb-2">
              Faturalarınız BirFatura aracılığıyla GİB'e gönderilecektir. 
              BirFatura, e-fatura entegratörü olarak tüm yasal gereklilikleri karşılar.
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✅ Otomatik XML oluşturma</li>
              <li>✅ GİB'e güvenli iletim</li>
              <li>✅ ETTN numarası takibi</li>
              <li>✅ Durum bildirimleri</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceFormExtended;
