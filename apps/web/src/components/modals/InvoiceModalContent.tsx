import React, { useState, useEffect } from 'react';
import { InvoiceFormExtended } from '../invoices/InvoiceFormExtended';
import { InvoiceService } from '../../services/invoice.service';
import { CreateInvoiceData, Invoice } from '../../types/invoice';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { Button } from '@x-ear/ui-web';
import { ChevronDown } from 'lucide-react';
import { CustomerSectionCompact } from '../invoices/CustomerSectionCompact';
import { ProductLinesSection } from '../invoices/ProductLinesSection';
import { SGKInvoiceSection } from '../invoices/SGKInvoiceSection';
import { GovernmentSection } from '../invoices/GovernmentSection';
import ExportDetailsCard from '../invoices/ExportDetailsCard';
import { ErrorMessage } from '../ErrorMessage';
import { normalizeCustomerTaxIdChange } from '../../utils/customerTaxId';

interface InvoiceModalContentProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (invoice: Invoice) => void;
  onError?: (error: string) => void;
  initialData?: Invoice | null;
  partyId?: string;
  deviceId?: string;
  mode?: 'create' | 'quick' | 'template' | 'edit';
  title?: string;
  enableIncomingSelection?: boolean;
}

interface ModalInvoiceFormData {
  invoiceType: string;
  scenario: string;
  currency: string;
  [key: string]: unknown;
}

export const InvoiceModalContent: React.FC<InvoiceModalContentProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  initialData,
  partyId,
  deviceId,
  mode = 'create',
  title
  // Removed unused enableIncomingSelection parameter
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [formData, setFormData] = useState<ModalInvoiceFormData>({
    invoiceType: '',
    scenario: 'other',
    currency: 'TRY',
    ...(initialData as unknown as Record<string, unknown> || {}),
  });
  const [openCustomer, setOpenCustomer] = useState(true);
  const [openDetails, setOpenDetails] = useState(true);
  const [openItems, setOpenItems] = useState(true);
  const [openSGK, setOpenSGK] = useState(true);
  const [openGov, setOpenGov] = useState(true);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setSubmitError(null);
      setCreatedInvoice(null);
      setShowPreview(false);
      setIsGeneratingPdf(false);
      setFormData({
        invoiceType: '',
        scenario: 'other',
        currency: 'TRY',
        ...(initialData as unknown as Record<string, unknown> || {}),
      });
    }
  }, [initialData, isOpen]);

  // Handle form submission
  const handleSubmit = async (submitFormData: CreateInvoiceData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = { ...submitFormData };
      // Add party and device IDs if provided
      if (partyId) {
        payload.partyId = partyId;
      }
      if (deviceId) {
        payload.deviceId = deviceId;
      }

      const invoiceService = new InvoiceService();
      // Only update when explicitly in edit mode
      if (mode === 'edit') {
        const id = initialData?.id;
        if (!id) throw new Error('Düzenleme için fatura ID bulunamadı');
        const updated = await invoiceService.updateInvoice(id, payload);
        setCreatedInvoice(updated);
        if (onSuccess) onSuccess(updated);
        onClose();
      } else {
        // Create invoice using service
        const createdInvoice = await invoiceService.createInvoice(payload);
        setCreatedInvoice(createdInvoice);
        if (onSuccess) onSuccess(createdInvoice);
        onClose();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fatura oluşturulurken bir hata oluştu';
      setSubmitError(errorMessage);

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };



  // Handle PDF generation and download
  const handleGeneratePdf = async () => {
    if (!createdInvoice) {
      setSubmitError('Önce fatura oluşturulmalı');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const invoiceService = new InvoiceService();
      const result = await invoiceService.generateInvoicePdf(createdInvoice.id);

      if (result.success && result.data) {
        const filename = `fatura-${createdInvoice.invoiceNumber}.pdf`;
        invoiceService.downloadPdfBlob(result.data, filename);
      } else {
        const errorMessage = result.error || 'PDF oluşturulamadı';
        setSubmitError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PDF oluşturulurken bir hata oluştu';
      setSubmitError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle print
  const handlePrint = async () => {
    if (!createdInvoice) {
      setSubmitError('Önce fatura oluşturulmalı');
      return;
    }

    try {
      const invoiceService = new InvoiceService();
      const result = await invoiceService.generateInvoicePdf(createdInvoice.id);

      if (result.success && result.data) {
        // Open PDF in new window for printing
        const pdfUrl = window.URL.createObjectURL(result.data);
        const printWindow = window.open(pdfUrl, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
            window.URL.revokeObjectURL(pdfUrl);
          };
        }
      } else {
        const errorMessage = result.error || 'PDF oluşturulamadı';
        setSubmitError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Yazdırma sırasında bir hata oluştu';
      setSubmitError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  // Handle preview modal close
  const handlePreviewClose = () => {
    setShowPreview(false);
    // Success callback when preview is closed
    if (onSuccess && createdInvoice) {
      onSuccess(createdInvoice);
    }
    onClose();
  };



  // Determine modal title
  const getModalTitle = () => {
    if (title) return title;

    switch (mode) {
      case 'quick':
        return 'Hızlı Fatura Oluştur';
      case 'template':
        return 'Şablondan Fatura Oluştur';
      case 'edit':
        return 'Fatura Düzenle';
      default:
        return 'Yeni Fatura Oluştur';
    }
  };

  const handleFormDataChange = (field: string, value: unknown) => {
    setFormData((prev) => {
      if (field === 'scenarioData') {
        return {
          ...prev,
          scenarioData: value,
          scenario: (value as { scenario?: string })?.scenario || 'other',
        };
      }
      if (field === 'customerTaxId' || field === 'customerTaxNumber' || field === 'customerTcNumber') {
        return {
          ...prev,
          ...normalizeCustomerTaxIdChange(field, String(value || '')),
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const showSGKSection = formData.invoiceType === '14';
  const showGovernmentSection = formData.scenario === 'government';
  const showExportSection = formData.scenario === 'export';

  const sectionDot = (done: boolean) => (
    done
      ? <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
      : <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-gray-300" />
  );

  return (
    <>
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-gray-50 shadow-xl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {getModalTitle()}
            </h2>
            <p className="mt-1 text-sm text-gray-500">Tüm alanlar kartlar halinde düzenlenmiştir.</p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl p-1"
            variant='default'>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-3 pb-24">
          {submitError && (
            <ErrorMessage type="error" title="Hata" message={submitError} />
          )}

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <button
                data-allow-raw="true"
                type="button"
                onClick={() => setOpenCustomer((v) => !v)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  {sectionDot(Boolean(formData.customerFirstName || formData.customerLastName || formData.customerName || formData.customerTcNumber))}
                  <h3 className="font-bold text-gray-900">Fatura Alıcısı</h3>
                </div>
                <ChevronDown size={20} className={`text-gray-400 transition-transform duration-200${openCustomer ? ' rotate-180' : ''}`} />
              </button>
              {openCustomer && (
                <div className="border-t border-gray-100 p-1">
                  <CustomerSectionCompact
                    isSGK={showSGKSection}
                    customerId={formData.customerId as string}
                    customerName={formData.customerName as string}
                    customerFirstName={formData.customerFirstName as string}
                    customerLastName={formData.customerLastName as string}
                    customerTaxId={formData.customerTaxId as string}
                    customerTcNumber={formData.customerTcNumber as string}
                    customerTaxNumber={formData.customerTaxNumber as string}
                    customerAddress={formData.customerAddress as string}
                    customerCity={formData.customerCity as string}
                    customerDistrict={formData.customerDistrict as string}
                    onChange={handleFormDataChange}
                  />
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <button
                data-allow-raw="true"
                type="button"
                onClick={() => setOpenDetails((v) => !v)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  {sectionDot(Boolean(formData.invoiceType || formData.scenario !== 'other'))}
                  <h3 className="font-bold text-gray-900">Fatura Detayları</h3>
                </div>
                <ChevronDown size={20} className={`text-gray-400 transition-transform duration-200${openDetails ? ' rotate-180' : ''}`} />
              </button>
              {openDetails && (
                <div className="border-t border-gray-100">
                  <InvoiceFormExtended
                    invoice={initialData || undefined}
                    initialData={formData as unknown as Partial<Record<string, unknown>>}
                    onSubmit={handleSubmit}
                    onCancel={onClose}
                    isLoading={isSubmitting}
                    onDataChange={handleFormDataChange}
                    mobileHiddenSections={['items', 'additionalInfo', 'notes']}
                  />
                </div>
              )}
            </div>

            {showSGKSection && (
              <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                <button
                  data-allow-raw="true"
                  type="button"
                  onClick={() => setOpenSGK((v) => !v)}
                  className="flex w-full items-center justify-between bg-blue-50 p-4 text-left"
                >
                  <h3 className="text-sm font-bold uppercase tracking-wider text-blue-900">SGK Bilgileri</h3>
                  <ChevronDown size={18} className={`text-blue-400 transition-transform duration-200${openSGK ? ' rotate-180' : ''}`} />
                </button>
                {openSGK && (
                  <div className="border-t border-blue-100 p-4">
                    <SGKInvoiceSection
                      sgkData={formData.sgkData as never}
                      onChange={(data) => handleFormDataChange('sgkData', data)}
                    />
                  </div>
                )}
              </div>
            )}

            {showGovernmentSection && (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <button
                  data-allow-raw="true"
                  type="button"
                  onClick={() => setOpenGov((v) => !v)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <h3 className="font-bold text-gray-900">Kamu Bilgileri</h3>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200${openGov ? ' rotate-180' : ''}`} />
                </button>
                {openGov && (
                  <div className="border-t border-gray-100 p-4">
                    <GovernmentSection formData={formData as never} onChange={handleFormDataChange} />
                  </div>
                )}
              </div>
            )}

            {showExportSection && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <ExportDetailsCard
                  value={formData.exportDetails as never}
                  onChange={(data) => handleFormDataChange('exportDetails', data)}
                />
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <button
                data-allow-raw="true"
                type="button"
                onClick={() => setOpenItems((v) => !v)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  {sectionDot(Array.isArray(formData.items) && formData.items.length > 0)}
                  <h3 className="font-bold text-gray-900">Ürün ve Hizmetler</h3>
                  {Array.isArray(formData.items) && formData.items.length > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      {formData.items.length} kalem
                    </span>
                  )}
                </div>
                <ChevronDown size={20} className={`text-gray-400 transition-transform duration-200${openItems ? ' rotate-180' : ''}`} />
              </button>
              {openItems && (
                <div className="border-t border-gray-100">
                  <ProductLinesSection
                    lines={(formData.items as never[]) || []}
                    onChange={(lines) => handleFormDataChange('items', lines)}
                    invoiceType={String(formData.invoiceType || '')}
                    scenario={String(formData.scenario || 'other')}
                    currency={String(formData.currency || 'TRY')}
                    onCurrencyChange={(currency) => handleFormDataChange('currency', currency)}
                    generalDiscount={formData.totalDiscount as number | string | undefined}
                    onGeneralDiscountChange={(value) => handleFormDataChange('totalDiscount', value)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white px-4 py-4 sm:px-6">
          {createdInvoice ? (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                type="button"
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                variant='default'>
                {isGeneratingPdf ? 'PDF Oluşturuluyor...' : 'PDF İndir'}
              </Button>
              <Button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center"
                variant='default'>
                Yazdır
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                İptal
              </Button>
              <Button
                type="button"
                onClick={() => handleSubmit(formData as unknown as CreateInvoiceData)}
                disabled={isSubmitting}
                className="flex-[1.4] rounded-xl bg-blue-700 font-bold text-white hover:bg-blue-800"
                variant="default"
              >
                {isSubmitting ? 'Kaydediliyor...' : 'Faturayı Kes'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        isOpen={showPreview}
        onClose={handlePreviewClose}
        invoice={createdInvoice}
        onError={onError}
      />
    </>
  );
};
