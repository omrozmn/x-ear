import React, { useState, useCallback } from 'react';
import { Upload, Search, Sparkles, Loader2 } from 'lucide-react';
import { Button, useToastHelpers } from '@x-ear/ui-web';
import {
  useListProductMedia, useCreateProductMedia, useDeleteProductMedia,
  useReorderProductMedia, getMediaPresignedUrl, updateProductMedia,
  type ProductMediaRead
} from '@/api/client/product-media.client';
import { ImageGallery } from './ImageGallery';
import { StockImageSearchPanel } from './StockImageSearchPanel';
import { AIImagePanel } from './AIImagePanel';
import { ImageStudioModal } from './ImageStudioModal';
import { MarketplaceImageInfo } from './MarketplaceImageInfo';

interface ProductImagesTabProps {
  inventoryId: string;
}

export const ProductImagesTab: React.FC<ProductImagesTabProps> = ({ inventoryId }) => {
  const [isStockSearchOpen, setIsStockSearchOpen] = useState(false);
  const [isAIGenerateOpen, setIsAIGenerateOpen] = useState(false);
  const [studioMedia, setStudioMedia] = useState<ProductMediaRead | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToastHelpers();

  const { data: mediaData, refetch } = useListProductMedia(inventoryId);
  const createMedia = useCreateProductMedia();
  const deleteMedia = useDeleteProductMedia();
  const reorderMedia = useReorderProductMedia();

  const media = mediaData?.data || [];

  const handleFileUpload = useCallback(async (files: FileList) => {
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        // 1. Get presigned URL
        const presignedRes = await getMediaPresignedUrl(inventoryId, {
          filename: file.name,
          contentType: file.type,
        });
        const presigned = presignedRes?.data;
        if (!presigned) continue;

        // 2. Upload to S3
        if (presigned.fields) {
          const formData = new FormData();
          Object.entries(presigned.fields).forEach(([k, v]) => formData.append(k, v as string));
          formData.append('file', file);
          await fetch(presigned.url, { method: 'POST', body: formData });
        } else {
          await fetch(presigned.url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });
        }

        // 3. Get dimensions
        let width: number | undefined;
        let height: number | undefined;
        if (file.type.startsWith('image/')) {
          const img = new Image();
          const url = URL.createObjectURL(file);
          await new Promise<void>((resolve) => {
            img.onload = () => { width = img.width; height = img.height; resolve(); };
            img.onerror = () => resolve();
            img.src = url;
          });
          URL.revokeObjectURL(url);
        }

        // 4. Create media record
        const s3Url = presigned.url.split('?')[0];
        const fullUrl = presigned.fields
          ? `${s3Url}${presigned.s3Key}`
          : s3Url;

        await createMedia.mutateAsync({
          inventoryId,
          data: {
            mediaType: file.type.startsWith('video/') ? 'video' : 'image',
            url: fullUrl,
            s3Key: presigned.s3Key,
            filename: file.name,
            mimeType: file.type,
            fileSize: file.size,
            width,
            height,
            isPrimary: media.length === 0,
            source: 'upload',
          },
        });
      }
      toast.success('Görseller yüklendi');
    } catch {
      toast.error('Yükleme başarısız');
    } finally {
      setIsUploading(false);
    }
  }, [inventoryId, createMedia, media.length, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDelete = async (mediaId: string) => {
    try {
      await deleteMedia.mutateAsync({ inventoryId, mediaId });
      toast.success('Görsel silindi');
    } catch {
      toast.error('Silme başarısız');
    }
  };

  const handleSetPrimary = async (mediaId: string) => {
    try {
      await updateProductMedia(inventoryId, mediaId, { isPrimary: true });
      refetch();
      toast.success('Ana görsel güncellendi');
    } catch {
      toast.error('Güncelleme başarısız');
    }
  };

  const handleReorder = async (mediaIds: string[]) => {
    try {
      await reorderMedia.mutateAsync({ inventoryId, data: { mediaIds } });
    } catch {
      toast.error('Sıralama başarısız');
    }
  };

  const handleImageProcessed = async (url: string, s3Key: string) => {
    // Add processed image as new media
    await createMedia.mutateAsync({
      inventoryId,
      data: {
        mediaType: 'image',
        url,
        s3Key,
        source: 'upload',
      },
    });
    setStudioMedia(null);
  };

  const handleAIImageGenerated = async (url: string, s3Key: string) => {
    await createMedia.mutateAsync({
      inventoryId,
      data: {
        mediaType: 'image',
        url,
        s3Key,
        source: 'ai_generated',
      },
    });
    setIsAIGenerateOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors"
      >
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {isUploading ? 'Yükleniyor...' : 'Görselleri sürükleyip bırakın veya'}
          </p>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                <Upload className="w-3.5 h-3.5" /> Dosya Seç
              </span>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                className="sr-only"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                disabled={isUploading}
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStockSearchOpen(true)}
              icon={<Search className="w-3.5 h-3.5" />}
            >
              Stok Görsel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAIGenerateOpen(true)}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              AI Üret
            </Button>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <ImageGallery
        media={media}
        onDelete={handleDelete}
        onSetPrimary={handleSetPrimary}
        onEdit={(m) => setStudioMedia(m)}
        onReorder={handleReorder}
      />

      {/* Marketplace Image Requirements */}
      {media.length > 0 && <MarketplaceImageInfo media={media} />}

      {/* Modals */}
      <StockImageSearchPanel
        isOpen={isStockSearchOpen}
        onClose={() => setIsStockSearchOpen(false)}
        inventoryId={inventoryId}
        onImageAdded={() => { refetch(); setIsStockSearchOpen(false); }}
      />

      <AIImagePanel
        isOpen={isAIGenerateOpen}
        onClose={() => setIsAIGenerateOpen(false)}
        inventoryId={inventoryId}
        onImageGenerated={handleAIImageGenerated}
      />

      <ImageStudioModal
        isOpen={!!studioMedia}
        onClose={() => setStudioMedia(null)}
        media={studioMedia}
        inventoryId={inventoryId}
        onImageProcessed={handleImageProcessed}
      />
    </div>
  );
};
