import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Modal, Button, Alert, Textarea } from '@x-ear/ui-web';
import { InventoryItem } from '../../../types/inventory';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onConfirm: (reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  items,
  onConfirm,
  isLoading = false
}) => {
  const { t } = useTranslation('inventory');
  const [reason, setReason] = useState('');
  const [requireReason, setRequireReason] = useState(false);

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      setRequireReason(true);
      return;
    }

    await onConfirm(reason.trim() || undefined);
    handleClose();
  };

  const handleClose = () => {
    setReason('');
    setRequireReason(false);
    onClose();
  };

  const isSingleItem = items.length === 1;
  const hasStock = items.some(item => item.availableInventory > 0);
  const totalStock = items.reduce((sum, item) => sum + item.availableInventory, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('delete.title')}
      size="md"
    >
      <div className="space-y-6">
        <Alert variant={hasStock ? 'warning' : 'error'}>
          <div className="space-y-2">
            <p className="font-medium">
              {isSingleItem
                ? t('delete.confirm')
                : t('delete.confirm')
              }
            </p>
            <p className="text-sm">
              {t('delete.warning')}
            </p>
            {hasStock && (
              <p className="text-sm">
                ⚠️ <strong>Dikkat:</strong> Toplam {totalStock} adet stok da silinecektir!
              </p>
            )}
          </div>
        </Alert>

        {isSingleItem ? (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
            <h3 className="font-medium text-gray-900 dark:text-white">{items[0].name}</h3>
            <div className="text-sm text-muted-foreground space-y-1 mt-2">
              <p>Model: {items[0].model}</p>
              <p>Marka: {items[0].brand}</p>
              <p>Stok: {items[0].availableInventory} adet</p>
              <p>Fiyat: ₺{items[0].price?.toLocaleString('tr-TR')}</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">{t('delete.title')}:</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {items.map((item, index) => (
                <div key={item.id} className="flex justify-between text-sm dark:text-gray-300">
                  <span>{index + 1}. {item.name}</span>
                  <span className="text-muted-foreground">{item.availableInventory} adet</span>
                </div>
              ))}
            </div>
            <div className="border-t dark:border-gray-700 pt-2 mt-3">
              <div className="flex justify-between text-sm font-medium dark:text-gray-200">
                <span>Toplam:</span>
                <span>{totalStock} adet</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <Textarea
            label={t('form.notes')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Bu ürün(ler)i neden siliyorsunuz? (Örn: Hasarlı, Eskimiş, Yanlış kayıt)"
            rows={3}
            error={requireReason && !reason.trim() ? t('validation.name_required') : undefined}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            İptal
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            loading={isLoading}
            variant="danger"
          >
            {t('delete.title')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;