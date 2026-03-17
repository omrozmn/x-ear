import React, { useState, useEffect } from 'react';
import { Loader2, Plug } from 'lucide-react';
import { Button, Input, Modal, useToastHelpers } from '@x-ear/ui-web';
import type { CargoIntegration } from '@/api/client/cargo-integrations.client';

interface CargoCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: string;
  platformName: string;
  existingIntegration?: CargoIntegration | null;
  onSave: (data: { platform: string; name: string; apiKey: string; apiSecret: string; customerId: string }) => Promise<void>;
  onTest?: (id: string) => Promise<void>;
}

export const CargoCredentialModal: React.FC<CargoCredentialModalProps> = ({
  isOpen, onClose, platform, platformName, existingIntegration,
  onSave, onTest
}) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const toast = useToastHelpers();

  useEffect(() => {
    if (existingIntegration) {
      setCustomerId(existingIntegration.customerId || '');
      setApiKey('');
      setApiSecret('');
    } else {
      setApiKey('');
      setApiSecret('');
      setCustomerId('');
    }
  }, [existingIntegration, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ platform, name: platformName, apiKey, apiSecret, customerId });
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
          <label className="block text-sm font-medium text-foreground mb-1">API Key</label>
          <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key" type="password" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">API Secret</label>
          <Input value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="API Secret" type="password" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Müşteri No</label>
          <Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="Müşteri numarası" />
        </div>

        {existingIntegration && (
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${existingIntegration.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-muted-foreground">
              {existingIntegration.status === 'connected' ? 'Bağlı' : 'Bağlı değil'}
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
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
    </Modal>
  );
};
