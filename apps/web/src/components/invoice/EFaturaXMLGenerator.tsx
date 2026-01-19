import { Button, Input, Select } from '@x-ear/ui-web';
import React, { useState, useCallback } from 'react';
import { Invoice } from '../../types/invoice';
import { EFaturaXMLOptions, EFaturaXMLResult, EFaturaSubmissionData, EFaturaIntegratorResponse } from '../../types/efatura';
import { EFaturaXMLService } from '../../services/EFaturaXMLService';

interface EFaturaXMLGeneratorProps {
  invoice: Invoice;
  onXMLGenerated?: (result: EFaturaXMLResult) => void;
  onSubmissionComplete?: (response: EFaturaIntegratorResponse) => void;
  className?: string;
}

interface GenerationState {
  isGenerating: boolean;
  isSubmitting: boolean;
  result: EFaturaXMLResult | null;
  submissionResponse: EFaturaIntegratorResponse | null;
  error: string | null;
}

export const EFaturaXMLGenerator: React.FC<EFaturaXMLGeneratorProps> = ({
  invoice,
  onXMLGenerated,
  onSubmissionComplete,
  className = ''
}) => {
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    isSubmitting: false,
    result: null,
    submissionResponse: null,
    error: null
  });

  const [options, setOptions] = useState<EFaturaXMLOptions>({
    includeSignature: false,
    validateXML: true,
    formatXML: true,
    encoding: 'UTF-8'
  });

  const [integratorInfo, setIntegratorInfo] = useState({
    companyName: '',
    contactEmail: '',
    apiEndpoint: ''
  });

  const xmlService = EFaturaXMLService.getInstance();

  const generateXML = useCallback(async () => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      const result = await xmlService.generateXML(invoice, options);
      
      setState(prev => ({ ...prev, result, isGenerating: false }));
      
      if (onXMLGenerated) {
        onXMLGenerated(result);
      }

      if (!result.success) {
        setState(prev => ({ 
          ...prev, 
          error: result.errors?.join(', ') || 'XML oluşturma hatası' 
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      setState(prev => ({ 
        ...prev, 
        isGenerating: false, 
        error: errorMessage 
      }));
    }
  }, [invoice, options, xmlService, onXMLGenerated]);

  const downloadXML = useCallback(() => {
    if (!state.result?.xmlContent || !state.result?.fileName) return;

    const blob = new Blob([state.result.xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = state.result.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [state.result]);

  const submitToIntegrator = useCallback(async () => {
    if (!state.result?.xmlContent || !state.result?.ettn) return;

    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const submissionData: EFaturaSubmissionData = {
        xmlContent: state.result.xmlContent,
        fileName: state.result.fileName || 'efatura.xml',
        invoiceId: invoice.id,
        ettn: state.result.ettn,
        submissionType: 'single',
        integratorInfo: integratorInfo.companyName ? integratorInfo : undefined
      };

      // This would be replaced with actual integrator API call
      const response = await mockIntegratorSubmission(submissionData);
      
      setState(prev => ({ 
        ...prev, 
        isSubmitting: false, 
        submissionResponse: response 
      }));

      if (onSubmissionComplete) {
        onSubmissionComplete(response);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Entegratör gönderim hatası';
      setState(prev => ({ 
        ...prev, 
        isSubmitting: false, 
        error: errorMessage 
      }));
    }
  }, [state.result, invoice.id, integratorInfo, onSubmissionComplete]);

  const copyXMLToClipboard = useCallback(async () => {
    if (!state.result?.xmlContent) return;

    try {
      await navigator.clipboard.writeText(state.result.xmlContent);
      // You might want to show a toast notification here
    } catch (error) {
      console.error('Failed to copy XML to clipboard:', error);
    }
  }, [state.result]);

  return (
    <div className={`efatura-xml-generator ${className}`}>
      <div className="generator-header">
        <h3>E-Fatura XML Oluşturucu</h3>
        <p className="text-sm text-gray-600">
          Fatura: {invoice.invoiceNumber} - {invoice.partyName}
        </p>
      </div>
      {/* XML Generation Options */}
      <div className="generation-options mb-4">
        <h4 className="font-medium mb-2">XML Seçenekleri</h4>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center">
            <Input
              type="checkbox"
              checked={options.validateXML}
              onChange={(e) => setOptions(prev => ({ ...prev, validateXML: e.target.checked }))}
              className="mr-2"
            />
            XML Doğrulama
          </label>
          <label className="flex items-center">
            <Input
              type="checkbox"
              checked={options.formatXML}
              onChange={(e) => setOptions(prev => ({ ...prev, formatXML: e.target.checked }))}
              className="mr-2"
            />
            XML Formatlama
          </label>
          <label className="flex items-center">
            <Input
              type="checkbox"
              checked={options.includeSignature}
              onChange={(e) => setOptions(prev => ({ ...prev, includeSignature: e.target.checked }))}
              className="mr-2"
            />
            Dijital İmza Dahil Et
          </label>
          <div>
            <label className="block text-sm font-medium mb-1">Encoding</label>
            <Select
              value={options.encoding}
              onChange={(e) => setOptions(prev => ({ ...prev, encoding: e.target.value }))}
              options={[
                { value: 'UTF-8', label: 'UTF-8' },
                { value: 'ISO-8859-9', label: 'ISO-8859-9' }
              ]}
              className="w-full px-3 py-1 border rounded"
            />
          </div>
        </div>
      </div>
      {/* Integrator Information */}
      <div className="integrator-info mb-4">
        <h4 className="font-medium mb-2">Entegratör Bilgileri</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Firma Adı</label>
            <Input
              type="text"
              value={integratorInfo.companyName}
              onChange={(e) => setIntegratorInfo(prev => ({ ...prev, companyName: e.target.value }))}
              placeholder="Entegratör firma adı"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">İletişim E-posta</label>
            <Input
              type="email"
              value={integratorInfo.contactEmail}
              onChange={(e) => setIntegratorInfo(prev => ({ ...prev, contactEmail: e.target.value }))}
              placeholder="contact@integrator.com"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">API Endpoint (Opsiyonel)</label>
            <Input
              type="url"
              value={integratorInfo.apiEndpoint}
              onChange={(e) => setIntegratorInfo(prev => ({ ...prev, apiEndpoint: e.target.value }))}
              placeholder="https://api.integrator.com"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
      </div>
      {/* Action Buttons */}
      <div className="action-buttons mb-4">
        <Button
          onClick={generateXML}
          disabled={state.isGenerating}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 mr-2"
          variant='default'>
          {state.isGenerating ? 'XML Oluşturuluyor...' : 'XML Oluştur'}
        </Button>

        {state.result?.success && (
          <>
            <Button
              onClick={downloadXML}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mr-2"
              variant='default'>
              XML İndir
            </Button>
            <Button
              onClick={copyXMLToClipboard}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 mr-2"
              variant='default'>
              Panoya Kopyala
            </Button>
            <Button
              onClick={submitToIntegrator}
              disabled={state.isSubmitting}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
              variant='default'>
              {state.isSubmitting ? 'Gönderiliyor...' : 'Entegratöre Gönder'}
            </Button>
          </>
        )}
      </div>
      {/* Error Display */}
      {state.error && (
        <div className="error-message bg-red-50 border border-red-200 rounded p-3 mb-4">
          <h5 className="font-medium text-red-800 mb-1">Hata</h5>
          <p className="text-red-700">{state.error}</p>
        </div>
      )}
      {/* Generation Result */}
      {state.result && (
        <div className="generation-result">
          <h4 className="font-medium mb-2">XML Oluşturma Sonucu</h4>
          
          {state.result.success ? (
            <div className="success-result bg-green-50 border border-green-200 rounded p-3 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Dosya Adı:</strong> {state.result.fileName}
                </div>
                <div>
                  <strong>ETTN:</strong> {state.result.ettn}
                </div>
              </div>
              
              {state.result.validationResult && (
                <div className="validation-result mt-3">
                  <h5 className="font-medium mb-1">Doğrulama Sonucu</h5>
                  <p className={`text-sm ${state.result.validationResult.isValid ? 'text-green-700' : 'text-red-700'}`}>
                    {state.result.validationResult.isValid ? 'XML geçerli' : 'XML geçersiz'}
                  </p>
                  
                  {state.result.validationResult.warnings && state.result.validationResult.warnings.length > 0 && (
                    <div className="warnings mt-2">
                      <h6 className="font-medium text-yellow-800">Uyarılar:</h6>
                      <ul className="list-disc list-inside text-sm text-yellow-700">
                        {state.result.validationResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="error-result bg-red-50 border border-red-200 rounded p-3 mb-4">
              <h5 className="font-medium text-red-800 mb-1">XML Oluşturma Başarısız</h5>
              {state.result.errors && (
                <ul className="list-disc list-inside text-sm text-red-700">
                  {state.result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      {/* Submission Result */}
      {state.submissionResponse && (
        <div className="submission-result">
          <h4 className="font-medium mb-2">Entegratör Gönderim Sonucu</h4>
          
          <div className={`submission-status p-3 rounded mb-4 ${
            state.submissionResponse.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Durum:</strong> 
                <span className={`ml-1 ${state.submissionResponse.success ? 'text-green-700' : 'text-red-700'}`}>
                  {getStatusText(state.submissionResponse.status)}
                </span>
              </div>
              {state.submissionResponse.submissionId && (
                <div>
                  <strong>Gönderim ID:</strong> {state.submissionResponse.submissionId}
                </div>
              )}
            </div>
            
            {state.submissionResponse.message && (
              <p className="text-sm mt-2">{state.submissionResponse.message}</p>
            )}
            
            {state.submissionResponse.errors && state.submissionResponse.errors.length > 0 && (
              <div className="errors mt-2">
                <h6 className="font-medium text-red-800">Hatalar:</h6>
                <ul className="list-disc list-inside text-sm text-red-700">
                  {state.submissionResponse.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
      {/* XML Preview */}
      {state.result?.success && state.result.xmlContent && (
        <div className="xml-preview">
          <h4 className="font-medium mb-2">XML Önizleme</h4>
          <div className="xml-content bg-gray-50 border rounded p-3 max-h-96 overflow-auto">
            <pre className="text-xs whitespace-pre-wrap">
              {state.result.xmlContent.substring(0, 2000)}
              {state.result.xmlContent.length > 2000 && '...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get status text in Turkish
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'received': 'Alındı',
    'processing': 'İşleniyor',
    'sent_to_gib': 'GİB\'e Gönderildi',
    'accepted': 'Kabul Edildi',
    'rejected': 'Reddedildi'
  };
  return statusMap[status] || status;
}

// Mock integrator submission function - replace with actual API call
async function mockIntegratorSubmission(data: EFaturaSubmissionData): Promise<EFaturaIntegratorResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock successful response
  return {
    success: true,
    submissionId: `SUB_${Date.now()}`,
    ettn: data.ettn,
    status: 'received',
    message: 'E-Fatura başarıyla entegratör firmaya gönderildi. GİB\'e iletim için işleme alındı.'
  };
}

export default EFaturaXMLGenerator;