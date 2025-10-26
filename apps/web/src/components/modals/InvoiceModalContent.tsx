import React, { useState, useEffect } from 'react';
import { DynamicInvoiceForm } from '../forms/DynamicInvoiceForm';
import { InvoiceFormData, InvoiceFormValidationResult } from '../../types/invoice-schema';
import { InvoiceService } from '../../services/invoice.service';
import { CreateInvoiceData, Invoice } from '../../types/invoice';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { Button } from '@x-ear/ui-web';

interface InvoiceModalContentProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (invoice: any) => void;
  onError?: (error: string) => void;
  initialData?: Partial<InvoiceFormData>;
  patientId?: string;
  deviceId?: string;
  mode?: 'create' | 'quick' | 'template';
  title?: string;
}

export const InvoiceModalContent: React.FC<InvoiceModalContentProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  initialData,
  patientId,
  deviceId,
  mode = 'create',
  title
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<InvoiceFormValidationResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [currentFormData, setCurrentFormData] = useState<InvoiceFormData | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setValidationResult(null);
      setSubmitError(null);
      setCreatedInvoice(null);
      setShowPreview(false);
      setIsGeneratingPdf(false);
      setCurrentFormData(null);
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = async (formData: InvoiceFormData) => {
    if (!validationResult?.isValid) {
      setSubmitError('Lütfen form hatalarını düzeltin');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Convert form data to invoice creation data
      const invoiceData = convertFormDataToInvoiceData(formData);

      // Add patient and device IDs if provided
      if (patientId) {
        invoiceData.patientId = patientId;
      }
      if (deviceId) {
        invoiceData.deviceId = deviceId;
      }

      // Create invoice using service
      const invoiceService = new InvoiceService();
      const createdInvoice = await invoiceService.createInvoice(invoiceData);

      setCreatedInvoice(createdInvoice);

      // Success callback
      if (onSuccess) {
        onSuccess(createdInvoice);
      }

      // Close modal
      onClose();

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

  // Handle preview
  const handlePreview = async () => {
    if (!validationResult?.isValid || !currentFormData) {
      setSubmitError('Lütfen form hatalarını düzeltin');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Convert form data to invoice creation data
      const invoiceData = convertFormDataToInvoiceData(currentFormData);

      // Add patient and device IDs if provided
      if (patientId) {
        invoiceData.patientId = patientId;
      }
      if (deviceId) {
        invoiceData.deviceId = deviceId;
      }

      // Create invoice using service
      const invoiceService = new InvoiceService();
      const createdInvoice = await invoiceService.createInvoice(invoiceData);

      setCreatedInvoice(createdInvoice);
      setShowPreview(true);

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

  // Convert form data to invoice creation data
  const convertFormDataToInvoiceData = (formData: InvoiceFormData): CreateInvoiceData => {
    const { invoiceType, scenario, items, ...sections } = formData;

    // Extract customer/company info based on invoice type
    let customerInfo: any = {};
    let deviceInfo: any = {};
    if (invoiceType === 'individual' && sections.customer_info) {
      const customerData = sections.customer_info as any;
      customerInfo = {
        type: 'individual',
        firstName: customerData.first_name || '',
        lastName: customerData.last_name || '',
        tcNumber: customerData.tc_number || '',
        email: customerData.email || '',
        phone: customerData.phone || '',
        address: {
          street: customerData.address || '',
          city: customerData.city || '',
          postalCode: customerData.postal_code || ''
        }
      };
    } else if (invoiceType === 'corporate' && sections.company_info) {
      const companyData = sections.company_info as any;
      customerInfo = {
        type: 'corporate',
        companyName: companyData.company_name || '',
        taxNumber: companyData.tax_number || '',
        taxOffice: companyData.tax_office || '',
        contactPerson: companyData.contact_person || '',
        email: companyData.email || '',
        phone: companyData.phone || '',
        address: {
          street: companyData.address || '',
          city: companyData.city || '',
          postalCode: companyData.postal_code || ''
        }
      };
    } else if (invoiceType === 'export' && sections.export_info) {
      const exportData = sections.export_info as any;
      customerInfo = {
        type: 'export',
        companyName: exportData.company_name || '',
        country: exportData.country || '',
        currency: exportData.currency || 'USD',
        exchangeRate: exportData.exchange_rate || 1,
        address: {
          street: exportData.address || ''
        }
      };
    }

    // Extract invoice details
    const invoiceDetails = sections.invoice_details as any || {};

    // Extract device information
    if (sections.device_info) {
      const deviceData = sections.device_info as any;
      deviceInfo = {
        brand: deviceData.device_brand || '',
        model: deviceData.device_model || '',
        serial: deviceData.device_serial || '',
        side: deviceData.device_side || '',
        warrantyPeriod: deviceData.warranty_period || 0
      };
    }

    // Extract SGK information
    let sgkInfo: any = {};
    if (sections.sgk_info) {
      const sgkData = sections.sgk_info as any;
      sgkInfo = {
        hasCoverage: sgkData.has_sgk_coverage || false,
        approvalNumber: sgkData.approval_number || '',
        reportDate: sgkData.report_date || '',
        doctorName: sgkData.doctor_name || '',
        hospitalName: sgkData.hospital_name || ''
      };
    }

    // Convert items
    const invoiceItems = (items as any[])?.map((item: any) => ({
      name: item.description || '',
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      total: item.total
    })) || [];

    return {
      type: invoiceType as any,
      status: 'draft',
      issueDate: invoiceDetails.invoice_date || new Date().toISOString().split('T')[0],
      dueDate: invoiceDetails.due_date,
      paymentMethod: invoiceDetails.payment_method as any,
      notes: invoiceDetails.notes,
      customerName: customerInfo.firstName ? `${customerInfo.firstName} ${customerInfo.lastName || ''}`.trim() : customerInfo.companyName,
      customerTaxNumber: customerInfo.taxNumber,
      customerAddress: customerInfo.address,
      items: invoiceItems
    };
  };

  // Handle validation changes
  const handleValidationChange = (result: InvoiceFormValidationResult) => {
    setValidationResult(result);
  };

  // Handle form data changes
  const handleFormDataChange = (formData: InvoiceFormData) => {
    setCurrentFormData(formData);
  };

  // Determine modal title
  const getModalTitle = () => {
    if (title) return title;

    switch (mode) {
      case 'quick':
        return 'Hızlı Fatura Oluştur';
      case 'template':
        return 'Şablondan Fatura Oluştur';
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

          <DynamicInvoiceForm
            onSubmit={handleSubmit}
            onValidationChange={handleValidationChange}
            onFormDataChange={handleFormDataChange}
            initialData={initialData}
            disabled={isSubmitting}
          />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            {validationResult && !validationResult.isValid && (
              <div className="text-sm text-red-600">
                {validationResult.errors.length} hata bulundu
              </div>
            )}
            {validationResult?.isValid && (
              <div className="text-sm text-green-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Form geçerli
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <Button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              variant='default'>
              İptal
            </Button>

            {/* Preview Button */}
            <Button
              type="button"
              onClick={handlePreview}
              disabled={isSubmitting || !validationResult?.isValid}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              variant='default'>
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Hazırlanıyor...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Önizle
                </>
              )}
            </Button>

            {/* Create and Download PDF Button */}
            {createdInvoice && (
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
            )}

            {/* Print Button */}
            {createdInvoice && (
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
            )}

            <Button
              type="submit"
              form="invoice-form"
              disabled={isSubmitting || !validationResult?.isValid}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              variant='default'>
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Oluşturuluyor...
                </>
              ) : (
                'Fatura Oluştur'
              )}
            </Button>
          </div>
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