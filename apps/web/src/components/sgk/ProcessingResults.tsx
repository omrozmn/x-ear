import React, { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@x-ear/ui-web';
import { CheckCircle, XCircle, FileText, User, Search } from 'lucide-react';
import DocumentPreview, { type ProcessingResult } from './DocumentPreview';
import PartySearch from './PartySearch';
import DocumentTypeSelector from './DocumentTypeSelector';
import { type Party } from '../../types/party';

interface ProcessingResultsProps {
  results: ProcessingResult[];
  isProcessing: boolean;
  onRetry: () => void;
}

const ProcessingResults: React.FC<ProcessingResultsProps> = ({
  results,
  isProcessing: _isProcessing,
  onRetry,
}) => {
  const [selectedResult, setSelectedResult] = useState<ProcessingResult | null>(null);
  const [showPartySearch, setShowPartySearch] = useState(false);
  const [showDocumentTypeSelector, setShowDocumentTypeSelector] = useState(false);

  const successfulResults = results.filter(r => r.status === 'processed');
  const errorResults = results.filter(r => r.status === 'error');

  const handlePartySelect = (result: ProcessingResult, party: Party) => {
    // TODO: Update result with selected party
    console.log('Party selected:', party, 'for result:', result);
    setShowPartySearch(false);
  };

  const handleDocumentTypeSelect = (result: ProcessingResult, docType: string) => {
    // TODO: Update result with selected document type
    console.log('Document type selected:', docType, 'for result:', result);
    setShowDocumentTypeSelector(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">İşleme Sonuçları</h2>
        <Button onClick={onRetry} variant="outline">
          Tekrar Yükle
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Toplam Dosya
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              Başarılı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successfulResults.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
              <XCircle className="w-4 h-4" />
              Hata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{errorResults.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Results Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((result, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium truncate">
                {result.fileName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.status === 'processed' ? (
                <>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">İşlendi</span>
                  </div>

                  {result.result?.matched_party ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      <User className="w-4 h-4" />
                      <span className="text-sm">
                        {result.result.matched_party.party?.fullName || 'Hasta bulundu'}
                      </span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedResult(result);
                        setShowPartySearch(true);
                      }}
                      className="w-full"
                    >
                      <Search className="w-4 h-4 mr-1" />
                      Hasta Seç
                    </Button>
                  )}

                  <div className="text-xs text-gray-500">
                    Tür: {result.result?.document_type || 'Belirlenemedi'}
                  </div>

                  {result.result?.pdf_generated && (
                    <div className="text-xs text-green-600">
                      PDF oluşturuldu: {result.result.pdf_filename}
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedResult(result)}
                    className="w-full"
                  >
                    Önizle
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm">Hata</span>
                  </div>
                  <div className="text-xs text-red-500">
                    {result.error}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modals */}
      {selectedResult && (
        <DocumentPreview
          result={selectedResult}
          isOpen={!!selectedResult}
          onClose={() => setSelectedResult(null)}
          onChangeDocumentType={() => {
            setShowDocumentTypeSelector(true);
          }}
        />
      )}

      {showPartySearch && selectedResult && (
        <PartySearch
          isOpen={showPartySearch}
          onClose={() => setShowPartySearch(false)}
          onSelect={(party) => handlePartySelect(selectedResult, party)}
          ocrResult={selectedResult.result}
        />
      )}

      {showDocumentTypeSelector && selectedResult && (
        <DocumentTypeSelector
          isOpen={showDocumentTypeSelector}
          onClose={() => setShowDocumentTypeSelector(false)}
          onSelect={(docType) => handleDocumentTypeSelect(selectedResult, docType)}
          currentType={selectedResult.result?.document_type}
        />
      )}
    </div>
  );
};

export default ProcessingResults;