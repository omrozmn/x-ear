import React from 'react';
import {
  Button,
  Alert,
  Loading,
  Modal,
  Select
} from '@x-ear/ui-web';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useEditSale } from './edit-sale-modal/hooks/useEditSale';
import { SaleFormFields } from './edit-sale-modal/components/SaleFormFields';
import { PaymentSummary } from './PaymentSummary';
import type { EditSaleModalProps } from './edit-sale-modal/types';

export const EditSaleModal: React.FC<EditSaleModalProps> = ({
  isOpen,
  onClose,
  sale,
  onSaleUpdate,
  loading = false
}) => {
  const {
    formData,
    state,
    availableDevices,
    updateFormData,
    updateState,
    submitForm,
    resetForm
  } = useEditSale(sale, isOpen);

  if (!isOpen) return null;

  const handleDeviceSelect = (device: any) => {
    updateFormData({
      deviceId: device.id || '',
      productName: device.name,
      brand: device.brand,
      model: device.model || '',
      listPrice: device.price,
      salePrice: device.price
    });
    updateState({ showDeviceSelector: false });
  };

  /*
  const handleSgkSchemeSelect = (scheme: any) => {
    const coverage = Math.min(
      formData.listPrice * (scheme.coveragePercentage / 100),
      scheme.maxAmount || Infinity
    );
    updateFormData({ sgkCoverage: coverage });
  };
  */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm(onSaleUpdate);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Satış Düzenle"
      size="xl"
      showFooter={false}
    >
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loading />
        </div>
      )}

      {state.error && (
        <Alert variant="error" className="mb-4">
          <AlertCircle className="w-4 h-4" />
          <span>{state.error}</span>
        </Alert>
      )}

      {state.success && (
        <Alert variant="success" className="mb-4">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-green-800">Satış başarıyla güncellendi!</span>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form Fields */}
          <div className="lg:col-span-2">
            <SaleFormFields
              formData={formData}
              state={state}
              availableDevices={availableDevices}
              onFormDataChange={updateFormData}
              onStateChange={updateState}
              onDeviceSelect={handleDeviceSelect}
            />
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-6">
            <PaymentSummary
              sale={sale}
              onPaymentUpdate={() => {
                // Handle payment update
              }}
            />

            {/* SGK Integration - Commented out as requested
                <SGKIntegration
                  partyAge={party.age || 0}
                  isBilateral={formData.ear === 'both'}
                  onSGKUpdate={(sgkData) => {
                    // Handle SGK update
                  }}
                />
                */}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Durum:</span>
            <Select
              value={state.saleStatus}
              onChange={(e: any) => updateState({ saleStatus: e.target.value })}
              options={[
                { value: 'draft', label: 'Taslak' },
                { value: 'confirmed', label: 'Onaylandı' },
                { value: 'delivered', label: 'Teslim Edildi' },
                { value: 'completed', label: 'Tamamlandı' },
                { value: 'cancelled', label: 'İptal' }
              ]}
              className="w-40"
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              İptal
            </Button>
            <Button
              type="submit"
              disabled={state.isSubmitting}
              className="min-w-[120px]"
            >
              {state.isSubmitting ? <Loading /> : 'Güncelle'}
            </Button>
          </div>
        </div>
      </form>

      {/* Payment Modal */}
      {state.showPaymentModal && (
        <div>
          {/* Payment modal content would go here */}
        </div>
      )}
    </Modal>
  );
};

export default EditSaleModal;