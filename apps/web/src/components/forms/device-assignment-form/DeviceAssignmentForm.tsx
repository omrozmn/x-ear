import React from 'react';
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
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={assignment ? 'Cihaz Atamasını Düzenle' : 'Yeni Cihaz Ataması'}
      size="xl"
      showFooter={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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