import React from 'react';
import { PatientDocument } from '../../hooks/patient/usePatientDocuments';
import {
  FileText,
  File,
  Download,
  Calendar,
  User,
  Tag,
  FileImage,
  FileVideo,
  FileAudio,
  Archive
} from 'lucide-react';
import { Button } from '@x-ear/ui-web';

interface PatientDocumentCardProps {
  document: PatientDocument;
  onDocumentClick?: (document: PatientDocument) => void;
  onDownloadClick?: (document: PatientDocument) => void;
}

export const PatientDocumentCard: React.FC<PatientDocumentCardProps> = ({
  document,
  onDocumentClick,
  onDownloadClick
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getDocumentIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="w-5 h-5" />;

    if (mimeType.startsWith('image/')) return <FileImage className="w-5 h-5" />;
    if (mimeType.startsWith('video/')) return <FileVideo className="w-5 h-5" />;
    if (mimeType.startsWith('audio/')) return <FileAudio className="w-5 h-5" />;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText className="w-5 h-5" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive className="w-5 h-5" />;

    return <File className="w-5 h-5" />;
  };

  const getDocumentTypeColor = (documentType: string) => {
    switch (documentType) {
      case 'medical_record':
        return 'bg-red-100 text-red-800';
      case 'prescription':
        return 'bg-blue-100 text-blue-800';
      case 'test_result':
        return 'bg-green-100 text-green-800';
      case 'invoice':
        return 'bg-yellow-100 text-yellow-800';
      case 'consent':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentTypeText = (documentType: string) => {
    switch (documentType) {
      case 'medical_record':
        return 'Tıbbi Kayıt';
      case 'prescription':
        return 'Reçete';
      case 'test_result':
        return 'Test Sonucu';
      case 'invoice':
        return 'Fatura';
      case 'consent':
        return 'Onam Formu';
      default:
        return 'Diğer';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'processing':
        return 'İşleniyor';
      case 'failed':
        return 'Başarısız';
      default:
        return 'Bilinmiyor';
    }
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
      role="article"
      aria-label={`Belge: ${document.title}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className="text-blue-500 mr-3">
            {getDocumentIcon(document.mimeType)}
          </div>
          <div className="min-w-0 flex-1">
            <h4
              className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
              onClick={() => onDocumentClick?.(document)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDocumentClick?.(document);
                }
              }}
            >
              {document.title}
            </h4>
            <p className="text-xs text-gray-500 truncate">
              {document.originalName || document.fileName}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={() => onDownloadClick?.(document)}
            variant="ghost"
            className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
            aria-label={`${document.title} dosyasını indir`}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {document.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {document.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDocumentTypeColor(document.documentType)}`}>
            {getDocumentTypeText(document.documentType)}
          </span>
          {document.status && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
              {getStatusText(document.status)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" aria-hidden="true" />
            {formatDate(document.uploadDate)}
          </div>
          {document.fileSize && (
            <span>{formatFileSize(document.fileSize)}</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          {document.createdBy && (
            <div className="flex items-center">
              <User className="w-3 h-3 mr-1" aria-hidden="true" />
              {document.createdBy}
            </div>
          )}
          {document.mimeType && (
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
              {document.mimeType}
            </span>
          )}
        </div>

        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {document.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
            {document.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{document.tags.length - 3} daha
              </span>
            )}
          </div>
        )}

        {document.metadata && Object.keys(document.metadata).length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Ek bilgiler:</p>
            <div className="text-xs text-gray-600">
              {Object.entries(document.metadata).slice(0, 2).map(([key, value]) => (
                <div key={key} className="inline-block mr-3">
                  <span className="font-medium">{key}:</span> {String(value)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};