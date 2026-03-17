import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('dashboard');
  return (
    <CashflowModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={onSubmit}
      isLoading={isLoading}
      title={t('cashRecord', 'Kasa Kaydı')}
      saveButtonText={t('save', 'Kaydet')}
      transactionTypeLabels={{
        income: t('sale', 'Satış'),
        expense: t('purchase', 'Alış'),
      }}
    />
  );
};
