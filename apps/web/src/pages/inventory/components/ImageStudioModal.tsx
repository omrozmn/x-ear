import React, { useState } from 'react';
import { Loader2, Scissors, Wand2 } from 'lucide-react';
import { Button, Modal, useToastHelpers } from '@x-ear/ui-web';
import { useRemoveBackground, useResizeImage } from '@/api/client/image-processing.client';
import type { ProductMedia } from '@/api/client/product-media.client';
import { MARKETPLACE_CONFIGS } from '../config/marketplaceFields';

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: ProductMedia | null;
  inventoryId: string;
  onImageProcessed: (url: string, s3Key: string) => void;
}

const MARKETPLACE_PRESETS = Object.entries(MARKETPLACE_CONFIGS).map(([key, config]) => ({
  key,
  label: `${config.name} (${config.minImageSize.w}x${config.minImageSize.h})`,
  width: config.minImageSize.w,
  height: config.minImageSize.h,
}));

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen, onClose, media, inventoryId, onImageProcessed
}) => {
  const [customWidth, setCustomWidth] = useState(800);
  const [customHeight, setCustomHeight] = useState(800);
  const toast = useToastHelpers();
  const removeBgMutation = useRemoveBackground();
  const resizeMutation = useResizeImage();

  if (!media) return null;

  const handleRemoveBg = async () => {
    if (!media.s3Key) return;
    try {
      const result = await removeBgMutation.mutateAsync({ s3Key: media.s3Key });
      if (result?.data) {
        onImageProcessed(result.data.url, result.data.s3Key);
        toast.success('Arka plan kaldırıldı');
      }
    } catch {
      toast.error('Arka plan kaldırma başarısız');
    }
  };

  const handleResize = async (width: number, height: number) => {
    if (!media.s3Key) return;
    try {
      const result = await resizeMutation.mutateAsync({
        s3Key: media.s3Key,
        width,
        height,
        maintainAspect: true,
      });
      if (result?.data) {
        onImageProcessed(result.data.url, result.data.s3Key);
        toast.success(`${width}x${height} olarak boyutlandırıldı`);
      }
    } catch {
      toast.error('Boyutlandırma başarısız');
    }
  };

  const isProcessing = removeBgMutation.isPending || resizeMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Görsel Stüdyo" size="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Preview */}
        <div>
          <div className="rounded-xl overflow-hidden border border-border bg-[repeating-conic-gradient(#f0f0f0_0%_25%,transparent_0%_50%)] bg-[length:20px_20px]">
            <img
              src={media.url}
              alt={media.altText || 'Preview'}
              className="w-full object-contain max-h-[400px]"
            />
          </div>
          <div className="mt-2 text-xs text-muted-foreground text-center">
            {media.width}x{media.height}px · {media.fileSize ? `${(media.fileSize / 1024).toFixed(0)} KB` : ''}
          </div>
        </div>

        {/* Tools */}
        <div className="space-y-6">
          {/* Background removal */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Arka Plan Kaldır</h4>
            <Button
              variant="outline"
              onClick={handleRemoveBg}
              disabled={isProcessing}
              icon={removeBgMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
              className="w-full"
            >
              {removeBgMutation.isPending ? 'İşleniyor...' : 'Arka Planı Kaldır'}
            </Button>
          </div>

          {/* Marketplace presets */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Pazaryeri Boyutları</h4>
            <div className="grid grid-cols-1 gap-2">
              {MARKETPLACE_PRESETS.map(preset => (
                <Button
                  key={preset.key}
                  variant="outline"
                  size="sm"
                  onClick={() => handleResize(preset.width, preset.height)}
                  disabled={isProcessing}
                  className="text-left justify-start"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom resize */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Özel Boyut</h4>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(Number(e.target.value))}
                className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                placeholder="W"
              />
              <span className="text-muted-foreground">×</span>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(Number(e.target.value))}
                className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                placeholder="H"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleResize(customWidth, customHeight)}
                disabled={isProcessing}
              >
                Uygula
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
