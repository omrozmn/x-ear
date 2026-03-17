import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Save, Send } from 'lucide-react';
import { Button, Input, Modal, useToastHelpers } from '@x-ear/ui-web';
import { MARKETPLACE_CONFIGS, type MarketplaceConfig } from '../config/marketplaceFields';
import type { MarketplaceListing, MarketplaceListingCreate, MarketplaceListingUpdate } from '@/api/client/marketplace-listings.client';

interface MarketplaceListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: string;
  integrationId: string;
  existingListing?: MarketplaceListing | null;
  inventoryId: string;
  onSave: (data: MarketplaceListingCreate | MarketplaceListingUpdate) => Promise<void>;
  onPublish?: (listingId: string) => Promise<void>;
  onAIFill?: (platform: string) => Promise<{ marketplaceTitle?: string; marketplaceDescription?: string; marketplacePrice?: number; listingData?: string } | undefined>;
}

export const MarketplaceListingModal: React.FC<MarketplaceListingModalProps> = ({
  isOpen, onClose, platform, integrationId, existingListing, inventoryId,
  onSave, onPublish, onAIFill
}) => {
  const config = MARKETPLACE_CONFIGS[platform];
  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isAIFilling, setIsAIFilling] = useState(false);
  const toast = useToastHelpers();

  useEffect(() => {
    if (existingListing?.listingData) {
      try {
        setFormData(JSON.parse(existingListing.listingData));
      } catch {
        setFormData({});
      }
    } else {
      setFormData({});
    }
  }, [existingListing, isOpen]);

  if (!config) return null;

  const handleFieldChange = (key: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (publish: boolean = false) => {
    setIsSaving(true);
    try {
      const listingData = JSON.stringify(formData);
      if (existingListing) {
        await onSave({
          listingData,
          marketplaceTitle: String(formData.title || ''),
          marketplaceDescription: String(formData.description || ''),
          marketplacePrice: Number(formData.price || formData.salePrice || formData.listPrice || 0),
          marketplaceStock: Number(formData.quantity || 0),
          marketplaceBarcode: String(formData.barcode || ''),
          marketplaceBrand: String(formData.brand || ''),
          marketplaceCategoryId: String(formData.categoryId || ''),
          status: publish ? 'published' : 'draft',
        } as MarketplaceListingUpdate);
      } else {
        await onSave({
          integrationId,
          listingData,
          marketplaceTitle: String(formData.title || ''),
          marketplaceDescription: String(formData.description || ''),
          marketplacePrice: Number(formData.price || formData.salePrice || formData.listPrice || 0),
          marketplaceStock: Number(formData.quantity || 0),
          marketplaceBarcode: String(formData.barcode || ''),
          marketplaceBrand: String(formData.brand || ''),
          marketplaceCategoryId: String(formData.categoryId || ''),
        } as MarketplaceListingCreate);
      }
      toast.success(publish ? 'Yayınlandı' : 'Taslak kaydedildi');
      onClose();
    } catch {
      toast.error('Kayıt başarısız');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIFill = async () => {
    if (!onAIFill) return;
    setIsAIFilling(true);
    try {
      const result = await onAIFill(platform);
      if (result) {
        const newData: Record<string, string | number> = { ...formData };
        if (result.marketplaceTitle) newData.title = result.marketplaceTitle;
        if (result.marketplaceDescription) newData.description = result.marketplaceDescription;
        if (result.marketplacePrice) newData.price = result.marketplacePrice;
        if (result.listingData) {
          try {
            const extra = JSON.parse(result.listingData);
            Object.assign(newData, extra);
          } catch { /* ignore */ }
        }
        setFormData(newData);
        toast.success('AI ile dolduruldu');
      }
    } catch {
      toast.error('AI doldurma başarısız');
    } finally {
      setIsAIFilling(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${config.name} Ürün Listesi`} size="lg">
      <div className="space-y-4">
        {/* Header with AI Fill */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <img src={config.logo} alt={config.name} className="w-6 h-6" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <span className="font-medium">{config.name}</span>
            {existingListing && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                existingListing.status === 'published' ? 'bg-green-100 text-green-700' :
                existingListing.status === 'error' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {existingListing.status === 'published' ? 'Yayında' : existingListing.status === 'error' ? 'Hata' : 'Taslak'}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAIFill}
            disabled={isAIFilling}
            icon={isAIFilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          >
            AI Doldur
          </Button>
        </div>

        {/* Form fields */}
        <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
          {config.fields.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-foreground mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={String(formData[field.key] || '')}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="w-full min-h-[80px] rounded-xl border border-border bg-background p-2.5 text-sm"
                  maxLength={field.maxLength}
                />
              ) : field.type === 'select' ? (
                <select
                  value={String(formData[field.key] || '')}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-sm"
                >
                  <option value="">Seçin...</option>
                  {field.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  value={formData[field.key] ?? ''}
                  onChange={(e) => handleFieldChange(field.key, Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-sm"
                />
              ) : (
                <Input
                  value={String(formData[field.key] || '')}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  maxLength={field.maxLength}
                />
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          >
            Taslak Kaydet
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            icon={<Send className="w-4 h-4" />}
          >
            Yayınla
          </Button>
        </div>
      </div>
    </Modal>
  );
};
