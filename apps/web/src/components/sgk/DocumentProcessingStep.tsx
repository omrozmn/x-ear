import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Scissors, Zap, CheckCircle } from 'lucide-react';

interface DocumentProcessingStepProps {
  processingProgress: number;
  imageCount: number;
}

const DocumentProcessingStep: React.FC<DocumentProcessingStepProps> = ({
  processingProgress,
  imageCount,
}) => {
  const { t: _t } = useTranslation('sgk');
  const statusText =
    processingProgress < 40
      ? 'Görüntüler sıkıştırılıyor ve kenarlar tespit ediliyor...'
      : processingProgress < 80
        ? 'OCR ile metin çıkarılıyor...'
        : 'Son işlemler yapılıyor...';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Belgeler İşleniyor</h3>
        <p className="text-muted-foreground">{statusText}</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>İlerleme ({Math.round(processingProgress)}%)</span>
          <span>{imageCount} belge</span>
        </div>
        <div className="w-full bg-accent rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${processingProgress}%` }}
          />
        </div>
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        <div className={`flex items-center gap-2 ${processingProgress >= 10 ? 'text-success' : ''}`}>
          {processingProgress >= 25 ? <CheckCircle className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          <span>Görüntüler sıkıştırılıyor</span>
        </div>
        <div className={`flex items-center gap-2 ${processingProgress >= 25 ? 'text-success' : ''}`}>
          {processingProgress >= 40 ? <CheckCircle className="w-4 h-4" /> : <Scissors className="w-4 h-4" />}
          <span>Belge kenarları tespit ediliyor</span>
        </div>
        <div className={`flex items-center gap-2 ${processingProgress >= 70 ? 'text-success' : ''}`}>
          {processingProgress >= 70 ? <CheckCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          <span>Metin çıkarılıyor (OCR)</span>
        </div>
      </div>
    </div>
  );
};

export default DocumentProcessingStep;
