import React, { useState, useEffect } from 'react';
import { usePatientDevices } from '../hooks/patient/usePatientDevices';
import { PatientDeviceCard } from './patient/PatientDeviceCard';
import { LoadingSkeleton } from './common/LoadingSkeleton';
import { ErrorBoundary } from './common/ErrorBoundary';
import { DeviceAssignmentForm } from './forms/DeviceAssignmentForm';
import { DeviceEditModal } from './patient/DeviceEditModal';
import { DeviceTrialModal } from './patient/DeviceTrialModal';
import { DeviceMaintenanceModal } from './patient/DeviceMaintenanceModal';
import { InventoryManagementModal } from './patient/InventoryManagementModal';
import { Smartphone, AlertCircle, Plus, Edit, Trash2, RefreshCw, Settings } from 'lucide-react';
import { Button } from './ui/Button';
import { PatientDevice } from '../types/patient';

interface DeviceAssignment {
  id?: string;
  deviceId: string;
  patientId: string;
  assignedDate: string;
  assignedBy: string;
  status: 'assigned' | 'trial' | 'returned' | 'defective';
  ear: 'left' | 'right' | 'both';
  reason: 'sale' | 'service' | 'repair' | 'trial' | 'replacement' | 'proposal' | 'other';
  notes?: string;
  trialEndDate?: string;
  returnDate?: string;
  condition?: string;
  listPrice?: number;
  salePrice?: number;
  sgkSupportType?: string;
  sgkReduction?: number;
  discountType?: 'none' | 'percentage' | 'amount';
  discountValue?: number;
  patientPayment?: number;
  downPayment?: number;
  remainingAmount?: number;
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'installment';
  installmentCount?: number;
  monthlyInstallment?: number;
  serialNumber?: string;
  serialNumberLeft?: string;
  serialNumberRight?: string;
  trialListPrice?: number;
  trialPrice?: number;
}

interface PatientDevicesTabProps {
  patientId: string;
  devices?: PatientDevice[];
  tabCount?: number;
}

export const PatientDevicesTab: React.FC<PatientDevicesTabProps> = ({
  patientId,
  devices,
  tabCount
}) => {
  // State management
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<PatientDevice | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<PatientDevice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch devices data
  const { data: fetchedDevices = [], isLoading, error } = usePatientDevices(patientId);

  // Use provided devices or fetched devices
  const devicesList = devices || fetchedDevices;

  // Helper function to convert PatientDevice to DeviceAssignment
  const convertToDeviceAssignment = (device: PatientDevice | null): DeviceAssignment | null => {
    if (!device) return null;
    
    return {
      id: device.id,
      deviceId: device.id,
      patientId: patientId,
      assignedDate: device.assignedDate || new Date().toISOString(),
      assignedBy: device.assignedBy || 'Current User',
      status: device.status as 'assigned' | 'trial' | 'returned' | 'defective',
      ear: device.ear === 'bilateral' ? 'both' : (device.ear || 'both') as 'left' | 'right' | 'both',
      reason: device.reason === 'new' ? 'sale' : device.reason === 'warranty' ? 'service' : device.reason === 'upgrade' ? 'replacement' : (device.reason || 'sale') as 'sale' | 'service' | 'repair' | 'trial' | 'replacement' | 'proposal' | 'other',
      notes: device.notes,
      trialEndDate: device.trialEndDate,
      listPrice: device.listPrice,
      salePrice: device.salePrice,
      sgkReduction: device.sgkReduction,
      patientPayment: device.patientPayment,
      paymentMethod: device.paymentMethod,
      serialNumber: device.serialNumber,
    };
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || actionError) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setActionError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, actionError]);

  const handleDeviceClick = (device: PatientDevice) => {
    console.log('Device clicked:', device);
  };

  const handleAssignDevice = () => {
    setEditingDevice(null);
    setShowAssignmentForm(true);
    setActionError(null);
  };

  const handleEditDevice = (device: PatientDevice) => {
    setEditingDevice(device);
    setShowEditModal(true);
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditingDevice(null);
  };

  const handleDeviceUpdate = async (updatedDevice: PatientDevice) => {
    try {
      setActionError(null);
      // TODO: Implement API call to update device
      console.log('Updating device:', updatedDevice);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage('Cihaz başarıyla güncellendi');
      setShowEditModal(false);
      setEditingDevice(null);
      
      // TODO: Refresh devices list
    } catch (error) {
      console.error('Error updating device:', error);
      setActionError('Cihaz güncellenirken bir hata oluştu');
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      setActionError(null);
      // TODO: Implement API call to remove device
      console.log('Removing device:', deviceId);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage('Cihaz başarıyla kaldırıldı');
      
      // TODO: Refresh devices list
    } catch (error) {
      console.error('Error removing device:', error);
      setActionError('Cihaz kaldırılırken bir hata oluştu');
    }
  };

  const handleReplaceDevice = async (deviceId: string) => {
    try {
      setActionError(null);
      // TODO: Implement device replacement logic
      console.log('Replacing device:', deviceId);
      setSuccessMessage('Cihaz değiştirme işlemi başlatıldı');
    } catch (error) {
      console.error('Error replacing device:', error);
      setActionError('Cihaz değiştirilirken bir hata oluştu');
    }
  };

  const handleStartTrial = (device: PatientDevice) => {
    setSelectedDevice(device);
    setShowTrialModal(true);
  };

  const handleDeviceMaintenance = (device: PatientDevice) => {
    setSelectedDevice(device);
    setShowMaintenanceModal(true);
  };

  const handleInventoryManagement = () => {
    setShowInventoryModal(true);
  };

  const handleTrialModalClose = () => {
    setShowTrialModal(false);
    setSelectedDevice(null);
  };

  const handleMaintenanceModalClose = () => {
    setShowMaintenanceModal(false);
    setSelectedDevice(null);
  };

  const handleInventoryModalClose = () => {
    setShowInventoryModal(false);
  };

  const handleTrialSave = async (trialData: any) => {
    try {
      setActionError(null);
      console.log('Starting device trial:', trialData);
      setSuccessMessage('Cihaz deneme süreci başlatıldı');
      setShowTrialModal(false);
      setSelectedDevice(null);
      // TODO: Refresh devices list
    } catch (error) {
      console.error('Error starting trial:', error);
      setActionError('Deneme süreci başlatılırken hata oluştu');
    }
  };

  const handleMaintenanceSave = async (maintenanceData: any) => {
    try {
      setActionError(null);
      console.log('Scheduling device maintenance:', maintenanceData);
      setSuccessMessage('Cihaz bakım kaydı oluşturuldu');
      setShowMaintenanceModal(false);
      setSelectedDevice(null);
      // TODO: Refresh devices list
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
      setActionError('Bakım kaydı oluşturulurken hata oluştu');
    }
  };

  const handleAssignmentFormClose = () => {
    setShowAssignmentForm(false);
    setEditingDevice(null);
    setActionError(null);
  };

  const handleDeviceAssignment = async (assignmentData: any) => {
    try {
      setIsSubmitting(true);
      setActionError(null);
      
      if (editingDevice) {
        // Update existing device
        console.log('Updating device assignment:', assignmentData);
        setSuccessMessage('Cihaz ataması başarıyla güncellendi');
      } else {
        // Create new device assignment
        console.log('Creating new device assignment:', assignmentData);
        setSuccessMessage('Cihaz başarıyla atandı');
      }
      
      setShowAssignmentForm(false);
      setEditingDevice(null);
      
      // TODO: Refresh devices list
    } catch (error) {
      console.error('Error in device assignment:', error);
      setActionError(editingDevice ? 'Cihaz güncellenirken bir hata oluştu' : 'Cihaz atanırken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Smartphone className="w-5 h-5 mr-2" />
            Hasta Cihazları
          </h3>
        </div>
        <LoadingSkeleton lines={3} className="mb-4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Cihazlar yüklenirken hata oluştu</h3>
              <p className="mt-1 text-sm text-red-700">
                Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Smartphone className="w-5 h-5 mr-2" aria-hidden="true" />
          Hasta Cihazları {tabCount !== undefined && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {tabCount}
            </span>
          )}
        </h3>
        <button
          onClick={handleAssignDevice}
          aria-label="Cihaz ata"
          className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-6 h-6" aria-hidden="true" />
        </button>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{actionError}</p>
            </div>
          </div>
        </div>
      )}

      {devicesList.length === 0 ? (
        <div className="text-center py-12" role="status">
          <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz cihaz atanmamış</h3>
          <p className="text-gray-500 mb-4">
            Bu hastaya henüz cihaz atanmamış. Satış işlemi sonrasında cihazlar burada görünecek.
          </p>
          <button
            onClick={handleAssignDevice}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            İlk Cihazı Ata
          </button>
        </div>
      ) : (
        <div className="grid gap-4" role="list" aria-label="Hasta cihazları listesi">
          {devicesList.map((device) => (
            <div key={device.id} role="listitem" className="relative group">
              <PatientDeviceCard
                device={device}
                onDeviceClick={handleDeviceClick}
              />
              
              {/* Device action overlay */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex items-center space-x-1 bg-white rounded-lg shadow-lg border p-1">
                  <Button
                    onClick={() => handleEditDevice(device)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Düzenle"
                    disabled={isSubmitting}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleStartTrial(device)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                    title="Deneme Başlat"
                    disabled={isSubmitting}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeviceMaintenance(device)}
                    className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"
                    title="Bakım"
                    disabled={isSubmitting}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleReplaceDevice(device.id)}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded"
                    title="Değiştir"
                    disabled={isSubmitting}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleRemoveDevice(device.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Kaldır"
                    disabled={isSubmitting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAssignmentForm && (
          <DeviceAssignmentForm
            patientId={patientId}
            assignment={convertToDeviceAssignment(editingDevice)}
            isOpen={showAssignmentForm}
            onClose={handleAssignmentFormClose}
            onSave={handleDeviceAssignment}
          />
        )}

      {showEditModal && (
        <DeviceEditModal
          device={editingDevice}
          open={showEditModal}
          onClose={handleEditModalClose}
          onSave={handleDeviceUpdate}
        />
      )}

      {showTrialModal && selectedDevice && (
        <DeviceTrialModal
          device={selectedDevice}
          patientId={patientId}
          open={showTrialModal}
          onClose={handleTrialModalClose}
          onSave={handleTrialSave}
        />
      )}

      {showMaintenanceModal && selectedDevice && (
        <DeviceMaintenanceModal
          device={selectedDevice}
          open={showMaintenanceModal}
          onClose={handleMaintenanceModalClose}
          onSubmit={handleMaintenanceSave}
        />
      )}

      {showInventoryModal && (
        <InventoryManagementModal
          isOpen={showInventoryModal}
          onClose={handleInventoryModalClose}
        />
      )}
    </div>
  );
};