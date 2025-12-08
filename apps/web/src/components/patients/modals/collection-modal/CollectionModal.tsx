import React from 'react';
import {
  Button,
  Alert,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@x-ear/ui-web';
import { X, CreditCard, FileText } from 'lucide-react';
import { useCollection } from './hooks/useCollection';
import { PaymentForm } from './components/PaymentForm';
import { PromissoryNoteForm } from './components/PromissoryNoteForm';
import { PosPaymentForm } from '../../../finance/PosPaymentForm';
import { CollectionSummary } from './components/CollectionSummary';
import type { CollectionModalProps } from './types';

export const CollectionModal: React.FC<CollectionModalProps> = ({
  isOpen,
  onClose,
  patient,
  sale,
  onPaymentCreate,
  onPromissoryPaymentCreate,
  onCreatePromissoryNote
}) => {
  const {
    state,
    installments,
    promissoryNotes,
    calculations,
    updateState,
    handleInstallmentSelection,
    submitPayment,
    submitPromissoryNote,
    collectPromissoryPayment,
    formatCurrency
  } = useCollection(sale, isOpen);

  if (!isOpen) return null;

  const handlePaymentSubmit = (formData: FormData) => {
    submitPayment(formData);
    if (onPaymentCreate) {
      onPaymentCreate(formData as any);
    }
  };

  const handlePromissoryNoteSubmit = (formData: FormData) => {
    submitPromissoryNote(formData);
    if (onCreatePromissoryNote) {
      onCreatePromissoryNote(formData as any);
    }
  };

  const handlePromissoryPaymentSubmit = (noteId: string, amount: number) => {
    collectPromissoryPayment(noteId, amount);
    if (onPromissoryPaymentCreate) {
      onPromissoryPaymentCreate({ id: noteId, amount, date: new Date().toISOString(), status: 'completed', method: 'promissory_note' } as any);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Tahsilat İşlemleri
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {patient.firstName} {patient.lastName} - Satış #{sale.id || 'N/A'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Panel - Summary */}
          <div className="w-1/3 p-6 border-r bg-gray-50 overflow-y-auto">
            <CollectionSummary
              sale={sale}
              calculations={calculations}
              promissoryNotes={promissoryNotes}
              formatCurrency={formatCurrency}
            />
          </div>

          {/* Right Panel - Forms */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Error/Success Messages */}
            {state.error && (
              <Alert variant="error" className="mb-4">
                {state.error}
              </Alert>
            )}

            {state.success && (
              <Alert variant="success" className="mb-4">
                {state.success}
              </Alert>
            )}

            {/* Tabs */}
            <Tabs value={state.activeTab} onValueChange={(value) => updateState({ activeTab: value as any })}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="payments" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Nakit / Havale
                </TabsTrigger>
                <TabsTrigger value="promissory" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Senet
                </TabsTrigger>
                <TabsTrigger value="pos" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Online POS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="payments" className="mt-6">
                <PaymentForm
                  state={state}
                  calculations={calculations}
                  installments={installments}
                  onStateUpdate={updateState}
                  onInstallmentSelection={handleInstallmentSelection}
                  onSubmit={handlePaymentSubmit}
                  formatCurrency={formatCurrency}
                />
              </TabsContent>

              <TabsContent value="promissory" className="mt-6">
                <PromissoryNoteForm
                  state={state}
                  promissoryNotes={promissoryNotes}
                  onStateUpdate={updateState}
                  onSubmitPromissoryNote={handlePromissoryNoteSubmit}
                  onPromissoryPayment={handlePromissoryPaymentSubmit}
                  formatCurrency={formatCurrency}
                />
              </TabsContent>

              <TabsContent value="pos" className="mt-6">
                {sale.id ? (
                  <PosPaymentForm
                    saleId={sale.id}
                    amount={calculations.remainingBalance}
                    onSuccess={() => {
                      // On success, we should probably close modal and refresh
                      if (onPaymentCreate) {
                        // Mock payment data as it's already created in backend
                        onPaymentCreate({
                          amount: calculations.remainingBalance,
                          paymentMethod: 'card',
                          status: 'paid'
                        } as any);
                      }
                    }}
                  />
                ) : (
                  <Alert variant="warning">
                    Online ödeme yapabilmek için önce satışı kaydetmeniz gerekmektedir.
                  </Alert>
                )}
              </TabsContent>
            </Tabs>

          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={state.isLoading}
          >
            Kapat
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CollectionModal;