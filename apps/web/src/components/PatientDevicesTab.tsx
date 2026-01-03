import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePatientDevices } from '../hooks/patient/usePatientDevices';
import { PatientDeviceCard } from './patient/PatientDeviceCard';
import { LoadingSkeleton } from './common/LoadingSkeleton';
import { DeviceAssignmentForm } from './forms/DeviceAssignmentForm';
import { DeviceEditModal } from './patient/DeviceEditModal';
import { DeviceTrialModal } from './patient/DeviceTrialModal';
import { DeviceMaintenanceModal } from './patient/DeviceMaintenanceModal';
import { InventoryManagementModal } from './patient/InventoryManagementModal';
import { DeviceReplaceModal } from './patient/DeviceReplaceModal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Smartphone, AlertCircle, Plus } from 'lucide-react';
import { PatientDevice } from '../types/patient';

// Orval Hooks
import {
  useSalesUpdateDeviceAssignment,
  useSalesReturnLoanerToStock,
  useSalesAssignDevicesExtended,
  useReplacementsCreatePatientReplacement
} from '@/api/generated';
import {
  SalesAssignDevicesExtendedBody,
  ReplacementsCreatePatientReplacementBody
} from '@/api/generated/schemas';

// Local interface
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
  reportStatus?: 'received' | 'pending' | 'none';
  // Loaner fields
  isLoaner?: boolean;
  loanerInventoryId?: string;
  loanerSerialNumber?: string;
  loanerSerialNumberLeft?: string;
  loanerSerialNumberRight?: string;
  loanerBrand?: string;
  loanerModel?: string;
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
  const queryClient = useQueryClient();

  // State management
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<PatientDevice | null>(null);
  const [prefillAssignment, setPrefillAssignment] = useState<DeviceAssignment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<PatientDevice | null>(null);
  const [_isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [deviceToCancel, setDeviceToCancel] = useState<string | null>(null);
  const [deviceToReturn, setDeviceToReturn] = useState<PatientDevice | null>(null);

  // Mutations
  const updateDeviceMutation = useSalesUpdateDeviceAssignment();
  const returnLoanerMutation = useSalesReturnLoanerToStock();
  const createReplacementMutation = useReplacementsCreatePatientReplacement();
  const assignDevicesMutation = useSalesAssignDevicesExtended();

  // Fetch devices data
  const { data: fetchedDevices = [], isLoading, error, refetch } = usePatientDevices(patientId);

  // Use provided devices or fetched devices, sort by assignedDate (newest first)
  const devicesList = (devices || fetchedDevices).sort((a, b) => {
    const dateA = new Date(a.assignedDate || 0).getTime();
    const dateB = new Date(b.assignedDate || 0).getTime();
    return dateB - dateA; // Newest first
  });

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

  const handleAssignDevice = () => {
    setEditingDevice(null);
    setShowAssignmentForm(true);
    setActionError(null);
  };

  const handleEditDevice = (device: PatientDevice) => {
    console.log('🔧 [handleEditDevice] Incoming device:', device);
    // CRITICAL: Always find the original device from the main list.
    const originalDevice = devicesList.find(d => d.id === device.id) || device;
    console.log('🔧 [handleEditDevice] Original device from list:', originalDevice);
    console.log('🔧 [handleEditDevice] Has loaner fields?', {
      loanerBrand: (originalDevice as any).loanerBrand,
      loanerModel: (originalDevice as any).loanerModel,
      isLoaner: (originalDevice as any).isLoaner
    });
    setEditingDevice(originalDevice);
    setShowAssignmentForm(true);
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditingDevice(null);
  };

  const handleCancelDevice = (deviceId: string) => {
    setDeviceToCancel(deviceId);
    setShowCancelConfirm(true);
  };

  const confirmCancelDevice = async () => {
    if (!deviceToCancel) return;

    try {
      setIsSubmitting(true);
      setActionError(null);

      // Update device status to cancelled using mutation
      await updateDeviceMutation.mutateAsync({ assignmentId: deviceToCancel });

      setSuccessMessage('Cihaz ataması iptal edildi');
      await refetch();
      window.dispatchEvent(new CustomEvent('device:updated'));
    } catch (error: any) {
      console.error('Error cancelling device:', error);
      const msg = error?.response?.data?.message || error.message || 'Cihaz iptal edilirken bir hata oluştu';
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
      setShowCancelConfirm(false);
      setDeviceToCancel(null);
    }
  };

  const handleReturnLoaner = (device: PatientDevice) => {
    setDeviceToReturn(device);
    setShowReturnConfirm(true);
  };

  const confirmReturnLoaner = async () => {
    if (!deviceToReturn) return;

    try {
      setIsSubmitting(true);
      setActionError(null);

      const assignmentId = deviceToReturn.id;

      await returnLoanerMutation.mutateAsync({ assignmentId });

      setSuccessMessage('Emanet cihaz stoğa geri alındı');
      await refetch();
      window.dispatchEvent(new CustomEvent('device:updated'));

    } catch (error: any) {
      console.error('Error returning loaner:', error);
      const msg = error?.response?.data?.message || error.message || 'Cihaz iade edilirken bir hata oluştu';
      setActionError(msg);
    } finally {
      setIsSubmitting(false);
      setShowReturnConfirm(false);
      setDeviceToReturn(null);
    }
  };

  const handleReplaceDevice = async (deviceId: string) => {
    const device = devicesList.find(d => d.id === deviceId);
    if (device) {
      setSelectedDevice(device);
      setShowReplaceModal(true);
    }
  };

  const handleReplaceConfirm = async (deviceId: string, reason: string, notes: string, newInventoryId?: string, newDeviceInfo?: any, selectedSerial?: string) => {
    try {
      setActionError(null);
      const device = devicesList.find(d => d.id === deviceId);
      if (!device) throw new Error('Cihaz bulunamadı');

      const payload: ReplacementsCreatePatientReplacementBody = {
        oldDeviceId: device.id,
        oldDeviceInfo: {
          id: device.id,
          brand: device.brand,
          model: device.model,
          serial: device.serialNumber,
          type: device.type,
          notes: device.notes,
        },
        replacementReason: reason,
        notes: notes,
        createdBy: 'current_user',
        ...(newInventoryId ? {
          newInventoryId,
          newDeviceInfo: {
            ...(newDeviceInfo || { id: newInventoryId }),
            serial: selectedSerial || newDeviceInfo?.serial,
            availableInventory: newDeviceInfo?.availableInventory ?? 0
          }
        } : {})
      } as any;

      if (newInventoryId) {
        const avail = (payload as any).newDeviceInfo?.availableInventory || 0;
        if (avail === 0) {
          const note = 'STOK: stokta olmayan ürün satıldı';
          (payload as any).notes = ((payload as any).notes ? (payload as any).notes + '\n' : '') + note;
        }
      }

      console.log('📤 Creating replacement with payload:', payload);

      const response = await createReplacementMutation.mutateAsync({
        patientId,
        data: payload
      }) as any;

      console.log('📥 Replacement create response:', response);

      if (response?.status >= 400) {
        throw new Error(`Backend error: ${response.status}`);
      }

      setSuccessMessage('Değişim bildirimi oluşturuldu');
      window.dispatchEvent(new CustomEvent('replacement:created', { detail: response?.data }));
      await refetch();

      if (newInventoryId) {
        const prefill: DeviceAssignment = {
          deviceId: newInventoryId,
          patientId: patientId,
          assignedDate: new Date().toISOString(),
          assignedBy: 'current_user',
          status: 'assigned',
          ear: device.ear === 'both' ? 'both' : device.ear === 'left' ? 'left' : 'right',
          reason: 'replacement',
          notes: notes || '',
          listPrice: newDeviceInfo?.listPrice || undefined,
          salePrice: newDeviceInfo?.salePrice || undefined,
          serialNumber: selectedSerial || (newDeviceInfo && newDeviceInfo.serial) || undefined,
        } as DeviceAssignment;

        if ((newDeviceInfo && newDeviceInfo.availableInventory) === 0) {
          prefill.notes = (prefill.notes ? prefill.notes + '\n' : '') + 'STOK: stokta olmayan ürün satıldı';
        }
        setPrefillAssignment(prefill);
      } else {
        setPrefillAssignment(null);
      }
    } catch (error: any) {
      console.error('Error creating replacement:', error);
      const msg = error?.response?.data?.message || error.message || 'Cihaz değiştirirken bir hata oluştu';
      setActionError(msg);
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
        console.log('Updating device assignment:', assignmentData);

        const updateData: any = {
          ear_side: assignmentData.ear,
          reason: assignmentData.reason || 'sale',
          base_price: assignmentData.listPrice || 0,
          sale_price: assignmentData.salePrice || 0,
          sgk_reduction: assignmentData.sgkReduction || 0,
          patient_payment: assignmentData.patientPayment || 0,
          kdv_rate: assignmentData.kdvRate ?? 0,
          discount_type: assignmentData.discountType || 'none',
          discount_value: assignmentData.discountValue || 0,
          payment_method: assignmentData.paymentMethod || 'cash',
          notes: assignmentData.notes || '',
          serial_number: assignmentData.serialNumber,
          serial_number_left: assignmentData.serialNumberLeft,
          serial_number_right: assignmentData.serialNumberRight,
          sgk_scheme: assignmentData.sgkSupportType || 'no_coverage',
          down_payment: assignmentData.downPayment || 0,
          // Only include device_id/inventory_id if it's actually changing
          ...(assignmentData.deviceId !== editingDevice.id && assignmentData.deviceId ? {
            device_id: assignmentData.deviceId,
            inventory_id: assignmentData.deviceId
          } : {}),
          delivery_status: assignmentData.deliveryStatus || 'pending',
          is_loaner: assignmentData.isLoaner || false,
          report_status: assignmentData.reportStatus || undefined,
          loaner_inventory_id: assignmentData.loanerInventoryId,
          loaner_serial_number: assignmentData.loanerSerialNumber,
          loaner_serial_number_left: assignmentData.loanerSerialNumberLeft,
          loaner_serial_number_right: assignmentData.loanerSerialNumberRight,
          loaner_brand: assignmentData.loanerBrand,
          loaner_model: assignmentData.loanerModel
        };

        console.log('📤 Sending device update data:', updateData);

        const updateResponse = await updateDeviceMutation.mutateAsync({
          assignmentId: editingDevice.id,
          data: updateData
        });
        
        console.log('✅ Update response from backend:', updateResponse);
        console.log('✅ Update response data:', updateResponse?.data);

        setSuccessMessage('Cihaz ataması başarıyla güncellendi');
        console.log('🔄 Waiting 500ms before refetch...');
        await new Promise(resolve => setTimeout(resolve, 500));
        await refetch();
        window.dispatchEvent(new CustomEvent('device:updated'));
      } else {
        console.log('Creating new device assignment:', assignmentData);

        const apiData: SalesAssignDevicesExtendedBody = {
          device_assignments: [{
            inventoryId: assignmentData.deviceId,
            ear_side: assignmentData.ear,
            reason: assignmentData.reason || 'sale',
            base_price: assignmentData.listPrice || 0,
            sale_price: assignmentData.salePrice || 0,
            sgk_reduction: assignmentData.sgkReduction || 0,
            patient_payment: assignmentData.patientPayment || 0,
            kdv_rate: assignmentData.kdvRate ?? 0,
            discount_type: assignmentData.discountType || 'none',
            discount_value: assignmentData.discountValue || 0,
            payment_method: assignmentData.paymentMethod || 'cash',
            notes: assignmentData.notes || '',
            serial_number: assignmentData.serialNumber,
            serial_number_left: assignmentData.serialNumberLeft,
            serial_number_right: assignmentData.serialNumberRight,
            is_loaner: assignmentData.isLoaner,
            loaner_inventory_id: assignmentData.loanerInventoryId,
            loaner_serial_number: assignmentData.loanerSerialNumber,
            loaner_serial_number_left: assignmentData.loanerSerialNumberLeft,
            loaner_serial_number_right: assignmentData.loanerSerialNumberRight,
            loaner_brand: assignmentData.loanerBrand,
            loaner_model: assignmentData.loanerModel
          } as any],
          sgk_scheme: assignmentData.sgkSupportType || 'no_coverage',
          paidAmount: assignmentData.downPayment || 0,
          downPayment: assignmentData.downPayment || 0,
          payment_plan: assignmentData.paymentMethod || 'cash',
          user_id: 'current_user',
          accessories: [],
          services: []
        };

        console.log('📤 Sending device assignment data:', apiData);

        await assignDevicesMutation.mutateAsync({
          patientId,
          data: apiData
        });

        setSuccessMessage('Cihaz başarıyla atandı ve satış kaydı oluşturuldu');
        await refetch();
        window.dispatchEvent(new CustomEvent('device:assigned'));
      }

      setShowAssignmentForm(false);
      setEditingDevice(null);
    } catch (error: any) {
      console.error('Error in device assignment:', error);
      console.error('❌ Error response:', error?.response);
      console.error('❌ Error response data:', error?.response?.data);
      console.error('❌ Error response status:', error?.response?.status);
      console.error('❌ Error response headers:', error?.response?.headers);
      
      // Extract detailed error message
      let errorMsg = 'Hata oluştu';
      if (error?.response?.data?.detail) {
        errorMsg = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail);
      } else if (error?.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error?.message) {
        errorMsg = error.message;
      }
      
      setActionError(errorMsg);
      
      // Don't close the form on error so user can fix and retry
      // setShowAssignmentForm(false);
      // setEditingDevice(null);
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
        <div className="bg-green-50 border border-red-200 rounded-lg p-4" role="alert">
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
        <div className="space-y-4" role="list" aria-label="Hasta cihazları listesi">
          {devicesList.map((device) => {
            const isBilateral = device.ear === 'both' || device.ear === 'bilateral' || (device as any).earSide === 'BOTH';

            if (isBilateral) {
              const dp = device as any;
              const perItemSale = dp.salePricePerItem || Number(dp.netPayable || 0) / 2 || 0;
              const perItemSgk = dp.sgkSupportPerItem || Number(dp.sgkSupport || 0) / 2 || 0;

              const rightCard = { ...device, ear: 'right', earSide: 'RIGHT', side: 'right', salePricePerItem: perItemSale, sgkSupportPerItem: perItemSgk } as any;
              const leftCard = { ...device, ear: 'left', earSide: 'LEFT', side: 'left', salePricePerItem: perItemSale, sgkSupportPerItem: perItemSgk } as any;

              return (
                <div key={device.id} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PatientDeviceCard
                    device={rightCard}
                    onEdit={handleEditDevice}
                    onReplace={(d) => handleReplaceDevice(d.id)}
                    onCancel={(d) => handleCancelDevice(d.id)}
                    onReturnLoaner={handleReturnLoaner}
                    isCancelled={(device as any).status === 'cancelled'}
                  />
                  <PatientDeviceCard
                    device={leftCard}
                    onEdit={handleEditDevice}
                    onReplace={(d) => handleReplaceDevice(d.id)}
                    onCancel={(d) => handleCancelDevice(d.id)}
                    onReturnLoaner={handleReturnLoaner}
                    isCancelled={(device as any).status === 'cancelled'}
                  />
                </div>
              );
            }

            const isRight = device.ear === 'right' || device.ear === 'R' || (device as any).earSide === 'RIGHT';

            return (
              <div key={device.id} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isRight ? (
                  <>
                    <PatientDeviceCard
                      device={device}
                      onEdit={handleEditDevice}
                      onReplace={(d) => handleReplaceDevice(d.id)}
                      onCancel={(d) => handleCancelDevice(d.id)}
                      onReturnLoaner={handleReturnLoaner}
                      isCancelled={(device as any).status === 'cancelled'}
                    />
                    <div className="hidden md:block border-2 border-dashed border-gray-200 rounded-lg p-6 flex items-center justify-center">
                      <p className="text-gray-400 text-sm">Sol kulak boş</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="hidden md:block border-2 border-dashed border-gray-200 rounded-lg p-6 flex items-center justify-center">
                      <p className="text-gray-400 text-sm">Sağ kulak boş</p>
                    </div>
                    <PatientDeviceCard
                      device={device}
                      onEdit={handleEditDevice}
                      onReplace={(d) => handleReplaceDevice(d.id)}
                      onCancel={(d) => handleCancelDevice(d.id)}
                      onReturnLoaner={handleReturnLoaner}
                      isCancelled={(device as any).status === 'cancelled'}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAssignmentForm && (
        <DeviceAssignmentForm
          patientId={patientId}
          isOpen={showAssignmentForm}
          onClose={handleAssignmentFormClose}
          onSave={handleDeviceAssignment}
          onUpdate={handleDeviceAssignment}
          assignment={editingDevice ? {
            ...editingDevice,
            // Keep original deviceId for inventory lookup, but also keep id for updates
            id: editingDevice.id,
            deviceId: (editingDevice as any).inventoryId || editingDevice.id,
            patientId: patientId,
            assignedDate: editingDevice.assignedDate || new Date().toISOString(),
            assignedBy: 'User',
            ear: (editingDevice.ear === 'both' ? 'both' : editingDevice.ear === 'right' ? 'right' : 'left'),
            reason: editingDevice.reason || 'sale',
            // Preserve all device information fields for fallback
            deviceName: (editingDevice as any).deviceName,
            // Loaner fields - preserve from original device
            isLoaner: (editingDevice as any).isLoaner,
            is_loaner: (editingDevice as any).is_loaner,
            loanerInventoryId: (editingDevice as any).loanerInventoryId,
            loaner_inventory_id: (editingDevice as any).loaner_inventory_id,
            loanerBrand: (editingDevice as any).loanerBrand,
            loaner_brand: (editingDevice as any).loaner_brand,
            loanerModel: (editingDevice as any).loanerModel,
            loaner_model: (editingDevice as any).loaner_model,
            loanerSerialNumber: (editingDevice as any).loanerSerialNumber,
            loaner_serial_number: (editingDevice as any).loaner_serial_number,
            loanerSerialNumberLeft: (editingDevice as any).loanerSerialNumberLeft,
            loaner_serial_number_left: (editingDevice as any).loaner_serial_number_left,
            loanerSerialNumberRight: (editingDevice as any).loanerSerialNumberRight,
            loaner_serial_number_right: (editingDevice as any).loaner_serial_number_right,
          } as any : prefillAssignment}
        />
      )}

      {selectedDevice && (
        <DeviceReplaceModal
          isOpen={showReplaceModal}
          onClose={() => setShowReplaceModal(false)}
          onReplace={async (deviceId, reason, notes, newInventoryId, newDeviceInfo, selectedSerial) => {
            await handleReplaceConfirm(deviceId, reason, notes, newInventoryId, newDeviceInfo, selectedSerial);
          }}
          device={selectedDevice}
          patientId={patientId}
        />
      )}

      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Cihaz Atamasını İptal Et"
        description="Bu işlem geri alınamaz. Cihaz atamasını iptal etmek istediğinize emin misiniz?"
        confirmLabel="Evet, İptal Et"
        cancelLabel="Vazgeç"
        onConfirm={confirmCancelDevice}
        onClose={() => setShowCancelConfirm(false)}
        variant="danger"
        isLoading={updateDeviceMutation.isPending}
      />

      <ConfirmDialog
        isOpen={showReturnConfirm}
        title="Emanet Cihazı İade Et"
        description="Bu emanet cihazı stoğa geri döndürmek istediğinize emin misiniz?"
        confirmLabel="Evet, İade Et"
        cancelLabel="Vazgeç"
        onConfirm={confirmReturnLoaner}
        onClose={() => setShowReturnConfirm(false)}
        variant="info"
        isLoading={returnLoanerMutation.isPending}
      />
    </div>
  );
};