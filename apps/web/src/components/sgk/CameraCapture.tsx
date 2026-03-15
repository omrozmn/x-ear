import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Modal, Button } from '@x-ear/ui-web';
import { Camera, X, RotateCcw, Check, Zap, ZapOff, Focus } from 'lucide-react';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (images: File[]) => void;
  maxImages?: number;
}

interface CapturedImage {
  id: string;
  dataUrl: string;
  timestamp: number;
  processed: boolean;
  edgeConfidence: number;
}

interface DetectedEdge {
  corners: Array<{ x: number; y: number }>;
  confidence: number;
  isStable: boolean;
}

interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

const JPEG_QUALITY = 0.75;
const STABILITY_FRAMES = 8;
const EDGE_CHECK_INTERVAL = 300;
const AUTO_CAPTURE_CONFIDENCE = 0.7;

const CameraCapture: React.FC<CameraCaptureProps> = ({
  isOpen,
  onClose,
  onCapture,
  maxImages = 10,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const edgeCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stableFramesRef = useRef(0);

  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [detectedEdge, setDetectedEdge] = useState<DetectedEdge | null>(null);
  const [edgeStatus, setEdgeStatus] = useState<'searching' | 'detected' | 'stable' | 'captured'>('searching');

  // Canvas-based document edge detection
  const detectDocumentEdges = useCallback((): DetectedEdge | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0) return null;

    // Use smaller canvas for faster detection
    const scale = 0.25;
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const w = canvas.width;
    const h = canvas.height;

    // Simple edge detection: find document boundary by contrast with background
    const threshold = 180;
    let minX = w, minY = h, maxX = 0, maxY = 0;
    let edgePixelCount = 0;

    // Scan for non-white/non-uniform regions (document content)
    for (let y = Math.floor(h * 0.05); y < Math.floor(h * 0.95); y++) {
      for (let x = Math.floor(w * 0.05); x < Math.floor(w * 0.95); x++) {
        const i = (y * w + x) * 4;
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

        if (gray < threshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
          edgePixelCount++;
        }
      }
    }

    const docWidth = maxX - minX;
    const docHeight = maxY - minY;
    const areaRatio = (docWidth * docHeight) / (w * h);

    // Check if detected area looks like a document
    const isDocumentShaped = areaRatio > 0.15 && areaRatio < 0.92;
    const aspectOk = docWidth > 0 && docHeight > 0 && (docWidth / docHeight) > 0.3 && (docWidth / docHeight) < 3.0;
    const hasEnoughContent = edgePixelCount > (w * h * 0.02);

    if (!isDocumentShaped || !aspectOk || !hasEnoughContent) {
      return null;
    }

    // Scale corners back to full resolution
    const invScale = 1 / scale;
    const margin = Math.min(w, h) * 0.02;
    const corners = [
      { x: Math.round((minX - margin) * invScale), y: Math.round((minY - margin) * invScale) },
      { x: Math.round((maxX + margin) * invScale), y: Math.round((minY - margin) * invScale) },
      { x: Math.round((maxX + margin) * invScale), y: Math.round((maxY + margin) * invScale) },
      { x: Math.round((minX - margin) * invScale), y: Math.round((maxY + margin) * invScale) },
    ];

    const confidence = Math.min(0.95, 0.4 + areaRatio * 0.5 + (edgePixelCount / (w * h)) * 0.3);

    return {
      corners,
      confidence,
      isStable: false,
    };
  }, []);

  // Draw edge overlay on video
  const drawEdgeOverlay = useCallback((edge: DetectedEdge | null) => {
    if (!overlayCanvasRef.current || !videoRef.current) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth || canvas.clientWidth;
    canvas.height = videoRef.current.videoHeight || canvas.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!edge || edge.corners.length < 4) return;

    const scaleX = canvas.clientWidth / (videoRef.current.videoWidth || 1);
    const scaleY = canvas.clientHeight / (videoRef.current.videoHeight || 1);

    ctx.beginPath();
    const c = edge.corners;
    ctx.moveTo(c[0].x * scaleX, c[0].y * scaleY);
    for (let i = 1; i < c.length; i++) {
      ctx.lineTo(c[i].x * scaleX, c[i].y * scaleY);
    }
    ctx.closePath();

    const color = edge.isStable ? '#22c55e' : edge.confidence > 0.5 ? '#eab308' : '#ef4444';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw corner dots
    ctx.fillStyle = color;
    c.forEach(corner => {
      ctx.beginPath();
      ctx.arc(corner.x * scaleX, corner.y * scaleY, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  // Start edge detection loop
  const startEdgeDetection = useCallback(() => {
    if (edgeCheckRef.current) return;

    edgeCheckRef.current = setInterval(() => {
      const edge = detectDocumentEdges();

      if (edge) {
        stableFramesRef.current++;
        const isStable = stableFramesRef.current >= STABILITY_FRAMES;
        edge.isStable = isStable;
        setDetectedEdge(edge);
        setEdgeStatus(isStable ? 'stable' : 'detected');
        drawEdgeOverlay(edge);
      } else {
        stableFramesRef.current = 0;
        setDetectedEdge(null);
        setEdgeStatus('searching');
        drawEdgeOverlay(null);
      }
    }, EDGE_CHECK_INTERVAL);
  }, [detectDocumentEdges, drawEdgeOverlay]);

  // Stop edge detection
  const stopEdgeDetection = useCallback(() => {
    if (edgeCheckRef.current) {
      clearInterval(edgeCheckRef.current);
      edgeCheckRef.current = null;
    }
    stableFramesRef.current = 0;
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }

      // Check flash capability
      const videoTrack = stream.getVideoTracks()[0];
      try {
        const capabilities = videoTrack.getCapabilities() as ExtendedMediaTrackCapabilities;
        setHasFlash(!!capabilities.torch);
      } catch {
        setHasFlash(false);
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setError('Kameraya erişim sağlanamadı. Lütfen kamera izinlerini kontrol edin.');
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    stopEdgeDetection();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setDetectedEdge(null);
    setEdgeStatus('searching');
  }, [stopEdgeDetection]);

  // Toggle flash
  const toggleFlash = useCallback(async () => {
    if (!streamRef.current || !hasFlash) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: !flashEnabled } as MediaTrackConstraintSet & { torch: boolean }]
      });
      setFlashEnabled(!flashEnabled);
    } catch (err) {
      console.error('Flash toggle failed:', err);
    }
  }, [flashEnabled, hasFlash]);

  // Capture image with compression
  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture at full resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply slight contrast enhancement for OCR
    ctx.filter = 'contrast(1.05) brightness(1.02)';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    // Compress with lower quality for mobile bandwidth
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const confidence = detectedEdge?.confidence || 0;

    const newImage: CapturedImage = {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dataUrl,
      timestamp: Date.now(),
      processed: true,
      edgeConfidence: confidence,
    };

    setCapturedImages(prev => {
      if (prev.length >= maxImages) return prev;
      return [...prev, newImage];
    });
    setEdgeStatus('captured');
    stableFramesRef.current = 0;

    // Brief visual feedback then resume detection
    setTimeout(() => {
      setEdgeStatus('searching');
    }, 1500);
  }, [maxImages, detectedEdge]);

  // Auto-capture when document is stable
  const captureImageRef = useRef(captureImage);
  captureImageRef.current = captureImage;
  
  useEffect(() => {
    if (!autoCaptureEnabled || !isStreaming) return;
    if (edgeStatus !== 'stable' || !detectedEdge) return;
    if (capturedImages.length >= maxImages) return;
    if (detectedEdge.confidence < AUTO_CAPTURE_CONFIDENCE) return;

    captureImageRef.current();
  }, [edgeStatus, autoCaptureEnabled, isStreaming, detectedEdge, capturedImages.length, maxImages]);

  // Start edge detection when streaming begins
  useEffect(() => {
    if (isStreaming) {
      startEdgeDetection();
    }
    return () => stopEdgeDetection();
  }, [isStreaming, startEdgeDetection, stopEdgeDetection]);

  // Remove captured image and cleanup
  const removeImage = useCallback((imageId: string) => {
    setCapturedImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

  // Process and return captured images
  const processImages = useCallback(async () => {
    if (capturedImages.length === 0) return;

    setIsProcessing(true);
    try {
      const processedFiles = await Promise.all(
        capturedImages.map(async (img, index) => {
          const response = await fetch(img.dataUrl);
          const blob = await response.blob();
          return new File([blob], `belge-${index + 1}.jpg`, { type: 'image/jpeg' });
        })
      );

      onCapture(processedFiles);
      setCapturedImages([]);
      stopCamera();
      onClose();
    } catch (err) {
      console.error('Image processing failed:', err);
      setError('Görsel işleme sırasında hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImages, onCapture, stopCamera, onClose]);

  // Handle modal lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImages([]);
      setError(null);
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const handleClose = () => {
    if (!isProcessing) {
      stopCamera();
      onClose();
    }
  };

  const edgeStatusText = {
    searching: 'Belge aranıyor...',
    detected: 'Belge algılandı, sabit tutun',
    stable: 'Belge sabit - otomatik çekim yapılıyor',
    captured: '✓ Çekildi!',
  };

  const edgeStatusColor = {
    searching: 'text-gray-400',
    detected: 'text-yellow-500',
    stable: 'text-green-500',
    captured: 'text-green-600',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Belge Fotoğrafı Çek"
      size="lg"
    >
      <div className="space-y-3">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Camera View */}
        <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />

          {/* Edge detection overlay canvas */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Document frame guide (shown when no edges detected) */}
          {edgeStatus === 'searching' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-6 border-2 border-white border-dashed opacity-40 rounded-xl" />
              <div className="absolute top-6 left-6 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg" />
              <div className="absolute top-6 right-6 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-6 left-6 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-6 right-6 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg" />
            </div>
          )}

          {/* Edge detection status */}
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2">
            <div className={`bg-black/60 backdrop-blur-sm text-sm px-3 py-1.5 rounded-full ${edgeStatusColor[edgeStatus]}`}>
              {edgeStatusText[edgeStatus]}
            </div>
          </div>

          {/* Camera controls */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4">
            {/* Flash toggle */}
            {hasFlash && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFlash}
                className="bg-black/50 text-white hover:bg-black/70 rounded-full w-12 h-12"
              >
                {flashEnabled ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
              </Button>
            )}

            {/* Manual capture button */}
            <button
              data-allow-raw="true"
              onClick={captureImage}
              disabled={!isStreaming || capturedImages.length >= maxImages}
              className="bg-white text-black hover:bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center border-4 border-white/50 disabled:opacity-50 active:scale-95 transition-transform"
            >
              <Camera className="w-7 h-7" />
            </button>

            {/* Auto-capture toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoCaptureEnabled(!autoCaptureEnabled)}
              className={`rounded-full w-12 h-12 ${autoCaptureEnabled ? 'bg-green-500/70 text-white' : 'bg-black/50 text-gray-400'}`}
              title={autoCaptureEnabled ? 'Otomatik çekim açık' : 'Otomatik çekim kapalı'}
            >
              <Focus className="w-5 h-5" />
            </Button>

            {/* Image counter */}
            <div className="bg-black/50 text-white px-3 py-1.5 rounded-full text-sm font-medium">
              {capturedImages.length}/{maxImages}
            </div>
          </div>
        </div>

        {/* Captured images preview */}
        {capturedImages.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">
              Çekilen Fotoğraflar ({capturedImages.length})
            </h4>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {capturedImages.map((image) => (
                <div key={image.id} className="relative flex-shrink-0">
                  <img
                    src={image.dataUrl}
                    alt="Captured"
                    className="w-20 h-20 object-cover rounded-xl border"
                  />

                  {/* Confidence badge */}
                  {image.edgeConfidence > 0 && (
                    <div className={`absolute bottom-0 left-0 right-0 text-center text-[10px] font-medium py-0.5 rounded-b-xl ${
                      image.edgeConfidence > 0.7 ? 'bg-green-500/80 text-white' : 'bg-yellow-500/80 text-white'
                    }`}>
                      %{Math.round(image.edgeConfidence * 100)}
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    data-allow-raw="true"
                    onClick={() => removeImage(image.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white hover:bg-red-600 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-2xl">
          <p className="font-medium mb-1">Kullanım:</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>Belgeyi kamera alanına yerleştirin</li>
            <li>Kenarlar algılandığında çerçeve yeşile döner</li>
            <li>{autoCaptureEnabled ? 'Otomatik çekim açık - sabit tutun' : 'Manuel çekim - butona basın'}</li>
            <li>Birden fazla belge çekebilirsiniz (max {maxImages})</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isProcessing}
          >
            İptal
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCapturedImages([])}
              disabled={capturedImages.length === 0 || isProcessing}
              size="sm"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Temizle
            </Button>

            <Button
              onClick={processImages}
              disabled={capturedImages.length === 0 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  İşleniyor...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Tamamla ({capturedImages.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </Modal>
  );
};

export default CameraCapture;