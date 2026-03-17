import { useCallback } from 'react';
import { type ProcessedDocument } from './useDocumentProcessing';

export function useGeneratePDF() {
  const generatePDF = useCallback(async (doc: ProcessedDocument): Promise<string> => {
    // Dynamic import to reduce bundle size
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;

    const pdf = new jsPDF();

    // Add title
    pdf.setFontSize(16);
    pdf.text('Belge İşleme Raporu', 20, 20);

    // Add party info
    if (doc.selectedParty) {
      pdf.setFontSize(12);
      pdf.text(`Hasta: ${doc.selectedParty.firstName} ${doc.selectedParty.lastName}`, 20, 40);
      pdf.text(`TC: ${doc.selectedParty.tcNumber}`, 20, 50);
    }

    // Add document type
    if (doc.selectedDocumentType) {
      pdf.text(`Belge Türü: ${doc.selectedDocumentType}`, 20, 60);
    }

    // Add processed image
    if (doc.processedImage) {
      try {
        pdf.addImage(doc.processedImage, 'JPEG', 20, 80, 160, 120);
      } catch (error) {
        console.error('Error adding image to PDF:', error);
      }
    }

    // Add OCR text
    if (doc.ocrResult?.ocr_text) {
      pdf.setFontSize(10);
      pdf.text('OCR Metni:', 20, 220);
      const splitText = pdf.splitTextToSize(doc.ocrResult.ocr_text, 160);
      pdf.text(splitText, 20, 230);
    }

    const blobUrl = pdf.output('bloburl');
    return typeof blobUrl === 'string'
      ? blobUrl
      : URL.createObjectURL(new Blob([pdf.output('blob')], { type: 'application/pdf' }));
  }, []);

  return { generatePDF };
}
