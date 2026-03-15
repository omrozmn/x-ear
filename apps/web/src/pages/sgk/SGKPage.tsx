import React, { useState, useCallback } from 'react';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@x-ear/ui-web';
import { Camera, Upload } from 'lucide-react';
import BulkUploadModal from '../../components/sgk/BulkUploadModal';
import ProcessingResults from '../../components/sgk/ProcessingResults';
import CameraCapture from '../../components/sgk/CameraCapture';
import DocumentProcessor from '../../components/sgk/DocumentProcessor';

interface ProcessingResult {
  fileName: string;
  status: 'processed' | 'error';
  result?: {
    matched_party?: Record<string, unknown>;
    pdf_generated?: boolean;
    pdf_filename?: string;
    document_type?: string;
    entities?: Array<Record<string, unknown>>;
  };
  error?: string;
}

export const SGKPage: React.FC = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCameraCaptureOpen, setIsCameraCaptureOpen] = useState(false);
  const [isDocumentProcessorOpen, setIsDocumentProcessorOpen] = useState(false);
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<File[]>([]);

  const handleStartProcessing = () => {
    setIsProcessing(true);
  };

  const handleCameraCapture = useCallback((images: File[]) => {
    setCapturedImages(images);
    setIsCameraCaptureOpen(false);
    setIsDocumentProcessorOpen(true);
  }, []);

  // BulkUploadModal completes → feed results into DocumentProcessor for OCR
  const handleBulkUploadComplete = useCallback((results: Array<{ success: boolean; filename: string; error?: string }>) => {
    setIsUploadModalOpen(false);
    setIsProcessing(false);

    // Show any upload results that completed (files already uploaded by BulkUploadModal)
    const mapped: ProcessingResult[] = results.map(r => ({
      fileName: r.filename,
      status: r.success ? 'processed' as const : 'error' as const,
      error: r.error,
    }));

    if (mapped.length > 0) {
      setProcessingResults(prev => [...prev, ...mapped]);
    }
  }, []);

  // File input for directly feeding files to DocumentProcessor (bypassing BulkUploadModal)
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setCapturedImages(files);
      setIsDocumentProcessorOpen(true);
    }
    // Reset input
    e.target.value = '';
  }, []);

  const handleDocumentProcessingComplete = useCallback((results: unknown) => {
    const typedResults = results as ProcessingResult[];
    setProcessingResults(prev => [...prev, ...typedResults]);
    setIsDocumentProcessorOpen(false);
    setCapturedImages([]);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">SGK Doküman İşleme</h1>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsCameraCaptureOpen(true)}
            className="flex items-center gap-2"
          >
            <Camera size={16} />
            Kamera ile Çek
          </Button>
          <label className="cursor-pointer">
            <input
              data-allow-raw="true"
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors cursor-pointer">
              <Upload size={16} />
              Dosya Yükle
            </span>
          </label>
        </div>
      </div>

      <Tabs defaultValue="results" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800">
          <TabsTrigger value="results" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 dark:text-gray-200">İşleme Sonuçları</TabsTrigger>
          <TabsTrigger value="upload" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 dark:text-gray-200">Yeni Yükleme</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-6">
          {processingResults.length > 0 ? (
            <ProcessingResults
              results={processingResults}
              isProcessing={isProcessing}
              onRetry={() => setIsCameraCaptureOpen(true)}
            />
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                Henüz işlenmiş doküman bulunmuyor
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setIsCameraCaptureOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Camera size={16} />
                  Kamera ile Başla
                </Button>
                <label className="cursor-pointer">
                  <input
                    data-allow-raw="true"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors cursor-pointer">
                    <Upload size={16} />
                    Dosya Yükle
                  </span>
                </label>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors dark:bg-gray-800">
              <Camera size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <h3 className="text-lg font-medium mb-2 dark:text-white">Kamera ile Çekim</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Kamera ile arka arkaya fotoğraf çekerek belgeleri yükleyin
              </p>
              <Button
                onClick={() => setIsCameraCaptureOpen(true)}
                className="w-full"
              >
                Kamerayı Aç
              </Button>
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors dark:bg-gray-800">
              <Upload size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <h3 className="text-lg font-medium mb-2 dark:text-white">Toplu Dosya Yükleme</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Birden fazla belgeyi sürükle-bırak ile toplu yükleyin
              </p>
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                className="w-full"
              >
                Toplu Yükle
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={isCameraCaptureOpen}
        onClose={() => setIsCameraCaptureOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Bulk Upload Modal (for batch uploads without OCR processing) */}
      <BulkUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadStart={handleStartProcessing}
        onUploadComplete={handleBulkUploadComplete}
      />

      {/* Document Processor Modal (OCR + party matching) */}
      <DocumentProcessor
        isOpen={isDocumentProcessorOpen}
        onClose={() => setIsDocumentProcessorOpen(false)}
        images={capturedImages}
        onProcessingComplete={handleDocumentProcessingComplete}
      />
    </div>
  );
};

export default SGKPage;
