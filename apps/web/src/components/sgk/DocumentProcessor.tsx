import React, { useState, useCallback } from 'react';
import { Modal, Button } from '@x-ear/ui-web';
import { FileText, Eye, Download, Scissors, Zap } from 'lucide-react';
import PartySearch from './PartySearch';
import DocumentTypeSelector from './DocumentTypeSelector';
import { type Party } from '../../types/party';

interface ProcessedDocument {
  id: string;
  originalImage: string;
  processedImage: string;
  croppedImage?: string;
  ocrResult?: {
    text: string;
    confidence: number;
    partyInfo?: {
      firstName?: string;
      lastName?: string;
      tcNumber?: string;
      confidence: number;
    };
    documentType?: {
      type: string;
      confidence: number;
    };
  };
  edgeDetection?: {
    corners: Array<{ x: number; y: number }>;
    confidence: number;
    applied: boolean;
  };
  selectedParty?: Party;
  selectedDocumentType?: string;
  finalFileName?: string;
  pdfData?: string;
}

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
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [currentStep, setCurrentStep] = useState<'processing' | 'review' | 'complete' | 'generating'>('processing');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showPartySearch, setShowPartySearch] = useState(false);
  const [showDocumentTypeSelector, setShowDocumentTypeSelector] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Enhanced image compression with optimal dimensions and quality enhancement
  const compressImage = useCallback(async (file: File, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          // Calculate optimal dimensions (max 1920x1080 for better OCR)
          const maxWidth = 1920;
          const maxHeight = 1080;
          let { width, height } = img;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;

          if (ctx) {
            // Enable high-quality image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Apply contrast and brightness enhancement for better OCR
            ctx.filter = 'contrast(1.1) brightness(1.05)';
            
            // Draw the enhanced image
            ctx.drawImage(img, 0, 0, width, height);
            
            // Reset filter for future operations
            ctx.filter = 'none';
            
            resolve(canvas.toDataURL('image/jpeg', quality));
          } else {
            resolve(e.target?.result as string);
          }
        };

        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Detect document edges and crop
  const detectAndCropDocument = useCallback(async (imageData: string): Promise<{
    croppedImage: string;
    corners: Array<{ x: number; y: number }>;
    confidence: number;
  }> => {
    // Simulate edge detection processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock edge detection result
    const mockCorners = [
      { x: 50, y: 50 },
      { x: 350, y: 45 },
      { x: 355, y: 450 },
      { x: 45, y: 455 }
    ];

    // For now, return the original image as "cropped"
    // In real implementation, this would use OpenCV.js or similar
    return {
      croppedImage: imageData,
      corners: mockCorners,
      confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
    };
  }, []);

  // Enhanced document type detection with weighted keyword scoring
  const detectDocumentType = useCallback((text: string): string => {
    const keywords = {
      sgk_reçete: ['reçete', 'ilaç', 'eczane', 'sgk', 'sosyal güvenlik', 'prescription', 'medicine'],
      sgk_rapor: ['rapor', 'doktor', 'hekim', 'muayene', 'tanı', 'report', 'diagnosis'],
      odyometri: ['odyometri', 'işitme', 'audiometry', 'hearing', 'kulak', 'ear'],
      garanti_belgesi: ['garanti', 'warranty', 'cihaz', 'device', 'serial'],
      diger: []
    };

    const scores: Record<string, number> = {};
    const lowerText = text.toLowerCase();

    // Calculate weighted scores for each document type
    Object.entries(keywords).forEach(([type, words]) => {
      scores[type] = 0;
      words.forEach(keyword => {
        const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
        // Weight keywords by importance and frequency
        scores[type] += matches * (keyword.length > 5 ? 2 : 1);
      });
    });

    // Find the highest scoring document type
    const maxScore = Math.max(...Object.values(scores));
    const detectedType = Object.entries(scores).find(([_key, score]) => score === maxScore)?.[0];
    
    // Return detected type if confidence is high enough, otherwise 'diger'
    return maxScore >= 3 ? detectedType! : 'diger';
  }, []);

  // Enhanced text extraction with better OCR simulation
  const extractTextFromImage = useCallback(async (imageData: string): Promise<{
    text: string;
    confidence: number;
    partyInfo?: {
      firstName?: string;
      lastName?: string;
      tcNumber?: string;
      confidence: number;
    };
    documentType?: {
      type: string;
      confidence: number;
    };
  }> => {
    // Simulate OCR processing with realistic delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    // Enhanced mock OCR results with more realistic patterns
    const mockTexts = [
      {
        text: `T.C. SAĞLIK BAKANLIĞI
SGK REÇETE
Hasta Adı: AHMET YILMAZ
TC Kimlik No: 12345678901
Tarih: ${new Date().toLocaleDateString('tr-TR')}
İlaç Listesi:
- Aspirin 100mg
- Vitamin D3`,
        partyInfo: {
          firstName: "AHMET",
          lastName: "YILMAZ", 
          tcNumber: "12345678901",
          confidence: 0.92
        },
        documentType: {
          type: "sgk_reçete",
          confidence: 0.95
        }
      },
      {
        text: `ODYOMETRI TEST SONUCU
Hasta: FATMA KAYA
TC: 98765432109
Test Tarihi: ${new Date().toLocaleDateString('tr-TR')}
Sağ Kulak: Normal
Sol Kulak: Hafif kayıp`,
        partyInfo: {
          firstName: "FATMA",
          lastName: "KAYA",
          tcNumber: "98765432109", 
          confidence: 0.88
        },
        documentType: {
          type: "odyometri",
          confidence: 0.91
        }
      },
      {
        text: `DOKTOR RAPORU
Dr. Mehmet Özkan
Hasta: ALİ DEMİR
TC: 11223344556
Tanı: Kronik otitis media
Önerilen tedavi: Antibiyotik`,
        partyInfo: {
          firstName: "ALİ",
          lastName: "DEMİR",
          tcNumber: "11223344556",
          confidence: 0.85
        },
        documentType: {
          type: "sgk_rapor", 
          confidence: 0.89
        }
      }
    ];

    // Select random result and apply confidence variation
    const randomResult = mockTexts[Math.floor(Math.random() * mockTexts.length)];
    const baseConfidence = 0.8 + Math.random() * 0.15; // 80-95% base confidence

    return {
      text: randomResult.text,
      confidence: baseConfidence,
      partyInfo: randomResult.partyInfo ? {
        ...randomResult.partyInfo,
        confidence: randomResult.partyInfo.confidence * baseConfidence
      } : undefined,
      documentType: randomResult.documentType ? {
        ...randomResult.documentType,
        confidence: randomResult.documentType.confidence * baseConfidence
      } : undefined,
    };
  }, []);

  // Generate filename based on party and document type
  const generateFileName = useCallback((partyInfo: any, documentType: string): string => {
    const firstName = partyInfo?.firstName || 'Bilinmeyen';
    const lastName = partyInfo?.lastName || 'Hasta';
    
    const docType = documentType.replace(/\s+/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    return `${firstName}_${lastName}_${docType}_${timestamp}.pdf`;
  }, []);

  // Process all images
  const processImages = useCallback(async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setCurrentStep('processing');
    setProcessingProgress(0);

    const processedDocs: ProcessedDocument[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      // Update progress
      const baseProgress = (i / images.length) * 100;
      setProcessingProgress(baseProgress);

      try {
        // Step 1: Compress image
        setProcessingProgress(baseProgress + 10);
        const compressedImage = await compressImage(image);

        // Step 2: Detect and crop document
        setProcessingProgress(baseProgress + 30);
        const edgeDetection = await detectAndCropDocument(compressedImage);

        // Step 3: Extract text with OCR
        setProcessingProgress(baseProgress + 60);
        const ocrResult = await extractTextFromImage(edgeDetection.croppedImage);

        // Step 4: Detect document type
        const detectedType = detectDocumentType(ocrResult.text);
        
        // Step 5: Generate filename
        const fileName = generateFileName(ocrResult.partyInfo, detectedType);

        const processedDoc: ProcessedDocument = {
          id: `doc_${Date.now()}_${i}`,
          originalImage: URL.createObjectURL(image),
          processedImage: compressedImage,
          croppedImage: edgeDetection.croppedImage,
          ocrResult: {
            ...ocrResult,
            documentType: {
              type: detectedType,
              confidence: ocrResult.documentType?.confidence || 0.8
            }
          },
          edgeDetection: {
            corners: edgeDetection.corners,
            confidence: edgeDetection.confidence,
            applied: true
          },
          finalFileName: fileName
        };

        processedDocs.push(processedDoc);
        setProcessingProgress(baseProgress + 90);

      } catch (error) {
        console.error('Error processing image:', error);
        // Add failed document
        processedDocs.push({
          id: `doc_${Date.now()}_${i}`,
          originalImage: URL.createObjectURL(image),
          processedImage: URL.createObjectURL(image),
          finalFileName: `error_${image.name}`
        });
      }
    }

    setDocuments(processedDocs);
    setProcessingProgress(100);
    setIsProcessing(false);
    setCurrentStep('review');
  }, [images, compressImage, detectAndCropDocument, extractTextFromImage, detectDocumentType, generateFileName]);

  // Handle party selection
  const handlePartySelect = useCallback((party: Party) => {
    if (selectedDocumentId) {
      setDocuments(prev => prev.map(doc => 
        doc.id === selectedDocumentId 
          ? { ...doc, selectedParty: party }
          : doc
      ));
    }
    setShowPartySearch(false);
    setSelectedDocumentId(null);
  }, [selectedDocumentId]);

  // Handle document type selection
  const handleDocumentTypeSelect = useCallback((docType: string) => {
    if (selectedDocumentId) {
      setDocuments(prev => prev.map(doc => 
        doc.id === selectedDocumentId 
          ? { 
              ...doc, 
              selectedDocumentType: docType,
              finalFileName: generateFileName(doc.ocrResult?.partyInfo, docType)
            }
          : doc
      ));
    }
    setShowDocumentTypeSelector(false);
    setSelectedDocumentId(null);
  }, [selectedDocumentId, generateFileName]);

  // Generate PDF for document
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
    if (doc.ocrResult?.text) {
      pdf.setFontSize(10);
      pdf.text('OCR Metni:', 20, 220);
      const splitText = pdf.splitTextToSize(doc.ocrResult.text, 160);
      pdf.text(splitText, 20, 230);
    }
    
    return pdf.output('bloburl') as string;
  }, []);

  // Handle completion
  const handleComplete = useCallback(async () => {
    setIsProcessing(true);
    setCurrentStep('generating');

    try {
      // Generate PDFs for all documents
      const documentsWithPDF = await Promise.all(
        documents.map(async (doc) => {
          const pdfData = await generatePDF(doc);
          return { ...doc, pdfData };
        })
      );

      // Update documents with PDF data
      setDocuments(documentsWithPDF);
      
      // Call completion callback
      onProcessingComplete(documentsWithPDF);
      
      setCurrentStep('complete');
    } catch (error) {
      console.error('Error generating PDFs:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [documents, generatePDF, onProcessingComplete]);

  // Auto-start processing when modal opens
  React.useEffect(() => {
    if (isOpen && images.length > 0 && documents.length === 0) {
      processImages();
    }
  }, [isOpen, images, documents.length, processImages]);

  // Auto-select first document for review
  React.useEffect(() => {
    if (currentStep === 'review' && documents.length > 0 && !selectedDocumentId) {
      setSelectedDocumentId(documents[0].id);
    }
  }, [currentStep, documents, selectedDocumentId]);

  const renderProcessingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Belgeler İşleniyor</h3>
        <p className="text-gray-600">Lütfen bekleyin, belgeleriniz analiz ediliyor...</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>İlerleme</span>
          <span>{Math.round(processingProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${processingProgress}%` }}
          />
        </div>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span>Görüntüler sıkıştırılıyor</span>
        </div>
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4" />
          <span>Belge kenarları tespit ediliyor</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>Metin çıkarılıyor (OCR)</span>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    const selectedDoc = documents.find(d => d.id === selectedDocumentId);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Belgeleri İnceleyin</h3>
          <div className="flex gap-2">
            {documents.map((doc, index) => (
              <Button
                key={doc.id}
                variant={doc.id === selectedDocumentId ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDocumentId(doc.id)}
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
              <div className="border rounded-lg overflow-hidden">
                <img 
                  src={selectedDoc.croppedImage || selectedDoc.processedImage} 
                  alt="Processed document"
                  className="w-full h-auto"
                />
              </div>
              
              {selectedDoc.edgeDetection && (
                <div className="text-sm text-gray-600">
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
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium mb-2">Tespit Edilen Metin:</div>
                    <div className="text-sm whitespace-pre-wrap">
                      {selectedDoc.ocrResult.text}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Güven: %{Math.round(selectedDoc.ocrResult.confidence * 100)}
                    </div>
                  </div>

                  {selectedDoc.ocrResult.partyInfo && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium mb-2">Hasta Bilgileri:</div>
                      <div className="text-sm space-y-1">
                        <div>Ad: {selectedDoc.ocrResult.partyInfo.firstName}</div>
                        <div>Soyad: {selectedDoc.ocrResult.partyInfo.lastName}</div>
                        <div>TC: {selectedDoc.ocrResult.partyInfo.tcNumber}</div>
                        <div className="text-xs text-gray-500">
                          Güven: %{Math.round(selectedDoc.ocrResult.partyInfo.confidence * 100)}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDoc.ocrResult.documentType && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-sm font-medium mb-2">Belge Türü:</div>
                      <div className="text-sm">
                        {selectedDoc.ocrResult.documentType.type}
                        <div className="text-xs text-gray-500">
                          Güven: %{Math.round(selectedDoc.ocrResult.documentType.confidence * 100)}
                        </div>
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
                  onClick={() => {
                    setSelectedDocumentId(selectedDoc.id);
                    setShowPartySearch(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {selectedDoc.selectedParty 
                    ? `${selectedDoc.selectedParty.firstName} ${selectedDoc.selectedParty.lastName}`
                    : 'Hasta Seç'
                  }
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedDocumentId(selectedDoc.id);
                    setShowDocumentTypeSelector(true);
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {selectedDoc.selectedDocumentType || selectedDoc.ocrResult?.documentType?.type || 'Belge Türü Seç'}
                </Button>
              </div>

              {/* File Name Preview */}
              {selectedDoc.finalFileName && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium mb-1">Dosya Adı:</div>
                  <div className="text-sm text-gray-600">{selectedDoc.finalFileName}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title="Belge İşleme"
        size="xl"
      >
        <div className="space-y-6">
          {currentStep === 'processing' && renderProcessingStep()}
          {currentStep === 'review' && renderReviewStep()}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isProcessing}
            >
              İptal
            </Button>

            {currentStep === 'review' && (
              <Button
                onClick={handleComplete}
                disabled={isProcessing}
              >
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
        ocrResult={selectedDocumentId ? documents.find(d => d.id === selectedDocumentId)?.ocrResult : undefined}
      />

      {/* Document Type Selector Modal */}
      <DocumentTypeSelector
        isOpen={showDocumentTypeSelector}
        onClose={() => {
          setShowDocumentTypeSelector(false);
          setSelectedDocumentId(null);
        }}
        onSelect={handleDocumentTypeSelect}
        currentType={selectedDocumentId ? documents.find(d => d.id === selectedDocumentId)?.ocrResult?.documentType?.type : undefined}
      />
    </>
  );
};

export default DocumentProcessor;