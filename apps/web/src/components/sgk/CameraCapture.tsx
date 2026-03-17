import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from '@x-ear/ui-web';
import { Camera, X, RotateCcw, Check, Zap, ZapOff, Focus, Lock, Unlock, ZoomIn } from 'lucide-react';

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
  zoom?: { min: number; max: number; step: number };
  focusMode?: string[];
}

const JPEG_QUALITY = 0.75;
const STABILITY_FRAMES = 8;
const SKIP_FRAMES = 5; // Process every 5th frame for edge detection (~6fps on 30fps)
const AUTO_CAPTURE_CONFIDENCE = 0.7;

const getErrorMessage = (): string => {
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'tr';
  return lang.startsWith('tr')
    ? 'Kameraya erişim sağlanamadı. Lütfen kamera izinlerini kontrol edin.'
    : 'Camera access denied. Please check camera permissions in your browser settings.';
};

const CameraCapture: React.FC<CameraCaptureProps> = ({
  isOpen,
  onClose,
  onCapture,
  maxImages = 10,
}) => {
  const { t: _t } = useTranslation('sgk');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
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

  // Mobile: zoom & focus
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [hasZoom, setHasZoom] = useState(false);
  const [focusLocked, setFocusLocked] = useState(false);
  const [hasFocusControl, setHasFocusControl] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  // Canvas-based document edge detection
  const detectDocumentEdges = useCallback((): DetectedEdge | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0) return null;

    const scale = 0.25;
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const w = canvas.width;
    const h = canvas.height;

    // Adaptive threshold: compute mean brightness and use Otsu-like approach
    let totalGray = 0;
    const pixelCount = w * h;
    for (let p = 0; p < pixelCount; p++) {
      const pi = p * 4;
      totalGray += data[pi] * 0.299 + data[pi + 1] * 0.587 + data[pi + 2] * 0.114;
    }
    const meanBrightness = totalGray / pixelCount;
    // Threshold = midpoint between mean and white (adaptive to lighting)
    const threshold = Math.min(200, Math.max(120, meanBrightness * 0.75));

    let minX = w, minY = h, maxX = 0, maxY = 0;
    let edgePixelCount = 0;

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

    const isDocumentShaped = areaRatio > 0.15 && areaRatio < 0.92;
    const aspectOk = docWidth > 0 && docHeight > 0 && (docWidth / docHeight) > 0.3 && (docWidth / docHeight) < 3.0;
    const hasEnoughContent = edgePixelCount > (w * h * 0.02);

    if (!isDocumentShaped || !aspectOk || !hasEnoughContent) return null;

    const invScale = 1 / scale;
    const margin = Math.min(w, h) * 0.02;
    const corners = [
      { x: Math.round((minX - margin) * invScale), y: Math.round((minY - margin) * invScale) },
      { x: Math.round((maxX + margin) * invScale), y: Math.round((minY - margin) * invScale) },
      { x: Math.round((maxX + margin) * invScale), y: Math.round((maxY + margin) * invScale) },
      { x: Math.round((minX - margin) * invScale), y: Math.round((maxY + margin) * invScale) },
    ];

    const confidence = Math.min(0.95, 0.4 + areaRatio * 0.5 + (edgePixelCount / (w * h)) * 0.3);
    return { corners, confidence, isStable: false };
  }, []);

  // Draw edge overlay
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

    ctx.fillStyle = color;
    c.forEach(corner => {
      ctx.beginPath();
      ctx.arc(corner.x * scaleX, corner.y * scaleY, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  // rAF-based edge detection loop (replaces setInterval for better perf)
  const startEdgeDetection = useCallback(() => {
    if (rafRef.current) return;

    const loop = () => {
      frameCountRef.current++;
      if (frameCountRef.current % SKIP_FRAMES === 0) {
        const edge = detectDocumentEdges();
        if (edge) {
          stableFramesRef.current++;
          edge.isStable = stableFramesRef.current >= STABILITY_FRAMES;
          setDetectedEdge(edge);
          setEdgeStatus(edge.isStable ? 'stable' : 'detected');
          drawEdgeOverlay(edge);
        } else {
          stableFramesRef.current = 0;
          setDetectedEdge(null);
          setEdgeStatus('searching');
          drawEdgeOverlay(null);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [detectDocumentEdges, drawEdgeOverlay]);

  const stopEdgeDetection = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    frameCountRef.current = 0;
    stableFramesRef.current = 0;
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }

      // Detect capabilities: flash, zoom, focus
      const videoTrack = stream.getVideoTracks()[0];
      try {
        const caps = videoTrack.getCapabilities() as ExtendedMediaTrackCapabilities;
        setHasFlash(!!caps.torch);

        if (caps.zoom && caps.zoom.max > 1) {
          setHasZoom(true);
          setMaxZoom(caps.zoom.max);
          setZoomLevel(caps.zoom.min || 1);
        }

        if (caps.focusMode && caps.focusMode.includes('manual')) {
          setHasFocusControl(true);
        }
      } catch {
        setHasFlash(false);
      }
    } catch {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setError(getErrorMessage());
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopEdgeDetection();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setDetectedEdge(null);
    setEdgeStatus('searching');
    setZoomLevel(1);
    setFocusLocked(false);
    setFocusPoint(null);
  }, [stopEdgeDetection]);

  // Zoom control
  const handleZoomChange = useCallback(async (newZoom: number) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: newZoom } as MediaTrackConstraintSet & { zoom: number }] });
      setZoomLevel(newZoom);
    } catch {
      // Zoom not supported on this device
    }
  }, []);

  // Focus lock toggle
  const toggleFocusLock = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const newMode = focusLocked ? 'continuous' : 'manual';
      await track.applyConstraints({ advanced: [{ focusMode: newMode } as MediaTrackConstraintSet & { focusMode: string }] });
      setFocusLocked(!focusLocked);
    } catch {
      // Focus control not supported
    }
  }, [focusLocked]);

  // Touch-to-focus
  const handleVideoTap = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    if (!hasFocusControl || focusLocked) return;
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !videoRef.current) return;

    const rect = videoRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    setFocusPoint({ x: clientX - rect.left, y: clientY - rect.top });

    try {
      await track.applyConstraints({
        advanced: [{ focusMode: 'manual', pointsOfInterest: [{ x, y }] } as Record<string, unknown>],
      });
      // Revert to continuous after 3s
      setTimeout(async () => {
        try {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet & { focusMode: string }] });
        } catch { /* ignore */ }
        setFocusPoint(null);
      }, 3000);
    } catch {
      setFocusPoint(null);
    }
  }, [hasFocusControl, focusLocked]);

  // Toggle flash
  const toggleFlash = useCallback(async () => {
    if (!streamRef.current || !hasFlash) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: !flashEnabled } as MediaTrackConstraintSet & { torch: boolean }],
      });
      setFlashEnabled(!flashEnabled);
    } catch {
      // Flash not available
    }
  }, [flashEnabled, hasFlash]);

  // Capture image
  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.filter = 'contrast(1.05) brightness(1.02)';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const confidence = detectedEdge?.confidence || 0;

    const newImage: CapturedImage = {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dataUrl,
      timestamp: Date.now(),
      processed: true,
      edgeConfidence: confidence,
    };

    setCapturedImages(prev => (prev.length >= maxImages ? prev : [...prev, newImage]));
    setEdgeStatus('captured');
    stableFramesRef.current = 0;
    setTimeout(() => setEdgeStatus('searching'), 1500);
  }, [maxImages, detectedEdge]);

  // Auto-capture
  const captureImageRef = useRef(captureImage);
  captureImageRef.current = captureImage;

  useEffect(() => {
    if (!autoCaptureEnabled || !isStreaming) return;
    if (edgeStatus !== 'stable' || !detectedEdge) return;
    if (capturedImages.length >= maxImages) return;
    if (detectedEdge.confidence < AUTO_CAPTURE_CONFIDENCE) return;
    captureImageRef.current();
  }, [edgeStatus, autoCaptureEnabled, isStreaming, detectedEdge, capturedImages.length, maxImages]);

  useEffect(() => {
    if (isStreaming) startEdgeDetection();
    return () => stopEdgeDetection();
  }, [isStreaming, startEdgeDetection, stopEdgeDetection]);

  const removeImage = useCallback((imageId: string) => {
    setCapturedImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

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
    } catch {
      const lang = typeof navigator !== 'undefined' ? navigator.language : 'tr';
      setError(lang.startsWith('tr') ? 'Gorsel isleme sirasinda hata olustu.' : 'Image processing failed.');
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImages, onCapture, stopCamera, onClose]);

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

  const retryCamera = useCallback(() => {
    setError(null);
    startCamera();
  }, [startCamera]);

  const edgeStatusText = {
    searching: 'Belge araniyor...',
    detected: 'Belge algilandi, sabit tutun',
    stable: 'Belge sabit - otomatik cekim yapiliyor',
    captured: 'Cekildi!',
  };

  const edgeStatusColor = {
    searching: 'text-muted-foreground',
    detected: 'text-yellow-500',
    stable: 'text-success',
    captured: 'text-success',
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Belge Fotografi Cek" size="lg">
      <div className="space-y-3">
        {error && (
          <div className="p-3 bg-destructive/10 border border-red-200 rounded-2xl">
            <p className="text-destructive text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={retryCamera} className="mt-2">
              Tekrar Dene / Retry
            </Button>
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
            onClick={handleVideoTap}
            onTouchEnd={handleVideoTap}
          />

          <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

          {/* Focus indicator */}
          {focusPoint && (
            <div
              className="absolute w-16 h-16 border-2 border-yellow-400 rounded-full animate-ping pointer-events-none"
              style={{ left: focusPoint.x - 32, top: focusPoint.y - 32 }}
            />
          )}

          {edgeStatus === 'searching' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-6 border-2 border-white border-dashed opacity-40 rounded-xl" />
              <div className="absolute top-6 left-6 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg" />
              <div className="absolute top-6 right-6 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-6 left-6 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-6 right-6 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg" />
            </div>
          )}

          <div className="absolute top-3 left-1/2 transform -translate-x-1/2">
            <div className={`bg-black/60 backdrop-blur-sm text-sm px-3 py-1.5 rounded-full ${edgeStatusColor[edgeStatus]}`}>
              {edgeStatusText[edgeStatus]}
            </div>
          </div>

          {/* Camera controls */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 px-4">
            {hasFlash && (
              <Button variant="ghost" size="sm" onClick={toggleFlash} className="bg-black/50 text-white hover:bg-black/70 rounded-full w-10 h-10">
                {flashEnabled ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </Button>
            )}

            {hasFocusControl && (
              <Button variant="ghost" size="sm" onClick={toggleFocusLock} className={`rounded-full w-10 h-10 ${focusLocked ? 'bg-yellow-500/70 text-white' : 'bg-black/50 text-muted-foreground'}`} title={focusLocked ? 'Odak kilitli' : 'Odak serbest'}>
                {focusLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </Button>
            )}

            <button
              data-allow-raw="true"
              onClick={captureImage}
              disabled={!isStreaming || capturedImages.length >= maxImages}
              className="bg-card text-black hover:bg-muted rounded-full w-16 h-16 flex items-center justify-center border-4 border-white/50 disabled:opacity-50 active:scale-95 transition-transform"
            >
              <Camera className="w-7 h-7" />
            </button>

            <Button variant="ghost" size="sm" onClick={() => setAutoCaptureEnabled(!autoCaptureEnabled)} className={`rounded-full w-10 h-10 ${autoCaptureEnabled ? 'bg-green-500/70 text-white' : 'bg-black/50 text-muted-foreground'}`} title={autoCaptureEnabled ? 'Otomatik cekim acik' : 'Otomatik cekim kapali'}>
              <Focus className="w-4 h-4" />
            </Button>

            <div className="bg-black/50 text-white px-3 py-1.5 rounded-full text-sm font-medium">
              {capturedImages.length}/{maxImages}
            </div>
          </div>

          {/* Zoom slider */}
          {hasZoom && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
              <ZoomIn className="w-4 h-4 text-white/70" />
              <input
                data-allow-raw="true"
                type="range"
                min={1}
                max={maxZoom}
                step={0.1}
                value={zoomLevel}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="w-24 -rotate-90 accent-white"
                style={{ transformOrigin: 'center' }}
              />
              <span className="text-white/70 text-xs">{zoomLevel.toFixed(1)}x</span>
            </div>
          )}
        </div>

        {/* Captured images preview */}
        {capturedImages.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Cekilen Fotograflar ({capturedImages.length})</h4>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {capturedImages.map((image) => (
                <div key={image.id} className="relative flex-shrink-0">
                  <img src={image.dataUrl} alt="Captured" className="w-20 h-20 object-cover rounded-xl border" />
                  {image.edgeConfidence > 0 && (
                    <div className={`absolute bottom-0 left-0 right-0 text-center text-[10px] font-medium py-0.5 rounded-b-xl ${image.edgeConfidence > 0.7 ? 'bg-green-500/80 text-white' : 'bg-yellow-500/80 text-white'}`}>
                      %{Math.round(image.edgeConfidence * 100)}
                    </div>
                  )}
                  <button data-allow-raw="true" onClick={() => removeImage(image.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white hover:bg-red-600 rounded-full flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-2xl">
          <p className="font-medium mb-1">Kullanim:</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>Belgeyi kamera alanina yerlestirin</li>
            <li>Kenarlar algilandiginda cerceve yesile doner</li>
            <li>{autoCaptureEnabled ? 'Otomatik cekim acik - sabit tutun' : 'Manuel cekim - butona basin'}</li>
            <li>Birden fazla belge cekebilirsiniz (max {maxImages})</li>
            {hasZoom && <li>Sag taraftaki kaydirici ile yakinlastirabilirsiniz</li>}
            {hasFocusControl && <li>Ekrana dokunarak odak noktasi secebilirsiniz</li>}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Button variant="ghost" onClick={handleClose} disabled={isProcessing}>Iptal</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCapturedImages([])} disabled={capturedImages.length === 0 || isProcessing} size="sm">
              <RotateCcw className="w-4 h-4 mr-1" /> Temizle
            </Button>
            <Button onClick={processImages} disabled={capturedImages.length === 0 || isProcessing}>
              {isProcessing ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Isleniyor...</>
              ) : (
                <><Check className="w-4 h-4 mr-2" />Tamamla ({capturedImages.length})</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </Modal>
  );
};

export default CameraCapture;
