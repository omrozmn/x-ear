import { useTranslation } from 'react-i18next';
import React from 'react';
import { Modal } from '@x-ear/ui-web';
import { ProductForm } from './ProductForm';
import { InventoryItem, InventoryFormData } from '../../../types/inventory';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: InventoryItem;
  onSave: (data: InventoryFormData) => Promise<void>;
  isLoading?: boolean;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave
}) => {
  const { t } = useTranslation('inventory');
  const title = product ? t('form.edit_product') : t('form.add_product');
  const mode = product ? 'edit' : 'create';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
    >
      <ProductForm
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={onSave}
        initialData={product}
        mode={mode}
      />
    </Modal>
  );
};

export default ProductModal;