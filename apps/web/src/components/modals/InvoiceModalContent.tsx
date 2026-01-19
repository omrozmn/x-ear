import React, { useState, useEffect } from 'react';
import { InvoiceFormExtended } from '../invoices/InvoiceFormExtended';
import { InvoiceService } from '../../services/invoice.service';
import { CreateInvoiceData, Invoice } from '../../types/invoice';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { Button } from '@x-ear/ui-web';

interface InvoiceModalContentProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (invoice: any) => void;
  onError?: (error: string) => void;
  initialData?: any;
  partyId?: string;
  deviceId?: string;
  mode?: 'create' | 'quick' | 'template' | 'edit';
  title?: string;
  enableIncomingSelection?: boolean;
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
  , enableIncomingSelection = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setSubmitError(null);
      setCreatedInvoice(null);
      setShowPreview(false);
      setIsGeneratingPdf(false);
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = async (formData: CreateInvoiceData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Add party and device IDs if provided
      if (partyId) {
        formData.partyId = partyId;
      }
      if (deviceId) {
        formData.deviceId = deviceId;
      }

      const invoiceService = new InvoiceService();
      // Only update when explicitly in edit mode
      if (mode === 'edit') {
        const id = (initialData as any)?.id as string;
        const updated = await invoiceService.updateInvoice(id, formData as any);
        setCreatedInvoice(updated);
        if (onSuccess) onSuccess(updated);
        onClose();
      } else {
        // Create invoice using service
        const createdInvoice = await invoiceService.createInvoice(formData);
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

  return (
    <>
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {getModalTitle()}
          </h2>
          <Button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
            variant='default'>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Hata</h3>
                  <div className="mt-2 text-sm text-red-700">
                    {submitError}
                  </div>
                </div>
              </div>
            </div>
          )}

          <InvoiceFormExtended
            invoice={initialData as any}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isLoading={isSubmitting}
          />
        </div>

        {/* Modal Footer - PDF Actions */}
        {createdInvoice && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <Button
              type="button"
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              variant='default'>
              {isGeneratingPdf ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  PDF Oluşturuluyor...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF İndir
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center"
              variant='default'>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Yazdır
            </Button>
          </div>
        )}
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