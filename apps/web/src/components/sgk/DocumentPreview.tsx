import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Input } from '@x-ear/ui-web';
import { 
  FileText, 
  Download, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Search,
  User,
  Calendar,
  FileType,
  Hash,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface ProcessingResult {
  fileName: string;
  status: 'processed' | 'error';
  result?: {
    matched_party?: any;
    pdf_generated?: boolean;
    pdf_filename?: string;
    document_type?: string;
    entities?: any[];
    confidence_score?: number;
    processing_time?: number;
    file_size?: number;
    dimensions?: { width: number; height: number };
    created_at?: string;
    ocr_text?: string;
    image_url?: string;
  };
  error?: string;
}

interface DocumentPreviewProps {
  result: ProcessingResult;
  isOpen: boolean;
  onClose: () => void;
  onChangeDocumentType: () => void;
  onSave?: () => void;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  result,
  isOpen,
  onClose,
  onChangeDocumentType,
  onSave,
}) => {
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [showFullOCR, setShowFullOCR] = useState(false);
  const [_highlightedText, setHighlightedText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const data = result.result;

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setImageZoom(1);
      setImageRotation(0);
      setShowFullOCR(false);
      setHighlightedText('');
      setSearchTerm('');
    }
  }, [isOpen]);

  // Early return after hooks
  if (!data) return null;

  // Handle zoom controls
  const handleZoomIn = () => setImageZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setImageZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setImageRotation(prev => (prev + 90) % 360);
  const handleResetView = () => {
    setImageZoom(1);
    setImageRotation(0);
  };

  // Handle OCR text highlighting
  const highlightOCRText = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  };

  // Get full OCR text
  const getFullOCRText = () => {
    if (data.ocr_text) return data.ocr_text;
    
    if (data.entities && data.entities.length > 0) {
      return data.entities
        .map((entity: any) => entity.text || '')
        .filter(text => text.trim())
        .join(' ');
    }
    
    return '';
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Bilinmiyor';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Format confidence score
  const getConfidenceColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const fullOCRText = getFullOCRText();

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Doküman Önizleme - ${result.fileName}`}
      size="xl"
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Enhanced Document Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Document Type */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <FileType className="w-4 h-4 text-blue-600" />
              <label className="text-sm font-medium text-blue-900">Doküman Türü</label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-blue-800">
                {data.document_type || 'Belirlenemedi'}
              </span>
              <Button size="sm" variant="ghost" onClick={onChangeDocumentType}>
                Değiştir
              </Button>
            </div>
          </div>

          {/* Party Info */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-green-600" />
              <label className="text-sm font-medium text-green-900">Hasta Bilgisi</label>
            </div>
            <div className="text-sm font-semibold text-green-800">
              {data.matched_party?.party?.fullName || 'Hasta seçilmedi'}
            </div>
            {data.matched_party?.party?.tcNo && (
              <div className="text-xs text-green-600 mt-1">
                TC: {data.matched_party.party.tcNo}
              </div>
            )}
          </div>

          {/* Processing Info */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-purple-600" />
              <label className="text-sm font-medium text-purple-900">İşlem Bilgisi</label>
            </div>
            {data.confidence_score && (
              <div className="text-sm mb-1">
                <span className="text-purple-700">Güven: </span>
                <span className={`font-semibold ${getConfidenceColor(data.confidence_score)}`}>
                  {(data.confidence_score * 100).toFixed(1)}%
                </span>
              </div>
            )}
            {data.processing_time && (
              <div className="text-xs text-purple-600">
                İşlem süresi: {data.processing_time}ms
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Image Preview with Controls */}
        {data.image_url && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Belge Önizleme</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleZoomOut}
                  disabled={imageZoom <= 0.5}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600 min-w-[60px] text-center">
                  {Math.round(imageZoom * 100)}%
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleZoomIn}
                  disabled={imageZoom >= 3}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRotate}
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetView}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div 
              ref={containerRef}
              className="border rounded-lg overflow-auto bg-gray-50 max-h-96 flex items-center justify-center"
            >
              <img
                ref={imageRef}
                src={data.image_url}
                alt={result.fileName}
                className="transition-transform duration-200 cursor-grab active:cursor-grabbing"
                style={{
                  transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                  maxWidth: imageZoom <= 1 ? '100%' : 'none',
                  maxHeight: imageZoom <= 1 ? '100%' : 'none',
                }}
                draggable={false}
              />
            </div>
            
            {/* Image metadata */}
            {data.dimensions && (
              <div className="text-xs text-gray-500 text-center">
                Boyutlar: {data.dimensions.width} × {data.dimensions.height} px
                {data.file_size && ` • Dosya boyutu: ${formatFileSize(data.file_size)}`}
              </div>
            )}
          </div>
        )}

        {/* Enhanced OCR Text Section */}
        {fullOCRText && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">OCR Metin Analizi</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Metinde ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowFullOCR(!showFullOCR)}
                >
                  {showFullOCR ? 'Kısalt' : 'Tümünü Göster'}
                </Button>
              </div>
            </div>
            
            <div className="bg-gray-50 border rounded-lg">
              <div className="p-4">
                <div 
                  className={`text-sm text-gray-800 whitespace-pre-wrap leading-relaxed ${
                    showFullOCR ? 'max-h-64 overflow-y-auto' : 'max-h-32 overflow-hidden'
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: highlightOCRText(
                      showFullOCR ? fullOCRText : fullOCRText.substring(0, 500) + (fullOCRText.length > 500 ? '...' : ''),
                      searchTerm
                    )
                  }}
                />
              </div>
              
              {/* OCR Statistics */}
              <div className="px-4 py-2 bg-gray-100 border-t text-xs text-gray-600 flex items-center justify-between">
                <span>Toplam karakter: {fullOCRText.length}</span>
                <span>Kelime sayısı: {fullOCRText.split(/\s+/).filter(word => word.length > 0).length}</span>
                {searchTerm && (
                  <span>
                    Arama sonucu: {(fullOCRText.match(new RegExp(searchTerm, 'gi')) || []).length} eşleşme
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced PDF Status */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">PDF Durumu</h3>
          
          {data.pdf_generated ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-green-800">
                  PDF başarıyla oluşturuldu
                </div>
                <div className="text-xs text-green-600 mt-1">
                  Dosya: {data.pdf_filename}
                </div>
              </div>
              <Button size="sm" variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                İndir
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-yellow-800">
                  PDF oluşturulamadı
                </div>
                <div className="text-xs text-yellow-600 mt-1">
                  Belge işleme sırasında bir sorun oluştu
                </div>
              </div>
              <Button size="sm" variant="outline" className="text-yellow-700 border-yellow-300">
                Tekrar Dene
              </Button>
            </div>
          )}
        </div>

        {/* Document Metadata */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Belge Detayları</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Oluşturulma:</span>
              <span className="font-medium">
                {data.created_at ? new Date(data.created_at).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Dosya adı:</span>
              <span className="font-medium truncate">{result.fileName}</span>
            </div>
          </div>
        </div>

        {/* Enhanced Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              İptal
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {data.pdf_generated && (
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                PDF İndir
              </Button>
            )}
            <Button onClick={onSave || onClose} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Kaydet ve Devam
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentPreview;