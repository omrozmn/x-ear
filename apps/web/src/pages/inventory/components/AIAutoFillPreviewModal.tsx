// @ts-nocheck - TODO: Enable when e-commerce backend endpoints are in OpenAPI spec
import React, { useState } from 'react';
import { Check, X, Loader2, Sparkles } from 'lucide-react';
import { Button, Modal, useToastHelpers } from '@x-ear/ui-web';
import { MARKETPLACE_CONFIGS } from '../config/marketplaceFields';
import type { AIFillResponse } from '@/api/client/marketplace-listings.client';

interface AIAutoFillPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: AIFillResponse[];
  isLoading: boolean;
  onAccept: (results: AIFillResponse[]) => void;
}

export const AIAutoFillPreviewModal: React.FC<AIAutoFillPreviewModalProps> = ({
  isOpen, onClose, results, isLoading, onAccept
}) => {
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  const togglePlatform = (platform: string) => {
    setAccepted(prev => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  const handleAcceptAll = () => {
    setAccepted(new Set(results.map(r => r.platform)));
  };

  const handleConfirm = () => {
    const selectedResults = results.filter(r => accepted.has(r.platform));
    onAccept(selectedResults);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI ile Otomatik Doldurma Önizleme" size="xl">
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AI içerik üretiliyor...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleAcceptAll}>
                Tümünü Seç
              </Button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {results.map(result => {
                const config = MARKETPLACE_CONFIGS[result.platform];
                const isSelected = accepted.has(result.platform);

                return (
                  <div
                    key={result.platform}
                    className={`p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}
                    onClick={() => togglePlatform(result.platform)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="font-medium">{config?.name || result.platform}</span>
                      </div>
                    </div>
                    <div className="pl-7 space-y-1 text-sm">
                      {result.marketplaceTitle && (
                        <div>
                          <span className="text-muted-foreground">Başlık: </span>
                          <span className="text-foreground">{result.marketplaceTitle}</span>
                        </div>
                      )}
                      {result.marketplaceDescription && (
                        <div>
                          <span className="text-muted-foreground">Açıklama: </span>
                          <span className="text-foreground line-clamp-2">{result.marketplaceDescription}</span>
                        </div>
                      )}
                      {result.marketplacePrice && (
                        <div>
                          <span className="text-muted-foreground">Fiyat: </span>
                          <span className="text-foreground">{result.marketplacePrice} TL</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={onClose}>İptal</Button>
              <Button
                onClick={handleConfirm}
                disabled={accepted.size === 0}
                icon={<Sparkles className="w-4 h-4" />}
              >
                Seçilenleri Uygula ({accepted.size})
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
