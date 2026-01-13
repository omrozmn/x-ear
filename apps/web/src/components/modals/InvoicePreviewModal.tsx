import { Button } from '@x-ear/ui-web';
import React, { useState, useEffect } from 'react';
import { Invoice } from '../../types/invoice';
import { invoiceService } from '../../services/invoice.service';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onPrint?: () => void;
  onDownload?: () => void;
  onError?: (error: string) => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onPrint,
  onDownload,
  onError
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clean up PDF URL when modal closes or invoice changes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Generate PDF when invoice changes
  useEffect(() => {
    if (isOpen && invoice) {
      generatePdf();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, invoice]);

  const generatePdf = async () => {
    if (!invoice) return;

    setErrorMessage(null);
    setIsGeneratingPdf(true);
    try {
      const result = await invoiceService.generateInvoicePdf(invoice.id);

      if (result.success && result.data) {
        setPdfBlob(result.data);
        const url = window.URL.createObjectURL(result.data);
        setPdfUrl(url);
        setErrorMessage(null);
      } else {
        const err = result.error || 'PDF oluşturulamadı';
        setErrorMessage(err);
        console.error('Invoice preview error:', err);
        if (onError) onError(err);
      }
    } catch (error) {
      const err = error instanceof Error ? error.message : 'PDF oluşturulurken bir hata oluştu';
      setErrorMessage(err);
      console.error('Invoice preview exception:', error);
      if (onError) onError(err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      // Open PDF in new window for printing
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
    if (onPrint) {
      onPrint();
    }
  };

  const handleDownload = () => {
    if (pdfBlob && invoice) {
      const filename = `fatura-${invoice.invoiceNumber}.pdf`;
      invoiceService.downloadPdfBlob(pdfBlob, filename);
    }
    if (onDownload) {
      onDownload();
    }
  };

  const handlePreview = () => {
    if (pdfBlob) {
      invoiceService.previewPdfBlob(pdfBlob);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Fatura Önizleme
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {invoice.invoiceNumber} - {invoice.customerName}
            </p>
          </div>
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
        <div className="flex-1 overflow-hidden flex flex-col">
          {isGeneratingPdf ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">PDF oluşturuluyor...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <div className="flex-1 p-4">
              <iframe
                src={pdfUrl}
                className="w-full h-full border border-gray-300 rounded-lg"
                title="Fatura Önizleme"
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600 mb-2">PDF önizleme yüklenemedi</p>
                {errorMessage && (
                  <div className="mb-4 text-sm text-red-600">{errorMessage}</div>
                )}
                <Button
                  onClick={() => { setErrorMessage(null); generatePdf(); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  variant='default'>
                  Tekrar Dene
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Draft watermark when invoice is a draft */}
        {invoice.status === 'draft' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
            <div className="transform -rotate-12 text-6xl font-bold text-gray-400 select-none">DRAFT</div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Fatura: {invoice.invoiceNumber}</span>
            <span>•</span>
            <span>Tutar: {(invoice.totalAmount ?? 0).toLocaleString('tr-TR')} {invoice.currency}</span>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              variant='default'>
              Kapat
            </Button>
            
            {pdfBlob && (
              <>
                <Button
                  type="button"
                  onClick={handlePreview}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  variant='default'>
                  Yeni Sekmede Aç
                </Button>
                
                <Button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  variant='default'>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  İndir
                </Button>
                
                <Button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  variant='default'>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Yazdır
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};