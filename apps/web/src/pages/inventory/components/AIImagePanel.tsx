// @ts-nocheck - TODO: Enable when e-commerce backend endpoints are in OpenAPI spec
import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button, Input, Modal, useToastHelpers } from '@x-ear/ui-web';
import { useAiGenerateImage } from '@/api/client/image-processing.client';

interface AIImagePanelProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryId: string;
  onImageGenerated: (url: string, s3Key: string) => void;
}

const STYLES = [
  { value: 'product-photo', label: 'Ürün Fotoğrafı' },
  { value: 'realistic', label: 'Gerçekçi' },
  { value: 'illustration', label: 'İllüstrasyon' },
];

export const AIImagePanel: React.FC<AIImagePanelProps> = ({
  isOpen, onClose, inventoryId, onImageGenerated
}) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('product-photo');
  const toast = useToastHelpers();
  const generateMutation = useAiGenerateImage();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Lütfen bir açıklama girin');
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        data: {
          prompt: prompt.trim(),
          style,
        },
      });
      if (result?.data) {
        onImageGenerated(result.data.url, result.data.s3Key);
        toast.success('Görsel üretildi');
      }
    } catch {
      toast.error('AI görsel üretimi henüz yapılandırılmadı');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Görsel Üretimi" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Açıklama</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ürünün nasıl görünmesini istediğinizi açıklayın..."
            className="w-full min-h-[100px] rounded-xl border border-border bg-background p-3 text-sm"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Stil</label>
          <div className="flex gap-2">
            {STYLES.map(s => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  style === s.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generateMutation.isPending || !prompt.trim()}
          className="w-full"
          icon={generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        >
          {generateMutation.isPending ? 'Üretiliyor...' : 'Görsel Üret'}
        </Button>
      </div>
    </Modal>
  );
};
