import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Button } from '@x-ear/ui-web';
import { Download } from 'lucide-react';
import PartySearch from './PartySearch';
import DocumentTypeSelector from './DocumentTypeSelector';
import DocumentProcessingStep from './DocumentProcessingStep';
import DocumentReviewStep from './DocumentReviewStep';
import { type Party } from '../../types/party';
import { useDocumentProcessing, generateFileName, type ProcessedDocument } from '../../hooks/useDocumentProcessing';
import { useGeneratePDF } from '../../hooks/useGeneratePDF';

interface DocumentProcessorProps {
  isOpen: boolean;
  onClose: () => void;
  images: File[];
  onProcessingComplete: (documents: ProcessedDocument[]) => void;
}

const DocumentProcessor: React.FC<DocumentProcessorProps> = ({
  isOpen,
  onClose,
  images,
  onProcessingComplete,
}) => {
  const {
    documents,
    setDocuments,
    processImages,
    processingProgress,
    currentStep,
    isProcessing,
    setCurrentStep,
  } = useDocumentProcessing(images);

  const { generatePDF } = useGeneratePDF();

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showPartySearch, setShowPartySearch] = useState(false);
  const [showDocumentTypeSelector, setShowDocumentTypeSelector] = useState(false);

  // Handle party selection
  const handlePartySelect = useCallback(
    (party: Party) => {
      if (selectedDocumentId) {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === selectedDocumentId ? { ...doc, selectedParty: party } : doc
          )
        );
      }
      setShowPartySearch(false);
      setSelectedDocumentId(null);
    },
    [selectedDocumentId, setDocuments]
  );

  // Handle document type selection
  const handleDocumentTypeSelect = useCallback(
    (docType: string) => {
      if (selectedDocumentId) {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === selectedDocumentId
              ? {
                  ...doc,
                  selectedDocumentType: docType,
                  finalFileName: generateFileName(doc.ocrResult?.matched_party, docType),
                }
              : doc
          )
        );
      }
      setShowDocumentTypeSelector(false);
      setSelectedDocumentId(null);
    },
    [selectedDocumentId, setDocuments]
  );

  // Handle completion - generate PDFs for all documents
  const handleComplete = useCallback(async () => {
    setCurrentStep('generating');

    try {
      const documentsWithPDF = await Promise.all(
        documents.map(async (doc) => {
          const pdfData = await generatePDF(doc);
          return { ...doc, pdfData };
        })
      );

      setDocuments(documentsWithPDF);
      onProcessingComplete(documentsWithPDF);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Error generating PDFs:', error);
    }
  }, [documents, generatePDF, onProcessingComplete, setDocuments, setCurrentStep]);

  // Auto-start processing when modal opens
  useEffect(() => {
    if (isOpen && images.length > 0 && documents.length === 0) {
      processImages();
    }
  }, [isOpen, images, documents.length, processImages]);

  // Auto-select first document for review
  useEffect(() => {
    if (currentStep === 'review' && documents.length > 0 && !selectedDocumentId) {
      setSelectedDocumentId(documents[0].id);
    }
  }, [currentStep, documents, selectedDocumentId]);

  const handleOpenPartySearch = useCallback((docId: string) => {
    setSelectedDocumentId(docId);
    setShowPartySearch(true);
  }, []);

  const handleOpenDocumentTypeSelector = useCallback((docId: string) => {
    setSelectedDocumentId(docId);
    setShowDocumentTypeSelector(true);
  }, []);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Belge İşleme" size="xl">
        <div className="space-y-6">
          {currentStep === 'processing' && (
            <DocumentProcessingStep
              processingProgress={processingProgress}
              imageCount={images.length}
            />
          )}
          {currentStep === 'review' && (
            <DocumentReviewStep
              documents={documents}
              selectedDocumentId={selectedDocumentId}
              onSelectDocument={setSelectedDocumentId}
              onOpenPartySearch={handleOpenPartySearch}
              onOpenDocumentTypeSelector={handleOpenDocumentTypeSelector}
            />
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
              İptal
            </Button>

            {currentStep === 'review' && (
              <Button onClick={handleComplete} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    PDF Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Tamamla ({documents.length} belge)
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Party Search Modal */}
      <PartySearch
        isOpen={showPartySearch}
        onClose={() => {
          setShowPartySearch(false);
          setSelectedDocumentId(null);
        }}
        onSelect={handlePartySelect}
        ocrResult={
          selectedDocumentId
            ? documents.find((d) => d.id === selectedDocumentId)?.ocrResult
            : undefined
        }
      />

      {/* Document Type Selector Modal */}
      <DocumentTypeSelector
        isOpen={showDocumentTypeSelector}
        onClose={() => {
          setShowDocumentTypeSelector(false);
          setSelectedDocumentId(null);
        }}
        onSelect={handleDocumentTypeSelect}
        currentType={
          selectedDocumentId
            ? documents.find((d) => d.id === selectedDocumentId)?.ocrResult?.document_type
            : undefined
        }
      />
    </>
  );
};

export default DocumentProcessor;
