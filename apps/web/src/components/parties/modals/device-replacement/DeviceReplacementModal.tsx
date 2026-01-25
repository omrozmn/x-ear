import React from 'react';
import { Button, Modal } from '@x-ear/ui-web';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useDeviceReplacement } from './hooks/useDeviceReplacement';
import { InventorySelector } from './components/InventorySelector';
import { ReplacementSummary } from './components/ReplacementSummary';
import {useCreatePatientReplacements as useCreatePartyReplacements} from '@/api/client/replacements.client';
import type { DeviceReplacementModalProps } from './types';

export const DeviceReplacementModal: React.FC<DeviceReplacementModalProps> = ({
  isOpen,
  onClose,
  party,
  device,
  onReplacementCreate
}) => {
  const {
    formData,
    state,
    filteredInventory,
    calculatePriceDifference,
    validateForm,
    updateFormData,
    updateState,
    resetForm
  } = useDeviceReplacement(isOpen);

  const createReplacementMutation = useCreatePartyReplacements();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    updateState({ isLoading: true, error: '' });

    try {
      const replacementData = {
        oldDeviceId: device?.id,
        newInventoryId: formData.selectedInventoryItem?.id,
        oldDeviceInfo: {
          id: device?.id,
          brand: device?.brand,
          model: device?.model,
          serialNumber: device?.serialNumber,
          price: device?.price
        },
        newDeviceInfo: {
          id: formData.selectedInventoryItem?.id,
          brand: formData.selectedInventoryItem?.brand,
          model: formData.selectedInventoryItem?.model,
          price: formData.selectedInventoryItem?.price
        },
        replacementReason: formData.replacementReason,
        priceDifference: calculatePriceDifference(device),
        notes: formData.notes
      };

      // Call real API
      await createReplacementMutation.mutateAsync({
        partyId: party.id,
        data: replacementData
      });

      // Notify parent component
      onReplacementCreate({
        ...replacementData,
        createReturnInvoice: formData.createReturnInvoice,
        invoiceType: formData.invoiceType,
        timestamp: new Date().toISOString()
      });

      updateState({ success: true, isLoading: false });

      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);

    } catch (error: unknown) {
      console.error('Replacement error:', error);
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      updateState({
        isLoading: false,
        error: err?.response?.data?.detail || err?.message || 'Değişim işlemi sırasında hata oluştu. Lütfen tekrar deneyin.'
      });
    }
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  if (!device) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Cihaz Değişimi
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {party.name} - {device.brand} {device.model}
            </p>
          </div>
        </div>

        {state.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{state.error}</span>
          </div>
        )}

        {state.success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-green-700">Cihaz değişimi başarıyla tamamlandı!</span>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Değişim Nedeni *
            </label>
            <select
              value={formData.replacementReason}
              onChange={(e) => updateFormData({ replacementReason: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Seçiniz</option>
              <option value="malfunction">Arıza</option>
              <option value="upgrade">Yükseltme</option>
              <option value="comfort">Konfor</option>
              <option value="medical">Tıbbi Gereklilik</option>
              <option value="warranty">Garanti</option>
              <option value="other">Diğer</option>
            </select>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Yeni Cihaz Seçimi
            </h3>
            <InventorySelector
              searchTerm={state.searchTerm}
              onSearchChange={(value) => updateState({ searchTerm: value })}
              inventoryItems={filteredInventory}
              selectedItem={formData.selectedInventoryItem}
              onItemSelect={(item) => updateFormData({ selectedInventoryItem: item })}
              formatCurrency={formatCurrency}
            />
          </div>

          <ReplacementSummary
            device={device}
            selectedInventoryItem={formData.selectedInventoryItem}
            priceDifference={calculatePriceDifference(device)}
            createReturnInvoice={formData.createReturnInvoice}
            onCreateReturnInvoiceChange={(value) => updateFormData({ createReturnInvoice: value })}
            invoiceType={formData.invoiceType}
            onInvoiceTypeChange={(value) => updateFormData({ invoiceType: value })}
            notes={formData.notes}
            onNotesChange={(value) => updateFormData({ notes: value })}
            formatCurrency={formatCurrency}
          />
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={state.isLoading}
          >
            İptal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={state.isLoading || !formData.replacementReason || !formData.selectedInventoryItem}
          >
            {state.isLoading ? 'İşleniyor...' : 'Değişimi Tamamla'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeviceReplacementModal;