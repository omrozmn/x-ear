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
  onSave,
  isLoading = false
}) => {
  const title = product ? 'Ürün Düzenle' : 'Yeni Ürün Ekle';
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