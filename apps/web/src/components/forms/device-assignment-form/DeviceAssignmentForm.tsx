import React from 'react';
import { Button } from '@x-ear/ui-web';
import { X, Save } from 'lucide-react';
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    availableDevices,
    filteredDevices,
    selectedDevice,
    searchTerm,
    setSearchTerm,
    handleDeviceSelect,
    errors,
    validateForm,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sgkAmounts,
    resetForm
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
      const assignmentData = formData as DeviceAssignment;
      
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {assignment ? 'Cihaz Atamasını Düzenle' : 'Yeni Cihaz Ataması'}
          </h2>
          {/* eslint-disable-next-line no-restricted-syntax */}
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            data-allow-raw="true"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Device Search */}
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

            {/* Assignment Details */}
            {selectedDevice && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Atama Detayları</h3>
                <AssignmentDetailsForm
                  formData={formData}
                  onFormDataChange={(data) => {
                    Object.entries(data).forEach(([key, value]) => {
                      updateFormData(key as keyof DeviceAssignment, value);
                    });
                  }}
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
                  onFormDataChange={(data) => {
                    Object.entries(data).forEach(([key, value]) => {
                      updateFormData(key as keyof DeviceAssignment, value);
                    });
                  }}
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
                  onFormDataChange={(data) => {
                    Object.entries(data).forEach(([key, value]) => {
                      updateFormData(key as keyof DeviceAssignment, value);
                    });
                  }}
                  errors={errors}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
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
      </div>
    </div>
  );
};