import React, { useState } from 'react';
import { Button } from '@x-ear/ui-web';
import BulkUploadModal from '../../components/sgk/BulkUploadModal';
import ProcessingResults from '../../components/sgk/ProcessingResults';

export const SGKPage: React.FC = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [processingResults, setProcessingResults] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUploadComplete = (results: any[]) => {
    setProcessingResults(results);
    setIsProcessing(false);
  };

  const handleStartProcessing = () => {
    setIsProcessing(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">SGK Doküman İşleme</h1>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          Toplu Görsel Yükle
        </Button>
      </div>

      {processingResults.length > 0 && (
        <ProcessingResults
          results={processingResults}
          isProcessing={isProcessing}
          onRetry={() => setIsUploadModalOpen(true)}
        />
      )}

      {!processingResults.length && !isProcessing && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            SGK reçeteleri, raporları ve diğer dokümanları işlemek için görselleri yükleyin
          </div>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            Görsel Yüklemeye Başla
          </Button>
        </div>
      )}

      <BulkUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadStart={handleStartProcessing}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
};

export default SGKPage;
