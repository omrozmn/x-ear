import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from '@x-ear/ui-web';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  Download, 
  RotateCw, 
  Move,
  FileText,
  Eye
} from 'lucide-react';
import { SGKDocument } from '../../types/sgk';

interface DocumentViewerProps {
  document: SGKDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (document: SGKDocument) => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  isOpen,
  onClose,
  onDownload
}) => {
  const { t: _t } = useTranslation('sgk');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPosition, setMagnifierPosition] = useState({ x: 0, y: 0 });
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const magnifierRef = useRef<HTMLDivElement>(null);

  // Reset view when document changes
  useEffect(() => {
    if (document) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsFullscreen(false);
    }
  }, [document]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Rotation control
  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)));
  }, []);

  // Drag functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  }, [zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }

    // Magnifier functionality
    if (showMagnifier && imageRef.current && magnifierRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMagnifierPosition({ x: e.clientX, y: e.clientY });
      
      // Update magnifier background position
      const magnifierSize = 150;
      const magnificationFactor = 2;
      const bgX = -x * magnificationFactor + magnifierSize / 2;
      const bgY = -y * magnificationFactor + magnifierSize / 2;
      
      magnifierRef.current.style.backgroundPosition = `${bgX}px ${bgY}px`;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, dragStart, showMagnifier]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Magnifier controls
  const handleMouseEnter = useCallback(() => {
    if (document?.fileUrl && zoom === 1) {
      setShowMagnifier(true);
    }
  }, [document, zoom]);

  const handleMouseLeave = useCallback(() => {
    setShowMagnifier(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          handleZoomReset();
          break;
        case 'r':
          e.preventDefault();
          handleRotate();
          break;
        case 'f':
          e.preventDefault();
          handleFullscreenToggle();
          break;
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, handleZoomIn, handleZoomOut, handleZoomReset, handleRotate, handleFullscreenToggle, onClose]);

  const handleDownloadClick = useCallback(() => {
    if (document && onDownload) {
      onDownload(document);
    }
  }, [document, onDownload]);

  if (!document) return null;

  const isImage = document.fileUrl && (
    document.fileUrl.includes('image') || 
    document.filename.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
  );

  const isPDF = document.fileUrl && (
    document.fileUrl.includes('pdf') || 
    document.filename.match(/\.pdf$/i)
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title=""
      closable={false}
      className={`${isFullscreen ? 'fixed inset-0 z-50 bg-black w-full h-full max-w-none' : 'max-w-7xl w-[95vw]'}`}
    >
      <div className={`flex flex-col ${isFullscreen ? 'h-screen w-full' : 'h-[95vh]'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted flex-shrink-0 w-full">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="flex-shrink-0 h-8 w-8">
              <div className="h-8 w-8 bg-primary/10 rounded-2xl flex items-center justify-center">
                {isPDF ? (
                  <FileText className="h-4 w-4 text-primary" />
                ) : (
                  <Eye className="h-4 w-4 text-primary" />
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {document.filename}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {document.documentType} • {document.fileSize ? `${Math.round(document.fileSize / 1024)} KB` : 'Boyut bilinmiyor'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {isImage && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.1}
                  title="Uzaklaştır (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                
                <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 5}
                  title="Yakınlaştır (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomReset}
                  title="Sıfırla (0)"
                >
                  <Move className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRotate}
                  title="Döndür (R)"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleFullscreenToggle}
              title="Tam Ekran (F)"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>

            {onDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadClick}
                title="İndir"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-hidden bg-muted relative w-full"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {isImage && document.fileUrl ? (
            <div 
              className="w-full h-full flex items-center justify-center relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onMouseMove={handleMouseMove}
            >
              <img
                ref={imageRef}
                src={document.fileUrl}
                alt={document.filename}
                className={`max-w-none transition-transform duration-200 ${isDragging ? 'cursor-grabbing' : zoom > 1 ? 'cursor-grab' : 'cursor-zoom-in'}`}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                  transformOrigin: 'center center'
                }}
                draggable={false}
                onClick={zoom === 1 ? handleZoomIn : undefined}
              />

              {/* Magnifier */}
              {showMagnifier && document.fileUrl && (
                <div
                  ref={magnifierRef}
                  className="fixed pointer-events-none z-50 border-2 border-blue-500 rounded-full shadow-lg"
                  style={{
                    left: magnifierPosition.x - 75,
                    top: magnifierPosition.y - 75,
                    width: 150,
                    height: 150,
                    backgroundImage: `url(${document.fileUrl})`,
                    backgroundSize: `${(imageRef.current?.naturalWidth || 0) * 2}px ${(imageRef.current?.naturalHeight || 0) * 2}px`,
                    backgroundRepeat: 'no-repeat'
                  }}
                />
              )}
            </div>
          ) : isPDF && document.fileUrl ? (
            <iframe
              src={document.fileUrl}
              className="w-full h-full border-none"
              title={document.filename}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Önizleme mevcut değil</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Bu dosya türü için önizleme desteklenmiyor
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with shortcuts */}
        <div className="px-4 py-2 bg-muted border-t text-xs text-muted-foreground flex-shrink-0 w-full">
          <div className="flex items-center justify-between">
            <div>
              {isImage && (
                <span>
                  Kısayollar: + Yakınlaştır, - Uzaklaştır, 0 Sıfırla, R Döndür, F Tam Ekran
                </span>
              )}
            </div>
            <div>
              {document.extractedInfo?.confidence && (
                <span>OCR Güven: {Math.round(document.extractedInfo.confidence * 100)}%</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentViewer;