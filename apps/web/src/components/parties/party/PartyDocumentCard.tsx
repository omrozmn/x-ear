import React from 'react';
import { PartyDocument } from '../../../hooks/party/usePartyDocuments';
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

interface PartyDocumentCardProps {
  document: PartyDocument;
  onDocumentClick?: (document: PartyDocument) => void;
  onDownloadClick?: (document: PartyDocument) => void;
}

export const PartyDocumentCard: React.FC<PartyDocumentCardProps> = ({
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
        return 'bg-destructive/10 text-red-800';
      case 'prescription':
        return 'bg-primary/10 text-blue-800';
      case 'test_result':
        return 'bg-success/10 text-success';
      case 'invoice':
        return 'bg-warning/10 text-yellow-800';
      case 'consent':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-muted text-foreground';
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
        return 'bg-success/10 text-success';
      case 'processing':
        return 'bg-warning/10 text-yellow-800';
      case 'failed':
        return 'bg-destructive/10 text-red-800';
      default:
        return 'bg-muted text-foreground';
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
      className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow"
      role="article"
      aria-label={`Belge: ${document.title}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className="text-primary mr-3">
            {getDocumentIcon(document.mimeType)}
          </div>
          <div className="min-w-0 flex-1">
            <h4
              className="text-sm font-medium text-foreground truncate cursor-pointer hover:text-primary"
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
            <p className="text-xs text-muted-foreground truncate">
              {document.originalName || document.fileName}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={() => onDownloadClick?.(document)}
            variant="ghost"
            className="p-1 text-muted-foreground hover:text-primary transition-colors"
            aria-label={`${document.title} dosyasını indir`}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {document.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {document.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDocumentTypeColor(document.documentType)}`}>
            {getDocumentTypeText(document.documentType)}
          </span>
          {document.status && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
              {getStatusText(document.status)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="w-3 h-3 mr-1" aria-hidden="true" />
            {formatDate(document.uploadDate)}
          </div>
          {document.fileSize && (
            <span>{formatFileSize(document.fileSize)}</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {document.createdBy && (
            <div className="flex items-center">
              <User className="w-3 h-3 mr-1" aria-hidden="true" />
              {document.createdBy}
            </div>
          )}
          {document.mimeType && (
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              {document.mimeType}
            </span>
          )}
        </div>

        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {document.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-muted text-foreground"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
            {document.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{document.tags.length - 3} daha
              </span>
            )}
          </div>
        )}

        {document.metadata && Object.keys(document.metadata).length > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Ek bilgiler:</p>
            <div className="text-xs text-muted-foreground">
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