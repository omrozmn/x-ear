import React from 'react';
import { Modal, Button } from '@x-ear/ui-web';
import { FileText, Download, Eye } from 'lucide-react';

interface ProcessingResult {
  fileName: string;
  status: 'processed' | 'error';
  result?: {
    matched_patient?: any;
    pdf_generated?: boolean;
    pdf_filename?: string;
    document_type?: string;
    entities?: any[];
  };
  error?: string;
}

interface DocumentPreviewProps {
  result: ProcessingResult;
  isOpen: boolean;
  onClose: () => void;
  onChangeDocumentType: () => void;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  result,
  isOpen,
  onClose,
  onChangeDocumentType,
}) => {
  if (!result.result) return null;

  const { result: data } = result;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Doküman Önizleme - ${result.fileName}`}>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {/* Document Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="text-sm font-medium text-gray-700">Doküman Türü</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm">{data.document_type || 'Belirlenemedi'}</span>
              <Button size="sm" variant="ghost" onClick={onChangeDocumentType}>
                Değiştir
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Hasta</label>
            <div className="text-sm mt-1">
              {data.matched_patient?.patient?.fullName || 'Hasta seçilmedi'}
            </div>
          </div>
        </div>

        {/* OCR Text Preview */}
        {data.entities && data.entities.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              OCR Metin Önizleme
            </label>
            <div className="bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                {data.entities.slice(0, 10).map((entity: any, idx: number) =>
                  entity.text ? `${entity.text} ` : ''
                ).join('').substring(0, 500)}...
              </div>
            </div>
          </div>
        )}

        {/* PDF Status */}
        {data.pdf_generated ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <FileText className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800">
              PDF oluşturuldu: {data.pdf_filename}
            </span>
            <Button size="sm" variant="outline">
              <Download className="w-4 h-4 mr-1" />
              İndir
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
            <Eye className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              PDF oluşturulamadı
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            Kapat
          </Button>
          <Button>
            Kaydet
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentPreview;