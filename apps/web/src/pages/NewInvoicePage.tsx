import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@x-ear/ui-web';
import { ArrowLeft, FileText, CheckCircle, Pill, Info } from 'lucide-react';
import { InvoiceFormExtended } from '../components/invoices/InvoiceFormExtended';
import { SGKInvoiceSection } from '../components/invoices/SGKInvoiceSection';
import { GovernmentSection } from '../components/invoices/GovernmentSection';
import { CustomerSectionCompact } from '../components/invoices/CustomerSectionCompact';

export function NewInvoicePage() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({
    invoiceType: '',
    scenario: '',
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

  const handleCancel = () => {
    navigate({ to: '/invoices' });
  };

  const handleFormDataChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  // Koşullu bölümleri hesapla
  const showSGKSection = formData.invoiceType === '14';
  const showGovernmentSection = formData.scenario === 'government';
  const showExportSection = formData.scenario === 'export';
  const showMedicalSection = formData.scenario === 'medical';
  
  // Özel işlemler görünürlüğü
  const isWithholdingType = ['11', '18', '24', '32'].includes(formData.invoiceType);
  const showSpecialOperations = isWithholdingType;

  return (
    <NewInvoicePageContent 
      isSaving={isSaving}
      handleSubmit={handleSubmit}
      handleCancel={handleCancel}
      formData={formData}
      onFormDataChange={handleFormDataChange}
      showSGKSection={showSGKSection}
      showGovernmentSection={showGovernmentSection}
      showExportSection={showExportSection}
      showMedicalSection={showMedicalSection}
      showSpecialOperations={showSpecialOperations}
      isWithholdingType={isWithholdingType}
    />
  );
}

// Sidebar Component
function InvoiceSidebar({ 
  showSGKSection, 
  showExportSection, 
  showMedicalSection, 
  showGovernmentSection,
  extendedData,
  handlers 
}: any) {
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
      {showSGKSection && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <h3 className="text-sm font-bold text-gray-900">SGK Fatura Bilgileri</h3>
            <p className="text-xs text-gray-600 mt-1">SGK faturası için gerekli bilgileri girin</p>
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
      {showGovernmentSection && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 bg-purple-50">
            <h3 className="text-sm font-bold text-gray-900">Kamu Fatura Bilgileri</h3>
            <p className="text-xs text-gray-600 mt-1">Kamu kurumu faturası bilgileri</p>
          </div>
          <div className="p-4">
            <GovernmentSection
              formData={extendedData}
              onChange={handlers.handleExtendedFieldChange}
            />
          </div>
        </div>
      )}

      {/* Export Section */}
      {showExportSection && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">İhracat Bilgileri</h3>
            <Button
              type="button"
              onClick={() => handlers.setExportModalOpen(true)}
              variant="default"
              size="sm"
              style={{ backgroundColor: '#2563eb', color: 'white' }}
              className="text-xs px-3 py-1">
              <FileText size={14} className="mr-1" />
              Detaylar
            </Button>
          </div>
          {extendedData.exportDetails ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-600" size={16} />
                <p className="text-xs text-green-800">İhracat bilgileri kaydedildi</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">İhracat detaylarını eklemek için butona tıklayın</p>
          )}
        </div>
      )}

      {/* Medical Section */}
      {showMedicalSection && (
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 leading-relaxed">
                  <span className="font-semibold">Tevkifatlı Fatura</span>
                  <br />
                  Bu fatura tipi için tevkifat bilgileri zorunludur. Ürün satırlarında tevkifat kodu ve oranı belirtiniz.
                </p>
              </div>
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
  handleCancel, 
  formData, 
  onFormDataChange,
  showSGKSection,
  showGovernmentSection,
  showExportSection,
  showMedicalSection,
  showSpecialOperations,
  isWithholdingType
}: any) {

  return (
    <div className="new-invoice-page min-h-screen bg-gray-50 w-full pb-8">
      {/* Sticky Header with Progress */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleCancel}
                variant="ghost"
                className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Yeni Fatura</h1>
                <p className="text-sm text-gray-500">
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
                onClick={() => {/* TODO: Save as draft */}}
                variant="outline"
                disabled={isSaving}
                className="px-4 py-2 border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                Taslak Kaydet
              </Button>
              <Button
                type="submit"
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <InvoiceFormExtended
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isLoading={isSaving}
                onDataChange={onFormDataChange}
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
              showGovernmentSection={showGovernmentSection}
              extendedData={formData}
              handlers={{
                handleExtendedFieldChange: onFormDataChange,
                setExportModalOpen: () => {},
                setMedicalModalOpen: () => {},
                specialOperationsVisible: showSpecialOperations,
                isWithholdingType: isWithholdingType
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewInvoicePage;
