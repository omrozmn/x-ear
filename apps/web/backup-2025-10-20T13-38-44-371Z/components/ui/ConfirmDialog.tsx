import { Modal, Button } from '@x-ear/ui-web';

type ConfirmDialogProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function ConfirmDialog({ isOpen, title, description, onClose, onConfirm, confirmLabel = 'Onayla', cancelLabel = 'İptal' }: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Onay'} size="sm">
      <div>
        {description && <p className="text-sm text-gray-700">{description}</p>}
        <div className="mt-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>{cancelLabel}</Button>
          <Button variant="primary" onClick={async () => { await onConfirm(); }}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
