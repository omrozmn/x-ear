import React, { useCallback, useState } from 'react';
import { Button, Modal, Input, Textarea } from '@x-ear/ui-web';
import { Save } from 'lucide-react';
import { DeviceSearchForm } from './components/DeviceSearchForm';
import { AssignmentDetailsForm } from './components/AssignmentDetailsForm';
import { PricingForm } from './components/PricingForm';
import { SerialNumberForm } from './components/SerialNumberForm';
import { useDeviceAssignment } from './hooks/useDeviceAssignment';
import { DeviceAssignment } from './components/AssignmentDetailsForm';

export interface DeviceAssignmentFormProps {
  partyId: string;
  assignment?: DeviceAssignment | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (assignment: DeviceAssignment) => Promise<void> | void;
  onUpdate?: (assignment: DeviceAssignment) => Promise<void> | void;
}



export const DeviceAssignmentForm: React.FC<DeviceAssignmentFormProps> = ({
  partyId,
  assignment,
  isOpen,
  onClose,
  onSave,
  onUpdate
}) => {
  /* Manual Device Entry State */
  const [isManualMode, setIsManualMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [manualDevice, setManualDevice] = useState({
    brand: '',
    model: '',
    serialNumber: ''
  });

  const {
    formData,
    updateFormData,
    filteredDevices,
    selectedDevice,
    searchTerm,
    setSearchTerm,
    handleDeviceSelect,
    errors,
    validateForm,
    resetForm,
    calculatedPricing,
    setSelectedDevice
  } = useDeviceAssignment({
    partyId,
    assignment,
    isOpen
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isManualMode && !validateForm()) {
      return;
    }

    if (isManualMode) {
      if (!manualDevice.brand || !manualDevice.model) {
        // Simple validation for manual mode
        alert('Marka ve Model zorunludur.');
        return;
      }
    }

    setIsSaving(true); // Set saving state to true
    try {
      // Merge canonical calculated pricing into submission payload to ensure saved records
      // include the SGK reduction, salePrice and party payment values.
      let assignmentData = ({ ...formData, ...calculatedPricing } as DeviceAssignment);

      // Inject mode for parent handler compatibility
      assignmentData.mode = isManualMode ? 'manual' : 'inventory';

      // Map deviceId to inventoryId for parent compatibility if not manual
      if (!isManualMode && formData.deviceId) {
        assignmentData.inventoryId = formData.deviceId;
      }

      if (isManualMode) {
        // If manual mode, clear deviceId (inventoryId) and attach manual info
        // We'll use a special structure or simple fields that parent component understands
        assignmentData = {
          ...assignmentData,
          deviceId: '', // No inventory ID
          manualBrand: manualDevice.brand,
          manualModel: manualDevice.model,
          serialNumber: formData.serialNumber || formData.serialNumberLeft || formData.serialNumberRight || manualDevice.serialNumber
        };

        // Ensure pricing fields are present for manual mode (they might be 0/custom)
        // Since we don't have a base price from inventory, we rely on user input listPrice
        if (!assignmentData.listPrice) {
          alert('Lütfen liste fiyatı giriniz.');
          return;
        }
      } else if (selectedDevice) {
        // Inventory mode: Inject selected device details to avoid lookup failures in parent
        assignmentData.brand = selectedDevice.brand;
        assignmentData.model = selectedDevice.model;
        assignmentData.deviceType = selectedDevice.category;
        // If no serial number selected in form, but device is unique/has one, might need to handle it.
        // Usually serial number form handles selection.
      }

      // Debug logging disabled to reduce console noise
      // console.log('💾 [DeviceAssignmentForm] KAYDET BAŞLANGIÇ');
      // console.log('💾 [DeviceAssignmentForm] assignment?.id:', assignment?.id);
      // console.log('💾 [DeviceAssignmentForm] assignmentData:', assignmentData);

      if (assignment?.id) {
        // Update existing assignment
        await onUpdate?.(assignmentData); // Await the update
      } else {
        // Create new assignment
        await onSave?.(assignmentData); // Await the save
      }

      onClose();
    } catch (error) {
      console.error('Cihaz ataması kaydedilirken hata:', error);
    } finally {
      setIsSaving(false); // Always reset saving state
    }
  };

  const handleCancel = () => {
    resetForm();
    setIsManualMode(false);
    setManualDevice({ brand: '', model: '', serialNumber: '' });
    onClose();
  };

  // Memoize the callback to prevent unnecessary re-renders
  // Use updateFormData directly for single field updates
  const handleFormDataChange = useCallback((data: Partial<DeviceAssignment>) => {
    // If only one field, use updateFormData directly
    const entries = Object.entries(data);
    if (entries.length === 1) {
      const [key, value] = entries[0];
      updateFormData(key as keyof DeviceAssignment, value);
    } else {
      // Multiple fields - update all at once
      entries.forEach(([key, value]) => {
        updateFormData(key as keyof DeviceAssignment, value);
      });
    }
  }, [updateFormData]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={assignment ? 'Cihaz Atamasını Düzenle' : 'Yeni Cihaz Ataması'}
      size="xl"
      showFooter={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Device Search - Only show in create mode or collapsed in edit mode */}
        {!assignment && (
          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Cihaz Seçimi</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsManualMode(!isManualMode);
                  setSelectedDevice(null);
                  setSearchTerm('');
                }}
                className="text-blue-600 hover:text-blue-700"
              >
                {isManualMode ? 'Stoktan Seç' : 'Manuel Ekle'}
              </Button>
            </div>

            {isManualMode ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marka</label>
                    <Input
                      type="text"
                      value={manualDevice.brand}
                      onChange={e => setManualDevice({ ...manualDevice, brand: e.target.value })}
                      placeholder="Örn: Phonak"
                      className="dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
                    <Input
                      type="text"
                      value={manualDevice.model}
                      onChange={e => setManualDevice({ ...manualDevice, model: e.target.value })}
                      placeholder="Örn: Paradise P90"
                      className="dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <DeviceSearchForm
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filteredDevices={filteredDevices}
                selectedDevice={selectedDevice}
                onDeviceSelect={handleDeviceSelect}
                errors={errors}
              />
            )}
          </div>
        )}

        {/* ... existing edit mode rendering ... */}
        {/* In edit mode, we generally don't switch to manual mode easily without breaking existing link logic. 
            For now, manual mode is primarily for NEW assignments where stock is missing. 
        */}
        {assignment && selectedDevice && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Seçili Cihaz</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedDevice.brand} {selectedDevice.model}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Barkod: {selectedDevice.barcode || '-'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  // Show device search in edit mode
                  const searchSection = document.getElementById('device-search-section');
                  if (searchSection) {
                    searchSection.style.display = searchSection.style.display === 'none' ? 'block' : 'none';
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Farklı Cihaz Seç
              </button>
            </div>
          </div>
        )}

        {/* Device Search in edit mode (hidden by default) */}
        {assignment && (
          <div id="device-search-section" style={{ display: 'none' }} className="bg-gray-50 dark:bg-slate-900 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Farklı Cihaz Seç</h3>
            <DeviceSearchForm
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filteredDevices={filteredDevices}
              selectedDevice={selectedDevice}
              onDeviceSelect={handleDeviceSelect}
              errors={errors}
            />
          </div>
        )}

        {/* Assignment Details - Show if device selected OR isManualMode */}
        {(selectedDevice || isManualMode) && (
          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Atama Detayları</h3>
            <AssignmentDetailsForm
              formData={formData}
              onFormDataChange={handleFormDataChange}
              errors={errors}
              isManualMode={isManualMode}
            />
          </div>
        )}

        {/* Pricing */}
        {(selectedDevice || isManualMode) && formData.reason === 'sale' && (
          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Fiyatlandırma</h3>
            <PricingForm
              formData={formData}
              onFormDataChange={handleFormDataChange}
              errors={errors}
            />
          </div>
        )}

        {/* Serial Numbers */}
        {(selectedDevice || isManualMode) && (
          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Seri Numarası</h3>
            <SerialNumberForm
              formData={formData}
              selectedDevice={selectedDevice} // Optional in manual mode
              onFormDataChange={handleFormDataChange}
              errors={errors}
              isManualMode={isManualMode}
            />
          </div>
        )}

        {/* Notes - At the bottom */}
        {(selectedDevice || isManualMode) && (
          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Notlar</h3>
            <div className="relative">
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => updateFormData('notes', e.target.value)}
                placeholder="Cihaz ataması ile ilgili notlar..."
                rows={3}
                className="resize-none dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={(!selectedDevice && !isManualMode) || isSaving}
            loading={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {assignment ? 'Güncelle' : 'Kaydet'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};