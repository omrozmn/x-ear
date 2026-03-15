import React, { useState, useCallback } from 'react';
import { Modal, Button } from '@x-ear/ui-web';
import { FileText, Eye, Download, Scissors, Zap, CheckCircle } from 'lucide-react';
import PartySearch from './PartySearch';
import DocumentTypeSelector from './DocumentTypeSelector';
import { type Party } from '../../types/party';
import { type ProcessingResult, type MatchedParty } from './DocumentPreview';
import { uploadOcrDocument } from '@/api/client/ocr.client';
import { normalizeTurkishChars } from '../../utils/stringUtils';

interface ProcessedDocument {
  id: string;
  originalImage: string;
  processedImage: string;
  croppedImage?: string;
  ocrResult?: ProcessingResult['result'];
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

  // Detect document edges and crop using canvas-based analysis
  const detectAndCropDocument = useCallback(async (imageData: string): Promise<{
    croppedImage: string;
    corners: Array<{ x: number; y: number }>;
    confidence: number;
  }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ croppedImage: imageData, corners: [], confidence: 0 });
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imgDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgDataObj.data;

        // Convert to grayscale and find edge boundaries
        const threshold = 200; // White background threshold
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
        const totalPixels = canvas.width * canvas.height;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            
            if (gray < threshold) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        // Add small margin
        const margin = Math.min(canvas.width, canvas.height) * 0.02;
        minX = Math.max(0, minX - margin);
        minY = Math.max(0, minY - margin);
        maxX = Math.min(canvas.width, maxX + margin);
        maxY = Math.min(canvas.height, maxY + margin);

        const docWidth = maxX - minX;
        const docHeight = maxY - minY;

        // Only crop if we detected a meaningful document area
        const areaRatio = (docWidth * docHeight) / totalPixels;
        const hasDocument = areaRatio > 0.1 && areaRatio < 0.98;
        const confidence = hasDocument 
          ? Math.min(0.95, 0.5 + areaRatio * 0.5)
          : 0.3;

        const corners = [
          { x: Math.round(minX), y: Math.round(minY) },
          { x: Math.round(maxX), y: Math.round(minY) },
          { x: Math.round(maxX), y: Math.round(maxY) },
          { x: Math.round(minX), y: Math.round(maxY) },
        ];

        if (hasDocument && docWidth > 100 && docHeight > 100) {
          // Crop to detected document area
          const cropCanvas = document.createElement('canvas');
          const cropCtx = cropCanvas.getContext('2d');
          if (cropCtx) {
            cropCanvas.width = docWidth;
            cropCanvas.height = docHeight;
            cropCtx.drawImage(canvas, minX, minY, docWidth, docHeight, 0, 0, docWidth, docHeight);
            resolve({
              croppedImage: cropCanvas.toDataURL('image/jpeg', 0.85),
              corners,
              confidence,
            });
            return;
          }
        }

        resolve({
          croppedImage: imageData,
          corners,
          confidence,
        });
      };
      img.onerror = () => {
        resolve({ croppedImage: imageData, corners: [], confidence: 0 });
      };
      img.src = imageData;
    });
  }, []);

  // Enhanced document type detection with weighted keyword scoring and Turkish normalization
  const detectDocumentType = useCallback((text: string): string => {
    const keywords: Record<string, string[]> = {
      sgk_reçete: ['reçete', 'recete', 'ilaç', 'ilac', 'eczane', 'sgk', 'sosyal güvenlik', 'sosyal guvenlik', 'prescription', 'medicine', 'medula'],
      sgk_rapor: ['rapor', 'doktor', 'hekim', 'muayene', 'tanı', 'tani', 'report', 'diagnosis', 'bulgular', 'tedavi'],
      odyometri: ['odyometri', 'işitme', 'isitme', 'audiometry', 'hearing', 'kulak', 'ear', 'odyogram', 'audiogram', 'db', 'hz', 'frekans'],
      garanti_belgesi: ['garanti', 'warranty', 'cihaz', 'device', 'serial', 'seri no', 'seri numarası'],
      fatura: ['fatura', 'invoice', 'kdv', 'matrah', 'tutar', 'toplam', 'vergi', 'vkn', 'tckn'],
      diger: []
    };

    const scores: Record<string, number> = {};
    const normalizedText = normalizeTurkishChars(text).toLowerCase();
    const lowerText = text.toLowerCase();

    Object.entries(keywords).forEach(([type, words]) => {
      scores[type] = 0;
      words.forEach(keyword => {
        const normalizedKeyword = normalizeTurkishChars(keyword).toLowerCase();
        // Check both original and normalized text
        const matchesOriginal = (lowerText.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        const matchesNormalized = (normalizedText.match(new RegExp(normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        const matches = Math.max(matchesOriginal, matchesNormalized);
        scores[type] += matches * (keyword.length > 5 ? 2 : 1);
      });
    });

    const maxScore = Math.max(...Object.values(scores));
    const detectedType = Object.entries(scores).find(([, score]) => score === maxScore)?.[0];
    
    return maxScore >= 3 ? detectedType! : 'diger';
  }, []);

  // Real OCR text extraction via backend API
  const extractTextFromImage = useCallback(async (imageFile: File, docType?: string): Promise<ProcessingResult['result']> => {
    try {
      const response = await uploadOcrDocument(
        { file: imageFile },
        { doc_type: docType, auto_crop: true }
      );
      
      // ResponseEnvelope wraps: { success, data: { result, timestamp } }
      const envelope = response as unknown as { success?: boolean; data?: { result?: Record<string, unknown> } };
      const result = envelope?.data?.result as Record<string, unknown> | undefined;
      if (!result) {
        return { ocr_text: '', confidence_score: 0, document_type: 'diger' };
      }

      // Map backend response to ProcessingResult format
      const entities = (result.entities || result.custom_entities || []) as Array<Record<string, unknown>>;
      const classification = (result.classification || {}) as Record<string, unknown>;
      const patientInfo = (result.patient_info || {}) as Record<string, unknown>;
      const medicalTerms = (result.medical_terms || []) as Array<Record<string, unknown>>;

      // Extract OCR text from entities
      const ocrText = entities
        .map((e) => (e.text as string) || '')
        .filter(Boolean)
        .join('\n') || (result.ocr_text as string) || '';

      // Calculate average confidence
      const confidences = entities
        .map((e) => (e.confidence as number) || 0)
        .filter((c) => c > 0);
      const avgConfidence = confidences.length > 0 
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length 
        : 0;

      // Build matched party from patient info
      const matchedParty: MatchedParty | undefined = patientInfo.name ? {
        name: patientInfo.name as string,
        tcNumber: (patientInfo.tc_number as string) || 
          (entities.find((e) => e.label === 'TC_NUMBER')?.text as string),
        match_details: {
          confidence: (patientInfo.confidence as number) || avgConfidence,
          source: 'ocr',
          medical_terms: medicalTerms.map((t) => t.term as string),
        }
      } : undefined;

      return {
        ocr_text: ocrText,
        confidence_score: (classification.confidence as number) || avgConfidence,
        matched_party: matchedParty,
        document_type: (classification.type as string) || 'diger',
        entities: entities.map((e) => ({
          type: (e.label as string) || 'TEXT',
          value: (e.text as string) || '',
          confidence: e.confidence as number,
        })),
        processing_time: result.processing_time ? 
          new Date(result.processing_time as string).getTime() : undefined,
      };
    } catch (error) {
      console.error('OCR extraction failed:', error);
      return { ocr_text: '', confidence_score: 0, document_type: 'diger' };
    }
  }, []);

  // Generate filename based on party and document type
  const generateFileName = useCallback((partyInfo: MatchedParty | undefined, documentType: string): string => {
    const name = partyInfo?.name || partyInfo?.party?.firstName || 'Bilinmeyen';
    const lastName = partyInfo?.party?.lastName || 'Hasta';
    
    const docType = documentType.replace(/\s+/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    return `${name}_${lastName}_${docType}_${timestamp}.pdf`;
  }, []);

  // Process all images
  const processImages = useCallback(async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setCurrentStep('processing');
    setProcessingProgress(0);

    const processedDocs: ProcessedDocument[] = [];
    const objectUrls: string[] = [];

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
        setProcessingProgress(baseProgress + 25);
        const edgeDetection = await detectAndCropDocument(compressedImage);

        // Step 3: Extract text with real OCR backend
        setProcessingProgress(baseProgress + 40);
        const ocrResult = await extractTextFromImage(image);

        // Step 4: Detect document type (combine backend + frontend classification)
        setProcessingProgress(baseProgress + 70);
        const backendType = ocrResult?.document_type;
        const frontendType = detectDocumentType(ocrResult?.ocr_text || '');
        const detectedType = (backendType && backendType !== 'diger') ? backendType : frontendType;
        
        // Step 5: Generate filename
        const fileName = generateFileName(ocrResult?.matched_party, detectedType);

        const objUrl = URL.createObjectURL(image);
        objectUrls.push(objUrl);

        const processedDoc: ProcessedDocument = {
          id: `doc_${Date.now()}_${i}`,
          originalImage: objUrl,
          processedImage: compressedImage,
          croppedImage: edgeDetection.croppedImage,
          ocrResult: ocrResult ? {
            ...ocrResult,
            document_type: detectedType
          } : undefined,
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
        const objUrl = URL.createObjectURL(image);
        objectUrls.push(objUrl);
        processedDocs.push({
          id: `doc_${Date.now()}_${i}`,
          originalImage: objUrl,
          processedImage: objUrl,
          finalFileName: `error_${image.name}`
        });
      }
    }

    setDocuments(processedDocs);
    setProcessingProgress(100);
    setIsProcessing(false);
    setCurrentStep('review');

    // Cleanup object URLs when component unmounts
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
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
              finalFileName: generateFileName(doc.ocrResult?.matched_party, docType)
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
    if (doc.ocrResult?.ocr_text) {
      pdf.setFontSize(10);
      pdf.text('OCR Metni:', 20, 220);
      const splitText = pdf.splitTextToSize(doc.ocrResult.ocr_text, 160);
      pdf.text(splitText, 20, 230);
    }
    
    const blobUrl = pdf.output('bloburl');
    return typeof blobUrl === 'string' ? blobUrl : URL.createObjectURL(new Blob([pdf.output('blob')], { type: 'application/pdf' }));
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
        <p className="text-gray-600">
          {processingProgress < 40 
            ? 'Görüntüler sıkıştırılıyor ve kenarlar tespit ediliyor...'
            : processingProgress < 80
            ? 'OCR ile metin çıkarılıyor...'
            : 'Son işlemler yapılıyor...'}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>İlerleme ({Math.round(processingProgress)}%)</span>
          <span>{images.length} belge</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${processingProgress}%` }}
          />
        </div>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <div className={`flex items-center gap-2 ${processingProgress >= 10 ? 'text-green-600' : ''}`}>
          {processingProgress >= 25 ? <CheckCircle className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          <span>Görüntüler sıkıştırılıyor</span>
        </div>
        <div className={`flex items-center gap-2 ${processingProgress >= 25 ? 'text-green-600' : ''}`}>
          {processingProgress >= 40 ? <CheckCircle className="w-4 h-4" /> : <Scissors className="w-4 h-4" />}
          <span>Belge kenarları tespit ediliyor</span>
        </div>
        <div className={`flex items-center gap-2 ${processingProgress >= 70 ? 'text-green-600' : ''}`}>
          {processingProgress >= 70 ? <CheckCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          <span>Metin çıkarılıyor (OCR)</span>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    const selectedDoc = documents.find(d => d.id === selectedDocumentId);
    const errorCount = documents.filter(d => d.finalFileName?.startsWith('error_')).length;
    const successCount = documents.length - errorCount;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Belgeleri İnceleyin</h3>
            <p className="text-sm text-gray-500">
              {successCount} başarılı{errorCount > 0 ? `, ${errorCount} hatalı` : ''}
            </p>
          </div>
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
              <div className="border rounded-2xl overflow-hidden">
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
                  {selectedDoc.ocrResult.ocr_text && (
                    <div className="p-3 bg-gray-50 rounded-2xl">
                      <div className="text-sm font-medium mb-2">Tespit Edilen Metin:</div>
                      <div className="text-sm whitespace-pre-wrap">
                        {selectedDoc.ocrResult.ocr_text}
                      </div>
                      {selectedDoc.ocrResult.confidence_score !== undefined && (
                        <div className="text-xs text-gray-500 mt-2">
                          Güven: %{Math.round(selectedDoc.ocrResult.confidence_score * 100)}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedDoc.ocrResult.matched_party && (
                    <div className="p-3 bg-blue-50 rounded-2xl">
                      <div className="text-sm font-medium mb-2">Hasta Bilgileri:</div>
                      <div className="text-sm space-y-1">
                        <div>İsim: {selectedDoc.ocrResult.matched_party.name}</div>
                        <div>TC: {selectedDoc.ocrResult.matched_party.tcNumber}</div>
                        {selectedDoc.ocrResult.matched_party.match_details?.confidence !== undefined && (
                          <div className="text-xs text-gray-500">
                            Güven: %{Math.round(selectedDoc.ocrResult.matched_party.match_details.confidence * 100)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedDoc.ocrResult.document_type && (
                    <div className="p-3 bg-green-50 rounded-2xl">
                      <div className="text-sm font-medium mb-2">Belge Türü:</div>
                      <div className="text-sm">
                        {selectedDoc.ocrResult.document_type}
                        {selectedDoc.ocrResult.confidence_score !== undefined && (
                          <div className="text-xs text-gray-500">
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
                  {selectedDoc.selectedDocumentType || selectedDoc.ocrResult?.document_type || 'Belge Türü Seç'}
                </Button>
              </div>

              {/* File Name Preview */}
              {selectedDoc.finalFileName && (
                <div className="p-3 bg-gray-50 rounded-2xl">
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
        currentType={selectedDocumentId ? documents.find(d => d.id === selectedDocumentId)?.ocrResult?.document_type : undefined}
      />
    </>
  );
};

export default DocumentProcessor;