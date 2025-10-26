import React from 'react';
import { 
  Button, 
  Alert,
  Loading,
  Modal
} from '@x-ear/ui-web';
import { X, Edit, CheckCircle, AlertCircle } from 'lucide-react';
import { useEditSale } from './edit-sale-modal/hooks/useEditSale';
import { SaleFormFields } from './edit-sale-modal/components/SaleFormFields';
import { PaymentSummary } from './PaymentSummary';
import { SGKIntegration } from './SGKIntegration';
// import PaymentTrackingModal from '../../../payments/PaymentTrackingModal';
import type { EditSaleModalProps } from './edit-sale-modal/types';

export const EditSaleModal: React.FC<EditSaleModalProps> = ({
  isOpen,
  onClose,
  patient,
  sale,
  onSaleUpdate,
  loading = false
}) => {
  const {
    formData,
    state,
    availableDevices,
    sgkSchemes,
    paymentRecords,
    totalPaid,
    remainingBalance,
    discountPercentage,
    hasPayments,
    updateFormData,
    updateState,
    submitForm,
    resetForm,
    loadAvailableDevices
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

  const handleSgkSchemeSelect = (scheme: any) => {
    const coverage = Math.min(
      formData.listPrice * (scheme.coveragePercentage / 100), 
      scheme.maxAmount || Infinity
    );
    updateFormData({ sgkCoverage: coverage });
  };

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

                <SGKIntegration
                  patientAge={patient.age || 0}
                  isBilateral={formData.ear === 'both'}
                  onSGKUpdate={(sgkData) => {
                    // Handle SGK update
                  }}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-6 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Durum:</span>
                <select
                  value={state.saleStatus}
                  onChange={(e) => updateState({ saleStatus: e.target.value })}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="draft">Taslak</option>
                  <option value="confirmed">Onaylandı</option>
                  <option value="delivered">Teslim Edildi</option>
                  <option value="completed">Tamamlandı</option>
                  <option value="cancelled">İptal</option>
                </select>
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