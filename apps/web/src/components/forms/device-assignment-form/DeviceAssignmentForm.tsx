import React, { useCallback, useState } from 'react';
import { Button, Modal } from '@x-ear/ui-web';
import { Save } from 'lucide-react';
import { DeviceSearchForm } from './components/DeviceSearchForm';
import { AssignmentDetailsForm } from './components/AssignmentDetailsForm';
import { PricingForm } from './components/PricingForm';
import { SerialNumberForm } from './components/SerialNumberForm';
import { useDeviceAssignment } from './hooks/useDeviceAssignment';
import { DeviceAssignment } from './components/AssignmentDetailsForm';

export interface DeviceAssignmentFormProps {
  patientId: string;
  assignment?: DeviceAssignment | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (assignment: DeviceAssignment) => void;
  onUpdate?: (assignment: DeviceAssignment) => void;
}

export const DeviceAssignmentForm: React.FC<DeviceAssignmentFormProps> = ({
  patientId,
  assignment,
  isOpen,
  onClose,
  onSave,
  onUpdate
}) => {
  /* Manual Device Entry State */
  const [isManualMode, setIsManualMode] = useState(false);
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
    patientId,
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

    try {
      // Merge canonical calculated pricing into submission payload to ensure saved records
      // include the SGK reduction, salePrice and patient payment values.
      let assignmentData = ({ ...formData, ...calculatedPricing } as DeviceAssignment);

      if (isManualMode) {
        // If manual mode, clear deviceId (inventoryId) and attach manual info
        // We'll use a special structure or simple fields that parent component understands
        assignmentData = {
          ...assignmentData,
          deviceId: '', // No inventory ID
          // Add these as custom fields that handleDeviceAssignment in PatientDevicesTab will need to map
          // We cast to any to bypass strict type check for now or extend interface
          manualBrand: manualDevice.brand,
          manualModel: manualDevice.model,
          serialNumber: formData.serialNumber || (formData as any).serialNumberLeft || (formData as any).serialNumberRight || manualDevice.serialNumber
        } as any;

        // Ensure pricing fields are present for manual mode (they might be 0/custom)
        // Since we don't have a base price from inventory, we rely on user input listPrice
        if (!assignmentData.listPrice) {
          alert('Lütfen liste fiyatı giriniz.');
          return;
        }
      }

      console.log('💾 [DeviceAssignmentForm] KAYDET BAŞLANGIÇ');
      console.log('💾 [DeviceAssignmentForm] assignment?.id:', assignment?.id);
      console.log('💾 [DeviceAssignmentForm] assignmentData:', assignmentData);
      console.log('💾 [DeviceAssignmentForm] deliveryStatus in formData:', formData.deliveryStatus);
      console.log('💾 [DeviceAssignmentForm] deliveryStatus in assignmentData:', (assignmentData as any).deliveryStatus);

      if (assignment?.id) {
        // Update existing assignment
        console.log('💾 [DeviceAssignmentForm] Calling onUpdate with:', assignmentData);
        onUpdate?.(assignmentData);
      } else {
        // Create new assignment
        console.log('💾 [DeviceAssignmentForm] Calling onSave with:', assignmentData);
        onSave?.(assignmentData);
      }

      console.log('💾 [DeviceAssignmentForm] onClose() çağrılıyor...');
      onClose();
    } catch (error) {
      console.error('Cihaz ataması kaydedilirken hata:', error);
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
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Cihaz Seçimi</h3>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      value={manualDevice.brand}
                      onChange={e => setManualDevice({ ...manualDevice, brand: e.target.value })}
                      placeholder="Örn: Phonak"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      value={manualDevice.model}
                      onChange={e => setManualDevice({ ...manualDevice, model: e.target.value })}
                      placeholder="Örn: Paradise P90"
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
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-blue-600 font-medium">Seçili Cihaz</p>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedDevice.brand} {selectedDevice.model}
                </p>
                <p className="text-sm text-gray-600">Barkod: {selectedDevice.barcode || '-'}</p>
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
          <div id="device-search-section" style={{ display: 'none' }} className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Farklı Cihaz Seç</h3>
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
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Atama Detayları</h3>
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
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Fiyatlandırma</h3>
            <PricingForm
              formData={formData}
              onFormDataChange={handleFormDataChange}
              errors={errors}
            />
          </div>
        )}

        {/* Serial Numbers */}
        {(selectedDevice || isManualMode) && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Seri Numarası</h3>
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
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notlar</h3>
            <div className="relative">
              <textarea
                value={formData.notes || ''}
                onChange={(e) => updateFormData('notes', e.target.value)}
                placeholder="Cihaz ataması ile ilgili notlar..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={!selectedDevice && !isManualMode}
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