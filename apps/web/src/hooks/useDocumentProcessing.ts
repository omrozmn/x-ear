import { useState, useCallback } from 'react';
import { type ProcessingResult, type MatchedParty } from '../components/sgk/DocumentPreview';
import { uploadOcrDocument } from '@/api/client/ocr.client';
import { normalizeTurkishChars } from '../utils/stringUtils';

export interface ProcessedDocument {
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
  selectedParty?: import('../types/party').Party;
  selectedDocumentType?: string;
  finalFileName?: string;
  pdfData?: string;
}

/** Compress image to optimal dimensions for OCR processing */
const compressImage = async (file: File, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
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
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.filter = 'contrast(1.1) brightness(1.05)';
          ctx.drawImage(img, 0, 0, width, height);
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
};

/** Detect document edges and crop using canvas-based pixel analysis */
const detectAndCropDocument = async (
  imageData: string
): Promise<{ croppedImage: string; corners: Array<{ x: number; y: number }>; confidence: number }> => {
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

      const threshold = 200;
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      const totalPixels = canvas.width * canvas.height;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

          if (gray < threshold) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      const margin = Math.min(canvas.width, canvas.height) * 0.02;
      minX = Math.max(0, minX - margin);
      minY = Math.max(0, minY - margin);
      maxX = Math.min(canvas.width, maxX + margin);
      maxY = Math.min(canvas.height, maxY + margin);

      const docWidth = maxX - minX;
      const docHeight = maxY - minY;
      const areaRatio = (docWidth * docHeight) / totalPixels;
      const hasDocument = areaRatio > 0.1 && areaRatio < 0.98;
      const confidence = hasDocument ? Math.min(0.95, 0.5 + areaRatio * 0.5) : 0.3;

      const corners = [
        { x: Math.round(minX), y: Math.round(minY) },
        { x: Math.round(maxX), y: Math.round(minY) },
        { x: Math.round(maxX), y: Math.round(maxY) },
        { x: Math.round(minX), y: Math.round(maxY) },
      ];

      if (hasDocument && docWidth > 100 && docHeight > 100) {
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');
        if (cropCtx) {
          cropCanvas.width = docWidth;
          cropCanvas.height = docHeight;
          cropCtx.drawImage(canvas, minX, minY, docWidth, docHeight, 0, 0, docWidth, docHeight);
          resolve({ croppedImage: cropCanvas.toDataURL('image/jpeg', 0.85), corners, confidence });
          return;
        }
      }

      resolve({ croppedImage: imageData, corners, confidence });
    };
    img.onerror = () => {
      resolve({ croppedImage: imageData, corners: [], confidence: 0 });
    };
    img.src = imageData;
  });
};

/** Detect document type via weighted keyword scoring with Turkish normalization */
const detectDocumentType = (text: string): string => {
  const keywords: Record<string, string[]> = {
    sgk_reçete: ['reçete', 'recete', 'ilaç', 'ilac', 'eczane', 'sgk', 'sosyal güvenlik', 'sosyal guvenlik', 'prescription', 'medicine', 'medula'],
    sgk_rapor: ['rapor', 'doktor', 'hekim', 'muayene', 'tanı', 'tani', 'report', 'diagnosis', 'bulgular', 'tedavi'],
    odyometri: ['odyometri', 'işitme', 'isitme', 'audiometry', 'hearing', 'kulak', 'ear', 'odyogram', 'audiogram', 'db', 'hz', 'frekans'],
    garanti_belgesi: ['garanti', 'warranty', 'cihaz', 'device', 'serial', 'seri no', 'seri numarası'],
    fatura: ['fatura', 'invoice', 'kdv', 'matrah', 'tutar', 'toplam', 'vergi', 'vkn', 'tckn'],
    diger: [],
  };

  const scores: Record<string, number> = {};
  const normalizedText = normalizeTurkishChars(text).toLowerCase();
  const lowerText = text.toLowerCase();

  Object.entries(keywords).forEach(([type, words]) => {
    scores[type] = 0;
    words.forEach((keyword) => {
      const normalizedKeyword = normalizeTurkishChars(keyword).toLowerCase();
      const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchesOriginal = (lowerText.match(new RegExp(escape(keyword), 'g')) || []).length;
      const matchesNormalized = (normalizedText.match(new RegExp(escape(normalizedKeyword), 'g')) || []).length;
      const matches = Math.max(matchesOriginal, matchesNormalized);
      scores[type] += matches * (keyword.length > 5 ? 2 : 1);
    });
  });

  const maxScore = Math.max(...Object.values(scores));
  const detectedType = Object.entries(scores).find(([, score]) => score === maxScore)?.[0];
  return maxScore >= 3 ? detectedType! : 'diger';
};

/** Extract text from image via backend OCR API */
const extractTextFromImage = async (
  imageFile: File,
  _docType?: string
): Promise<ProcessingResult['result']> => {
  try {
    const response = await uploadOcrDocument(
      { file: imageFile },
      { doc_type: _docType, auto_crop: true }
    );

    const envelope = response as unknown as { success?: boolean; data?: { result?: Record<string, unknown> } };
    const result = envelope?.data?.result as Record<string, unknown> | undefined;
    if (!result) {
      return { ocr_text: '', confidence_score: 0, document_type: 'diger' };
    }

    const entities = (result.entities || result.custom_entities || []) as Array<Record<string, unknown>>;
    const classification = (result.classification || {}) as Record<string, unknown>;
    const patientInfo = (result.patient_info || {}) as Record<string, unknown>;
    const medicalTerms = (result.medical_terms || []) as Array<Record<string, unknown>>;

    const ocrText = entities
      .map((e) => (e.text as string) || '')
      .filter(Boolean)
      .join('\n') || (result.ocr_text as string) || '';

    const confidences = entities.map((e) => (e.confidence as number) || 0).filter((c) => c > 0);
    const avgConfidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

    const matchedParty: MatchedParty | undefined = patientInfo.name
      ? {
          name: patientInfo.name as string,
          tcNumber: (patientInfo.tc_number as string) ||
            (entities.find((e) => e.label === 'TC_NUMBER')?.text as string),
          match_details: {
            confidence: (patientInfo.confidence as number) || avgConfidence,
            source: 'ocr',
            medical_terms: medicalTerms.map((t) => t.term as string),
          },
        }
      : undefined;

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
      processing_time: result.processing_time
        ? new Date(result.processing_time as string).getTime()
        : undefined,
    };
  } catch (error) {
    console.error('OCR extraction failed:', error);
    return { ocr_text: '', confidence_score: 0, document_type: 'diger' };
  }
};

/** Generate filename based on party and document type */
export const generateFileName = (partyInfo: MatchedParty | undefined, documentType: string): string => {
  const name = partyInfo?.name || partyInfo?.party?.firstName || 'Bilinmeyen';
  const lastName = partyInfo?.party?.lastName || 'Hasta';
  const docType = documentType.replace(/\s+/g, '_');
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${name}_${lastName}_${docType}_${timestamp}.pdf`;
};

export function useDocumentProcessing(images: File[]) {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [currentStep, setCurrentStep] = useState<'processing' | 'review' | 'complete' | 'generating'>('processing');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const processImages = useCallback(async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setCurrentStep('processing');
    setProcessingProgress(0);

    const processedDocs: ProcessedDocument[] = [];
    const objectUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const baseProgress = (i / images.length) * 100;
      setProcessingProgress(baseProgress);

      try {
        setProcessingProgress(baseProgress + 10);
        const compressedImage = await compressImage(image);

        setProcessingProgress(baseProgress + 25);
        const edgeDetection = await detectAndCropDocument(compressedImage);

        setProcessingProgress(baseProgress + 40);
        const ocrResult = await extractTextFromImage(image);

        setProcessingProgress(baseProgress + 70);
        const backendType = ocrResult?.document_type;
        const frontendType = detectDocumentType(ocrResult?.ocr_text || '');
        const detectedType = backendType && backendType !== 'diger' ? backendType : frontendType;

        const fileName = generateFileName(ocrResult?.matched_party, detectedType);
        const objUrl = URL.createObjectURL(image);
        objectUrls.push(objUrl);

        processedDocs.push({
          id: `doc_${Date.now()}_${i}`,
          originalImage: objUrl,
          processedImage: compressedImage,
          croppedImage: edgeDetection.croppedImage,
          ocrResult: ocrResult ? { ...ocrResult, document_type: detectedType } : undefined,
          edgeDetection: { corners: edgeDetection.corners, confidence: edgeDetection.confidence, applied: true },
          finalFileName: fileName,
        });

        setProcessingProgress(baseProgress + 90);
      } catch (error) {
        console.error('Error processing image:', error);
        const objUrl = URL.createObjectURL(image);
        objectUrls.push(objUrl);
        processedDocs.push({
          id: `doc_${Date.now()}_${i}`,
          originalImage: objUrl,
          processedImage: objUrl,
          finalFileName: `error_${image.name}`,
        });
      }
    }

    setDocuments(processedDocs);
    setProcessingProgress(100);
    setIsProcessing(false);
    setCurrentStep('review');

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  return {
    documents,
    setDocuments,
    processImages,
    processingProgress,
    currentStep,
    isProcessing,
    setCurrentStep,
  };
}
