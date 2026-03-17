import React from 'react';
import { ImageIcon, Video, CheckCircle, AlertCircle } from 'lucide-react';
import { MARKETPLACE_CONFIGS } from '../config/marketplaceFields';
import type { ProductMediaRead } from '@/api/client/product-media.client';

interface MarketplaceImageInfoProps {
  media: ProductMediaRead[];
}

export const MarketplaceImageInfo: React.FC<MarketplaceImageInfoProps> = ({ media }) => {
  const imageCount = media.filter(m => m.mediaType === 'image').length;
  const videoCount = media.filter(m => m.mediaType === 'video').length;

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
      <h4 className="text-sm font-medium text-foreground mb-3">Pazaryeri Görsel Gereksinimleri</h4>
      <div className="space-y-2">
        {Object.entries(MARKETPLACE_CONFIGS).map(([key, config]) => {
          const meetsImages = imageCount >= 1 && imageCount <= config.maxImages;
          const meetsMinSize = media.every(m => {
            if (m.mediaType !== 'image') return true;
            return (Number(m.width) || 0) >= config.minImageSize.w && (Number(m.height) || 0) >= config.minImageSize.h;
          });
          const ready = meetsImages && (imageCount === 0 || meetsMinSize);

          return (
            <div key={key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {ready ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                )}
                <span className="font-medium">{config.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {imageCount}/{config.maxImages}
                </span>
                {config.maxVideos > 0 && (
                  <span className="flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    {videoCount}/{config.maxVideos}
                  </span>
                )}
                <span>Min: {config.minImageSize.w}x{config.minImageSize.h}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
