import React from 'react';
import { Button } from '@x-ear/ui-web';
import { FileCheck, Send, Timer, ExternalLink } from 'lucide-react';

interface SGKOperationsSectionProps {
  onGenerateSGKReport: () => void;
  onSendToSGK: () => void;
  onCheckSGKDeadlines: () => void;
  onExportSGKData: () => void;
}

export const SGKOperationsSection: React.FC<SGKOperationsSectionProps> = ({
  onGenerateSGKReport,
  onSendToSGK,
  onCheckSGKDeadlines,
  onExportSGKData
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">SGK İşlemleri</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button onClick={onGenerateSGKReport} variant="outline" className="flex items-center justify-center">
          <FileCheck className="w-4 h-4 mr-2" />
          Rapor Oluştur
        </Button>
        <Button onClick={onSendToSGK} variant="outline" className="flex items-center justify-center">
          <Send className="w-4 h-4 mr-2" />
          SGK'ya Gönder
        </Button>
        <Button onClick={onCheckSGKDeadlines} variant="outline" className="flex items-center justify-center">
          <Timer className="w-4 h-4 mr-2" />
          Süre Kontrol
        </Button>
        <Button onClick={onExportSGKData} variant="outline" className="flex items-center justify-center">
          <ExternalLink className="w-4 h-4 mr-2" />
          Veri Dışa Aktar
        </Button>
      </div>
    </div>
  );
};