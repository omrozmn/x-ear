import { useState, useCallback, useEffect } from 'react';
import { Invoice, CreateInvoiceData } from '../../types/invoice';
import { InvoiceScenarioSection } from './InvoiceScenarioSection';
import { InvoiceTypeSection } from './InvoiceTypeSection';
import { InvoiceDateTimeSection } from './InvoiceDateTimeSection';
import { AdditionalInfoSection } from './AdditionalInfoSection';
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
  initialData
  , onRequestLineEditor
}: InvoiceFormExtendedProps) {
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
  }, [extendedData.scenario, extendedData.invoiceType]);

  // Tip 14, 15, 35 için otomatik Temel'e geçiş
  useEffect(() => {
    if (shouldForceBasic && extendedData.scenarioData?.currentScenarioType !== '2') {
      handleExtendedFieldChange('scenarioData', {
        ...extendedData.scenarioData,
        currentScenarioType: '2'
      });
    }
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

  return (
    <div className="w-full">
      {/* Extended Sections */}
      <div className="space-y-6 p-6">
        {/* Senaryo ve Fatura Tipi - Tek Kart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Senaryo ve Fatura Tipi</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Senaryo */}
            <div>
              <InvoiceScenarioSection
                scenarioData={extendedData.scenarioData}
                onChange={(data) => handleExtendedFieldChange('scenarioData', data)}
                disableSubScenario={shouldForceBasic}
              />
            </div>

            {/* Fatura Tipi */}
            <div>
              <InvoiceTypeSection
                invoiceType={extendedData.invoiceType || ''}
                scenario={extendedData.scenario || extendedData.scenarioData?.scenario || 'other'}
                specialTaxBase={extendedData.specialTaxBase}
                returnInvoiceDetails={extendedData.returnInvoiceDetails}
                onChange={handleExtendedFieldChange}
              />
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

      {/* Product Lines */}
      <ProductLinesSection
        lines={extendedData.items || (invoice?.items || []).map((item, idx) => ({
          id: item.id || `line-${idx}`,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit: 'C62',
          unitPrice: item.unitPrice,
          discount: item.discount,
          discountType: item.discountType,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount || 0,
          total: item.totalPrice || 0
        })) || []}
        onChange={(lines) => {
          // Direkt lines'ı kaydet
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
  );
}

export default InvoiceFormExtended;
