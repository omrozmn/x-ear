import React from 'react';
import type { CashRecordFormData } from '@/types/cashflow';
import { CashflowModal } from '@/components/cashflow/CashflowModal';

interface CashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CashRecordFormData) => Promise<void>;
  isLoading?: boolean;
}

export const CashRegisterModal: React.FC<CashRegisterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  return (
    <CashflowModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={onSubmit}
      isLoading={isLoading}
      title="Kasa Kaydı"
      saveButtonText="Kaydet"
      transactionTypeLabels={{
        income: 'Satış',
        expense: 'Alış',
      }}
    />
  );
};
