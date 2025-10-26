import React, { useState, useEffect } from 'react';
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  Spinner,
  Alert,
  AlertDescription,
} from '@x-ear/ui-web';
import { Upload, Check } from 'lucide-react';

interface SGKScheme {
  id: string;
  name: string;
  coverage: number;
  maxAmount: number;
  description?: string;
}

interface SGKIntegrationProps {
  patientAge: number;
  isBilateral: boolean;
  onSGKUpdate: (sgkData: {
    scheme?: SGKScheme;
    coverage: number;
    supportAmount: number;
  }) => void;
}

export const SGKIntegration: React.FC<SGKIntegrationProps> = ({
  patientAge,
  isBilateral,
  onSGKUpdate,
}) => {
  const [sgkSchemes, setSgkSchemes] = useState<SGKScheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<SGKScheme | null>(null);
  const [sgkDocumentUploaded, setSgkDocumentUploaded] = useState(false);
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  // Mock SGK schemes based on patient criteria
  const loadSGKSchemes = () => {
    setLoadingSchemes(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const mockSchemes: SGKScheme[] = [
        {
          id: 'sgk-1',
          name: 'Genel Sağlık Sigortası',
          coverage: 0.8,
          maxAmount: 15000,
          description: 'Standart SGK kapsamı'
        },
        {
          id: 'sgk-2', 
          name: 'Emekli Sigortası',
          coverage: 0.9,
          maxAmount: 20000,
          description: 'Emekli vatandaşlar için'
        }
      ];

      // Age-based filtering
      if (patientAge >= 65) {
        mockSchemes.push({
          id: 'sgk-elderly',
          name: '65+ Yaş Desteği',
          coverage: 0.95,
          maxAmount: 25000,
          description: '65 yaş üstü ek destek'
        });
      }

      // Bilateral support
      if (isBilateral) {
        mockSchemes.forEach(scheme => {
          scheme.coverage = Math.min(scheme.coverage + 0.1, 1.0);
          scheme.maxAmount *= 1.5;
        });
      }

      setSgkSchemes(mockSchemes);
      setLoadingSchemes(false);
    }, 1000);
  };

  useEffect(() => {
    loadSGKSchemes();
  }, [patientAge, isBilateral]);

  const handleSchemeSelect = (schemeId: string) => {
    const scheme = sgkSchemes.find(s => s.id === schemeId);
    setSelectedScheme(scheme || null);
    
    if (scheme) {
      onSGKUpdate({
        scheme,
        coverage: scheme.coverage,
        supportAmount: 0 // Will be calculated based on total amount
      });
    }
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingDocument(true);
    
    // Simulate document upload and processing
    setTimeout(() => {
      setSgkDocumentUploaded(true);
      setUploadingDocument(false);
    }, 2000);
  };

  return (
    <div>
      <span className="text-lg font-bold text-gray-700 block mb-3">
        SGK Entegrasyonu
      </span>
      
      <div className="space-y-4">
        {/* Patient Criteria Display */}
        <div className="p-3 bg-blue-50 rounded-md">
          <div className="flex gap-4">
            <Badge>Yaş: {patientAge}</Badge>
            <Badge>
              {isBilateral ? "Bilateral" : "Tek Taraf"}
            </Badge>
          </div>
        </div>

        {/* SGK Scheme Selection */}
        <div>
          <Label htmlFor="sgk-scheme">SGK Şeması</Label>
          {loadingSchemes ? (
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span>SGK şemaları yükleniyor...</span>
            </div>
          ) : (
            <Select
              id="sgk-scheme"
              options={sgkSchemes.map(scheme => ({
                value: scheme.id,
                label: `${scheme.name} - %${(scheme.coverage * 100).toFixed(0)} kapsam`
              }))}
              placeholder="SGK şeması seçiniz"
              onChange={(e) => handleSchemeSelect(e.target.value)}
              fullWidth
            />
          )}
        </div>

        {/* Selected Scheme Details */}
        {selectedScheme && (
          <div className="p-4 bg-green-50 rounded-md border border-green-200">
            <div className="space-y-2">
              <span className="font-bold text-green-700">
                {selectedScheme.name}
              </span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Kapsam Oranı</span>
                  <span className="font-bold block">%{(selectedScheme.coverage * 100).toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Maksimum Tutar</span>
                  <span className="font-bold block">₺{selectedScheme.maxAmount.toLocaleString()}</span>
                </div>
              </div>
              {selectedScheme.description && (
                <span className="text-sm text-gray-600">
                  {selectedScheme.description}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Document Upload */}
        <div>
          <Label htmlFor="sgk-document">SGK Belgesi</Label>
          <div className="flex gap-2">
            <label
              htmlFor="sgk-document"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
            >
              {sgkDocumentUploaded ? <Check className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {sgkDocumentUploaded ? "Belge Yüklendi" : "Belge Yükle"}
            </label>
            <Input
              id="sgk-document"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleDocumentUpload}
              className="hidden"
            />
          </div>
          
          {sgkDocumentUploaded && (
            <Alert variant="success" className="mt-2">
              <AlertDescription>
                SGK belgesi başarıyla yüklendi ve işlendi.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Preview Button */}
        {selectedScheme && sgkDocumentUploaded && (
          <Button
            variant="outline"
            onClick={() => {
              // TODO: Implement SGK preview functionality
              console.log('SGK Preview clicked');
            }}
          >
            SGK Önizleme
          </Button>
        )}
      </div>
    </div>
  );
};