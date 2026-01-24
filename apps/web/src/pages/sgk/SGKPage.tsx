import React, { useState } from 'react';
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
    matched_party?: any;
    pdf_generated?: boolean;
    pdf_filename?: string;
    document_type?: string;
    entities?: any[];
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleUploadComplete = (results: unknown) => {
    setProcessingResults(results as ProcessingResult[]);
    setIsProcessing(false);
  };

  const handleStartProcessing = () => {
    setIsProcessing(true);
  };

  const handleCameraCapture = (images: File[]) => {
    setCapturedImages(images);
    setIsCameraCaptureOpen(false);
    setIsDocumentProcessorOpen(true);
  };

  const _handleFileUpload = (files: File[]) => {
    setUploadedFiles(files);
    setIsDocumentProcessorOpen(true);
  };

  const handleDocumentProcessingComplete = (results: unknown) => {
    setProcessingResults(results as ProcessingResult[]);
    setIsDocumentProcessorOpen(false);
    setCapturedImages([]);
    setUploadedFiles([]);
  };

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
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 dark:text-gray-200"
          >
            <Upload size={16} />
            Dosya Yükle
          </Button>
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
              onRetry={() => setIsUploadModalOpen(true)}
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
                <Button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Upload size={16} />
                  Dosya Yükle
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors dark:bg-gray-800">
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

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors dark:bg-gray-800">
              <Upload size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <h3 className="text-lg font-medium mb-2 dark:text-white">Dosya Yükleme</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Bilgisayarınızdan görsel dosyalarını seçerek yükleyin
              </p>
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                className="w-full"
              >
                Dosya Seç
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

      {/* File Upload Modal */}
      <BulkUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadStart={handleStartProcessing}
        onUploadComplete={handleUploadComplete}
      />

      {/* Document Processor Modal */}
      <DocumentProcessor
        isOpen={isDocumentProcessorOpen}
        onClose={() => setIsDocumentProcessorOpen(false)}
        images={capturedImages.length > 0 ? capturedImages : uploadedFiles}
        onProcessingComplete={handleDocumentProcessingComplete}
      />
    </div>
  );
};

export default SGKPage;
