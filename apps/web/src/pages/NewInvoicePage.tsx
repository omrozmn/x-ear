import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Input, DatePicker } from '@x-ear/ui-web';
import { ArrowLeft, CheckCircle, Pill } from 'lucide-react';
import { InvoiceFormExtended } from '../components/invoices/InvoiceFormExtended';
import ExportDetailsCard from '../components/invoices/ExportDetailsCard';
import { SGKInvoiceSection } from '../components/invoices/SGKInvoiceSection';
import { GovernmentSection, GOVERNMENT_EXEMPTION_REASONS } from '../components/invoices/GovernmentSection';
import { Select } from '@x-ear/ui-web';
import { CustomerSectionCompact } from '../components/invoices/CustomerSectionCompact';
import WithholdingCard from '../components/invoices/WithholdingCard';

export function NewInvoicePage() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    invoiceType: '',
    scenario: 'other',
    currency: 'TRY'
  });

  const handleSubmit = async (invoiceData: any) => {
    setIsSaving(true);
    try {
      // TODO: Save invoice via API
      console.log('Saving invoice:', invoiceData);

      // Navigate back to invoices list
      navigate({ to: '/invoices' });
    } catch (error) {
      console.error('Error saving invoice:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      // Minimal draft save behavior for now
      console.log('Saving draft invoice:', formData);
      // TODO: call draft API endpoint when available
      navigate({ to: '/invoices' });
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate({ to: '/invoices' });
  };

  const handleFormDataChange = (field: string, value: any) => {
    // Map complex fields from child components into flat formData used by the page
    setFormData((prev: any) => {
      const next = { ...prev };
      if (field === 'scenarioData') {
        next.scenarioData = value;
        next.scenario = value?.scenario || 'other';
      } else if (field === 'invoiceType') {
        next.invoiceType = value;
      } else {
        next[field] = value;
      }
      return next;
    });
  };

  const [activeLineEditor, setActiveLineEditor] = useState<{ type: 'withholding' | 'special' | 'medical'; index: number } | null>(null);

  const handleRequestLineEditor = (type: 'withholding' | 'special' | 'medical', index: number) => {
    setActiveLineEditor({ type, index });
  };

  const handleCloseLineEditor = () => setActiveLineEditor(null);

  // Koşullu bölümleri hesapla
  const showSGKSection = formData.invoiceType === '14';
  const showGovernmentSection = formData.scenario === 'government';
  // Export sidebar should only open for export scenario. If invoice type is '13' (İstisna)
  // but scenario is not export, we show a separate Istisna Sebebi card instead (see below).
  const showExportSection = formData.scenario === 'export';
  const showMedicalSection = formData.scenario === 'medical';
  const showReturnSection = ['15', '49', '50'].includes(formData.invoiceType);
  const showSpecialBaseSection = ['12', '19', '25', '33'].includes(formData.invoiceType);

  // Özel işlemler görünürlüğü
  const isWithholdingType = ['11', '18', '24', '32'].includes(formData.invoiceType);
  const showSpecialOperations = isWithholdingType;

  return (
    <NewInvoicePageContent
      isSaving={isSaving}
      handleSubmit={handleSubmit}
      handleSaveDraft={handleSaveDraft}
      handleCancel={handleCancel}
      formData={formData}
      onFormDataChange={handleFormDataChange}
      showSGKSection={showSGKSection}
      showGovernmentSection={showGovernmentSection}
      showExportSection={showExportSection}
      showMedicalSection={showMedicalSection}
      showReturnSection={showReturnSection}
      showSpecialOperations={showSpecialOperations}
      showSpecialBaseSection={showSpecialBaseSection}
      isWithholdingType={isWithholdingType}
      onRequestLineEditor={handleRequestLineEditor}
      activeLineEditor={activeLineEditor}
      onCloseLineEditor={handleCloseLineEditor}
    />
  );
}

// Sidebar Component
function InvoiceSidebar({
  showSGKSection,
  showExportSection,
  showMedicalSection,
  showGovernmentSection,
  showIstisnaReason,
  showReturnSection,
  showSpecialBaseSection,
  extendedData,
  handlers,
  activeLineEditor,
  onCloseLineEditor
}: any) {
  // Defensive local booleans to avoid ReferenceError if props are missing
  const _showSGKSection = !!showSGKSection;
  const _showExportSection = !!showExportSection;
  const _showMedicalSection = !!showMedicalSection;
  const _showGovernmentSection = !!showGovernmentSection;
  const _showReturnSection = !!showReturnSection;
  const _showSpecialBaseSection = !!showSpecialBaseSection;
  return (
    <div className="sticky top-24 space-y-4">
      {/* Fatura Alıcı - En Üstte */}
      <CustomerSectionCompact
        isSGK={showSGKSection}
        customerId={extendedData.customerId}
        customerFirstName={extendedData.customerFirstName}
        customerLastName={extendedData.customerLastName}
        customerTcNumber={extendedData.customerTcNumber}
        customerTaxNumber={extendedData.customerTaxNumber}
        customerAddress={extendedData.customerAddress}
        customerCity={extendedData.customerCity}
        customerDistrict={extendedData.customerDistrict}
        onChange={handlers.handleExtendedFieldChange}
      />

      {/* SGK Section */}
      {_showSGKSection && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/40">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">SGK Fatura Bilgileri</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">SGK faturası için gerekli bilgileri girin</p>
          </div>
          <div className="p-4">
            <SGKInvoiceSection
              sgkData={extendedData.sgkData}
              onChange={(data) => handlers.handleExtendedFieldChange('sgkData', data)}
            />
          </div>
        </div>
      )}

      {/* Government Section */}
      {_showGovernmentSection && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/40">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Kamu Fatura Bilgileri</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Kamu kurumu faturası bilgileri</p>
          </div>
          <div className="p-4">
            <GovernmentSection
              formData={extendedData}
              onChange={handlers.handleExtendedFieldChange}
            />
          </div>
        </div>
      )}

      {/* Istisna Sebebi card: show when invoiceType=13 selected outside export and government scenarios */}
      {showIstisnaReason && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-gray-900">İstisna Sebebi</h3>
            <p className="text-xs text-gray-500">Seçilen istisna için neden kodunu belirtiniz</p>
          </div>
          <div>
            <Select
              label="İstisna Sebebi"
              value={extendedData.governmentExemptionReason || '0'}
              onChange={(e) => handlers.handleExtendedFieldChange('governmentExemptionReason', e.target.value)}
              options={GOVERNMENT_EXEMPTION_REASONS}
              fullWidth
            />
          </div>
        </div>
      )}

      {/* Export Section */}
      {_showExportSection && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">İhracat Bilgileri</h3>
          </div>
          <div>
            <ExportDetailsCard
              value={extendedData.exportDetails}
              onChange={(data) => handlers.handleExtendedFieldChange('exportDetails', data)}
            />
          </div>
        </div>
      )}

      {/* Özel Matrah (sidebar) */}
      {_showSpecialBaseSection && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Özel Matrah Bilgileri</h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Özel Matrah Tutarı</label>
              <Input
                type="number"
                step="0.01"
                value={extendedData.specialTaxBase?.amount || ''}
                onChange={(e) => handlers.handleExtendedFieldChange('specialTaxBase', {
                  ...extendedData.specialTaxBase,
                  hasSpecialTaxBase: true,
                  amount: parseFloat(e.target.value)
                })}
                className="w-full"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KDV Oranı (%)</label>
              <Input
                type="number"
                value={extendedData.specialTaxBase?.taxRate || ''}
                onChange={(e) => handlers.handleExtendedFieldChange('specialTaxBase', {
                  ...extendedData.specialTaxBase,
                  taxRate: parseFloat(e.target.value)
                })}
                className="w-full"
                placeholder="18"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama</label>
              <Input
                type="text"
                value={extendedData.specialTaxBase?.description || ''}
                onChange={(e) => handlers.handleExtendedFieldChange('specialTaxBase', {
                  ...extendedData.specialTaxBase,
                  description: e.target.value
                })}
                className="w-full"
                placeholder="Özel matrah açıklaması"
              />
            </div>
          </div>
        </div>
      )}
      {/* İade Fatura Bilgileri (moved to sidebar) */}
      {_showReturnSection && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-gray-900">İade Fatura Bilgileri</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İade Fatura No</label>
              <Input
                type="text"
                value={extendedData.returnInvoiceDetails?.returnInvoiceNumber || ''}
                onChange={(e) => handlers.handleExtendedFieldChange('returnInvoiceDetails', {
                  ...extendedData.returnInvoiceDetails,
                  returnInvoiceNumber: e.target.value
                })}
                className="w-full"
                placeholder="İade edilen fatura numarası"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İade Fatura Tarihi</label>
              <DatePicker
                value={extendedData.returnInvoiceDetails?.returnInvoiceDate ? new Date(extendedData.returnInvoiceDetails.returnInvoiceDate) : null}
                onChange={(date) => handlers.handleExtendedFieldChange('returnInvoiceDetails', {
                  ...extendedData.returnInvoiceDetails,
                  returnInvoiceDate: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : ''
                })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İade Nedeni</label>
              <Input
                type="text"
                value={extendedData.returnInvoiceDetails?.returnReason || ''}
                onChange={(e) => handlers.handleExtendedFieldChange('returnInvoiceDetails', {
                  ...extendedData.returnInvoiceDetails,
                  returnReason: e.target.value
                })}
                className="w-full"
                placeholder="İade nedeni"
              />
            </div>
          </div>
        </div>
      )}

      {/* Medical Section */}
      {_showMedicalSection && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">İlaç/Tıbbi Cihaz</h3>
            <Button
              type="button"
              onClick={() => handlers.setMedicalModalOpen(true)}
              variant="default"
              size="sm"
              style={{ backgroundColor: '#9333ea', color: 'white' }}
              className="text-xs px-3 py-1">
              <Pill size={14} className="mr-1" />
              Detaylar
            </Button>
          </div>
          {extendedData.medicalDeviceData ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-600" size={16} />
                <p className="text-xs text-green-800">Tıbbi cihaz bilgileri kaydedildi</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Tıbbi cihaz detaylarını eklemek için butona tıklayın</p>
          )}
        </div>
      )}

      {/* Özel İşlemler */}
      {handlers.specialOperationsVisible && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Özel İşlemler</h3>
          <div className="space-y-3">
            {/* Tevkifatlı Fatura Uyarısı */}
            {handlers.isWithholdingType && (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-blue-800 leading-relaxed">
                    <span className="font-semibold">Tevkifatlı Fatura</span>
                    <br />
                    Bu fatura tipi için tevkifat bilgileri zorunludur. Ürün satırlarında tevkifat kodu ve oranı belirtiniz.
                  </p>
                </div>
                <WithholdingCard
                  value={extendedData.withholdingData}
                  onChange={(data) => handlers.handleExtendedFieldChange('withholdingData', data)}
                />
              </div>
            )}
          </div>
        </div>
      )}
      {/* Per-line editor in sidebar (opened from product lines) */}
      {activeLineEditor && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">{activeLineEditor.type === 'withholding' ? 'Tevkifat (Kalem)' : activeLineEditor.type === 'special' ? 'Özel Matrah (Kalem)' : 'Tıbbi Cihaz (Kalem)'} #{activeLineEditor.index + 1}</h3>
            <button onClick={onCloseLineEditor} className="text-sm text-gray-500">Kapat</button>
          </div>
          <div>
            {activeLineEditor.type === 'withholding' && (
              <WithholdingCard
                value={extendedData.items?.[activeLineEditor.index]?.withholdingData}
                onChange={(data) => {
                  const items = Array.isArray(extendedData.items) ? [...extendedData.items] : [];
                  items[activeLineEditor.index] = { ...(items[activeLineEditor.index] || {}), withholdingData: data };
                  handlers.handleExtendedFieldChange('items', items);
                }}
              />
            )}
            {activeLineEditor.type === 'special' && (
              <div className="text-sm text-gray-600">Özel matrah düzenleyici burada gösterilecek.</div>
            )}
            {activeLineEditor.type === 'medical' && (
              <div className="text-sm text-gray-600">Tıbbi cihaz düzenleyici burada gösterilecek.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Main Page Content
function NewInvoicePageContent({
  isSaving,
  handleSubmit,
  handleSaveDraft,
  handleCancel,
  formData,
  onFormDataChange,
  showSGKSection,
  showGovernmentSection,
  showExportSection,
  showMedicalSection,
  showReturnSection,
  showSpecialBaseSection,
  showSpecialOperations,
  isWithholdingType,
  onRequestLineEditor,
  activeLineEditor,
  onCloseLineEditor
}: any) {

  return (
    <div className="new-invoice-page min-h-screen bg-gray-50 dark:bg-gray-900 w-full pb-8">
      {/* Sticky Header with Progress */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleCancel}
                variant="ghost"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-2"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Yeni Fatura</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Fatura bilgilerini doldurun
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isSaving}
                className="px-4 py-2"
              >
                İptal
              </Button>
              <Button
                onClick={handleSaveDraft}
                variant="outline"
                disabled={isSaving}
                className="px-4 py-2 border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                Taslak Kaydet
              </Button>
              <Button
                type="button"
                onClick={() => handleSubmit(formData)}
                disabled={isSaving}
                style={{ backgroundColor: '#2563eb', color: 'white' }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                {isSaving ? 'Kaydediliyor...' : 'Fatura Oluştur'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form - 2/3 width */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <InvoiceFormExtended
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isLoading={isSaving}
                onDataChange={onFormDataChange}
                onRequestLineEditor={onRequestLineEditor}
                initialData={formData}
              />
            </div>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="lg:col-span-1">
            <InvoiceSidebar
              showSGKSection={showSGKSection}
              showExportSection={showExportSection}
              showMedicalSection={showMedicalSection}
              showSpecialBaseSection={showSpecialBaseSection}
              showReturnSection={showReturnSection}
              showGovernmentSection={showGovernmentSection}
              showIstisnaReason={formData.invoiceType === '13' && formData.scenario !== 'export' && formData.scenario !== 'government'}
              extendedData={formData}
              handlers={{
                handleExtendedFieldChange: onFormDataChange,
                setExportModalOpen: () => { },
                setMedicalModalOpen: () => { },
                specialOperationsVisible: showSpecialOperations,
                isWithholdingType: isWithholdingType
              }}
              activeLineEditor={activeLineEditor}
              onCloseLineEditor={onCloseLineEditor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewInvoicePage;
