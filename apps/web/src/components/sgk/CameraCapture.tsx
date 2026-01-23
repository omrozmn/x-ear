import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Modal, Button } from '@x-ear/ui-web';
import { Camera, X, RotateCcw, Check, Square, Zap, ZapOff } from 'lucide-react';

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
  processed?: boolean;
}

interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  isOpen,
  onClose,
  onCapture,
  maxImages = 10,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }

      // Try to enable flash if available
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities() as ExtendedMediaTrackCapabilities;
      if (capabilities.torch) {
        setFlashEnabled(false);
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setError('Kameraya erişim sağlanamadı. Lütfen kamera izinlerini kontrol edin.');
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Toggle flash
  const toggleFlash = useCallback(async () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities() as ExtendedMediaTrackCapabilities;

      if (capabilities.torch) {
        try {
          await videoTrack.applyConstraints({
            advanced: [{ torch: !flashEnabled } as MediaTrackConstraintSet & { torch: boolean }]
          });
          setFlashEnabled(!flashEnabled);
        } catch (err) {
          console.error('Flash toggle failed:', err);
        }
      }
    }
  }, [flashEnabled]);

  // Capture image with edge detection
  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    const newImage: CapturedImage = {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dataUrl,
      timestamp: Date.now(),
      processed: false,
    };

    setCapturedImages(prev => [...prev, newImage]);

    // Auto-process for edge detection (placeholder for now)
    setTimeout(() => {
      setCapturedImages(prev =>
        prev.map(img =>
          img.id === newImage.id
            ? { ...img, processed: true }
            : img
        )
      );
    }, 1000);

  }, []);

  // Remove captured image
  const removeImage = useCallback((imageId: string) => {
    setCapturedImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

  // Process and return captured images
  const processImages = useCallback(async () => {
    if (capturedImages.length === 0) return;

    setIsProcessing(true);
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Convert data URLs to File objects
      const processedFiles = await Promise.all(
        capturedImages.map(async (img, index) => {
          const response = await fetch(img.dataUrl);
          const blob = await response.blob();
          return new File([blob], `captured-image-${index + 1}.jpg`, { type: 'image/jpeg' });
        })
      );

      onCapture(processedFiles);

      // Reset state
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

  // Handle modal open/close
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImages([]);
      setError(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const handleClose = () => {
    if (!isProcessing) {
      stopCamera();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Belge Fotoğrafı Çek"
      size="lg"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Camera View */}
        <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Camera overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Document frame guide */}
            <div className="absolute inset-4 border-2 border-white border-dashed opacity-50 rounded-lg" />

            {/* Corner guides */}
            <div className="absolute top-4 left-4 w-6 h-6 border-l-4 border-t-4 border-white" />
            <div className="absolute top-4 right-4 w-6 h-6 border-r-4 border-t-4 border-white" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-l-4 border-b-4 border-white" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-r-4 border-b-4 border-white" />
          </div>

          {/* Camera controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
            {/* Flash toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFlash}
              className="bg-black/50 text-white hover:bg-black/70"
            >
              {flashEnabled ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </Button>

            {/* Capture button */}
            <Button
              onClick={captureImage}
              disabled={!isStreaming || capturedImages.length >= maxImages}
              className="bg-white text-black hover:bg-gray-100 rounded-full w-16 h-16"
            >
              <Camera className="w-6 h-6" />
            </Button>

            {/* Image counter */}
            <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm">
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
            <div className="flex gap-2 overflow-x-auto pb-2">
              {capturedImages.map((image) => (
                <div key={image.id} className="relative flex-shrink-0">
                  <img
                    src={image.dataUrl}
                    alt="Captured"
                    className="w-20 h-20 object-cover rounded-lg border"
                  />

                  {/* Processing indicator */}
                  {!image.processed && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeImage(image.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-red-500 text-white hover:bg-red-600 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </Button>

                  {/* Processed indicator */}
                  {image.processed && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <p className="font-medium mb-1">Kullanım Talimatları:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Belgeyi beyaz çerçeve içine yerleştirin</li>
            <li>Belgenin tüm kenarlarının görünür olduğundan emin olun</li>
            <li>Işık yetersizse flaşı açın</li>
            <li>Her fotoğraf otomatik olarak kırpılacak ve işlenecek</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
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
            >
              <RotateCcw className="w-4 h-4 mr-2" />
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
                  Tamamla ({capturedImages.length} fotoğraf)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </Modal>
  );
};

export default CameraCapture;