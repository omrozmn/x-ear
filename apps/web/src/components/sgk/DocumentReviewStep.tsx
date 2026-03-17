import React from 'react';
import { Button } from '@x-ear/ui-web';
import { FileText, Eye, Scissors } from 'lucide-react';
import { type ProcessedDocument } from '../../hooks/useDocumentProcessing';

interface DocumentReviewStepProps {
  documents: ProcessedDocument[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onOpenPartySearch: (docId: string) => void;
  onOpenDocumentTypeSelector: (docId: string) => void;
}

const DocumentReviewStep: React.FC<DocumentReviewStepProps> = ({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onOpenPartySearch,
  onOpenDocumentTypeSelector,
}) => {
  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);
  const errorCount = documents.filter((d) => d.finalFileName?.startsWith('error_')).length;
  const successCount = documents.length - errorCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Belgeleri İnceleyin</h3>
          <p className="text-sm text-muted-foreground">
            {successCount} başarılı{errorCount > 0 ? `, ${errorCount} hatalı` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {documents.map((doc, index) => (
            <Button
              key={doc.id}
              variant={doc.id === selectedDocumentId ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelectDocument(doc.id)}
            >
              {index + 1}
            </Button>
          ))}
        </div>
      </div>

      {selectedDoc && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Preview */}
          <div className="space-y-4">
            <h4 className="font-medium">Belge Önizleme</h4>
            <div className="border rounded-2xl overflow-hidden">
              <img
                src={selectedDoc.croppedImage || selectedDoc.processedImage}
                alt="Processed document"
                className="w-full h-auto"
              />
            </div>

            {selectedDoc.edgeDetection && (
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4" />
                  <span>Kenar Tespiti: %{Math.round(selectedDoc.edgeDetection.confidence * 100)}</span>
                </div>
              </div>
            )}
          </div>

          {/* OCR Results and Controls */}
          <div className="space-y-4">
            <h4 className="font-medium">OCR Sonuçları</h4>

            {selectedDoc.ocrResult && (
              <div className="space-y-4">
                {selectedDoc.ocrResult.ocr_text && (
                  <div className="p-3 bg-muted rounded-2xl">
                    <div className="text-sm font-medium mb-2">Tespit Edilen Metin:</div>
                    <div className="text-sm whitespace-pre-wrap">{selectedDoc.ocrResult.ocr_text}</div>
                    {selectedDoc.ocrResult.confidence_score !== undefined && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Güven: %{Math.round(selectedDoc.ocrResult.confidence_score * 100)}
                      </div>
                    )}
                  </div>
                )}

                {selectedDoc.ocrResult.matched_party && (
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <div className="text-sm font-medium mb-2">Hasta Bilgileri:</div>
                    <div className="text-sm space-y-1">
                      <div>İsim: {selectedDoc.ocrResult.matched_party.name}</div>
                      <div>TC: {selectedDoc.ocrResult.matched_party.tcNumber}</div>
                      {selectedDoc.ocrResult.matched_party.match_details?.confidence !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          Güven: %{Math.round(selectedDoc.ocrResult.matched_party.match_details.confidence * 100)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedDoc.ocrResult.document_type && (
                  <div className="p-3 bg-success/10 rounded-2xl">
                    <div className="text-sm font-medium mb-2">Belge Türü:</div>
                    <div className="text-sm">
                      {selectedDoc.ocrResult.document_type}
                      {selectedDoc.ocrResult.confidence_score !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          Güven: %{Math.round(selectedDoc.ocrResult.confidence_score * 100)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onOpenPartySearch(selectedDoc.id)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {selectedDoc.selectedParty
                  ? `${selectedDoc.selectedParty.firstName} ${selectedDoc.selectedParty.lastName}`
                  : 'Hasta Seç'}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onOpenDocumentTypeSelector(selectedDoc.id)}
              >
                <FileText className="w-4 h-4 mr-2" />
                {selectedDoc.selectedDocumentType || selectedDoc.ocrResult?.document_type || 'Belge Türü Seç'}
              </Button>
            </div>

            {/* File Name Preview */}
            {selectedDoc.finalFileName && (
              <div className="p-3 bg-muted rounded-2xl">
                <div className="text-sm font-medium mb-1">Dosya Adı:</div>
                <div className="text-sm text-muted-foreground">{selectedDoc.finalFileName}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentReviewStep;
