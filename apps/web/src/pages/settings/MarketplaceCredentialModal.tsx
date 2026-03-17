import React, { useState, useEffect } from 'react';
import { Loader2, Plug, Unplug } from 'lucide-react';
import { Button, Input, Modal, useToastHelpers } from '@x-ear/ui-web';

interface MarketplaceCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: string;
  platformName: string;
  existingIntegration?: {
    id: string;
    apiKey?: string;
    apiSecret?: string;
    sellerId?: string;
    name?: string;
    syncStock?: boolean;
    syncPrices?: boolean;
    syncOrders?: boolean;
    status?: string;
  } | null;
  onSave: (data: {
    platform: string;
    name: string;
    apiKey: string;
    apiSecret: string;
    sellerId: string;
    syncStock: boolean;
    syncPrices: boolean;
    syncOrders: boolean;
  }) => Promise<void>;
  onDisconnect?: (integrationId: string) => Promise<void>;
  onTest?: (integrationId: string) => Promise<void>;
}

export const MarketplaceCredentialModal: React.FC<MarketplaceCredentialModalProps> = ({
  isOpen, onClose, platform, platformName, existingIntegration,
  onSave, onDisconnect, onTest
}) => {
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [syncStock, setSyncStock] = useState(true);
  const [syncPrices, setSyncPrices] = useState(true);
  const [syncOrders, setSyncOrders] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const toast = useToastHelpers();

  useEffect(() => {
    if (existingIntegration) {
      setName(existingIntegration.name || '');
      setApiKey(existingIntegration.apiKey || '');
      setApiSecret(existingIntegration.apiSecret || '');
      setSellerId(existingIntegration.sellerId || '');
      setSyncStock(existingIntegration.syncStock ?? true);
      setSyncPrices(existingIntegration.syncPrices ?? true);
      setSyncOrders(existingIntegration.syncOrders ?? true);
    } else {
      setName('');
      setApiKey('');
      setApiSecret('');
      setSellerId('');
      setSyncStock(true);
      setSyncPrices(true);
      setSyncOrders(true);
    }
  }, [existingIntegration, isOpen]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error('API Key gerekli');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ platform, name: name || platformName, apiKey, apiSecret, sellerId, syncStock, syncPrices, syncOrders });
      toast.success('Kaydedildi');
      onClose();
    } catch {
      toast.error('Kayıt başarısız');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!existingIntegration?.id) return;
    setIsTesting(true);
    try {
      await onTest?.(existingIntegration.id);
      toast.success('Bağlantı başarılı');
    } catch {
      toast.error('Bağlantı testi başarısız');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${platformName} Entegrasyonu`} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Mağaza Adı</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${platformName} Mağazam`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">API Key <span className="text-red-500">*</span></label>
          <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key" type="password" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">API Secret</label>
          <Input value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="API Secret" type="password" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Seller ID / Mağaza ID</label>
          <Input value={sellerId} onChange={(e) => setSellerId(e.target.value)} placeholder="Seller ID" />
        </div>

        {/* Sync toggles */}
        <div className="space-y-2 pt-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={syncStock} onChange={(e) => setSyncStock(e.target.checked)} className="rounded border-border" />
            Stok senkronizasyonu
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={syncPrices} onChange={(e) => setSyncPrices(e.target.checked)} className="rounded border-border" />
            Fiyat senkronizasyonu
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={syncOrders} onChange={(e) => setSyncOrders(e.target.checked)} className="rounded border-border" />
            Sipariş senkronizasyonu
          </label>
        </div>

        {/* Status */}
        {existingIntegration && (
          <div className="flex items-center gap-2 text-sm pt-2">
            <span className={`w-2 h-2 rounded-full ${existingIntegration.status === 'connected' ? 'bg-green-500' : existingIntegration.status === 'error' ? 'bg-red-500' : 'bg-gray-400'}`} />
            <span className="text-muted-foreground">
              {existingIntegration.status === 'connected' ? 'Bağlı' : existingIntegration.status === 'error' ? 'Hata' : 'Bağlı değil'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-3 border-t border-border">
          <div>
            {existingIntegration && onDisconnect && (
              <Button variant="danger" size="sm" onClick={() => onDisconnect(existingIntegration.id)} icon={<Unplug className="w-4 h-4" />}>
                Bağlantıyı Kes
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {existingIntegration && onTest && (
              <Button variant="outline" onClick={handleTest} disabled={isTesting}
                icon={isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}>
                Test Et
              </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving}
              icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}>
              {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
