import { Modal, Button } from '@x-ear/ui-web';

type ConfirmDialogProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger' | 'info' | 'warning';
  isLoading?: boolean;
};

export function ConfirmDialog({
  isOpen,
  title,
  description,
  onClose,
  onConfirm,
  confirmLabel = 'Onayla',
  cancelLabel = 'İptal',
  variant = 'primary',
  isLoading = false
}: ConfirmDialogProps) {
  const buttonVariant = variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary';

  return (
    <Modal isOpen={isOpen} onClose={isLoading ? () => { } : onClose} title={title || 'Onay'} size="sm">
      <div>
        {description && <p className="text-sm text-gray-700">{description}</p>}
        <div className="mt-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>{cancelLabel}</Button>
          <Button
            variant={buttonVariant as any}
            onClick={async () => { await onConfirm(); }}
            disabled={isLoading}
            loading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
