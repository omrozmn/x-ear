import React, { useCallback } from 'react';
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
    calculatedPricing
  } = useDeviceAssignment({
    patientId,
    assignment,
    isOpen
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Merge canonical calculated pricing into submission payload to ensure saved records
      // include the SGK reduction, salePrice and patient payment values.
      const assignmentData = ({ ...formData, ...calculatedPricing } as DeviceAssignment);

      if (assignment?.id) {
        // Update existing assignment
        onUpdate?.(assignmentData);
      } else {
        // Create new assignment
        onSave?.(assignmentData);
      }

      onClose();
    } catch (error) {
      console.error('Cihaz ataması kaydedilirken hata:', error);
    }
  };

  const handleCancel = () => {
    resetForm();
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cihaz Seçimi</h3>
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

        {/* In edit mode, show selected device info with option to change */}
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

        {/* Assignment Details */}
        {selectedDevice && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Atama Detayları</h3>
            <AssignmentDetailsForm
              formData={formData}
              onFormDataChange={handleFormDataChange}
              errors={errors}
            />
          </div>
        )}

        {/* Pricing */}
        {selectedDevice && formData.reason === 'sale' && (
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
        {selectedDevice && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Seri Numarası</h3>
            <SerialNumberForm
              formData={formData}
              selectedDevice={selectedDevice}
              onFormDataChange={handleFormDataChange}
              errors={errors}
            />
          </div>
        )}

        {/* Notes - At the bottom */}
        {selectedDevice && (
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
            disabled={!selectedDevice}
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