import React, { useState, useEffect } from 'react';
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
import { apiClient } from '../api/orval-mutator';

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
  const [deviceToCancel, setDeviceToCancel] = useState<string | null>(null);

  // Fetch devices data
  const { data: fetchedDevices = [], isLoading, error, refetch } = usePatientDevices(patientId);

  // Use provided devices or fetched devices, sort by assignedDate (newest first)
  const devicesList = (devices || fetchedDevices).sort((a, b) => {
    const dateA = new Date(a.assignedDate || 0).getTime();
    const dateB = new Date(b.assignedDate || 0).getTime();
    return dateB - dateA; // Newest first
  });

  // Note: don't perform pricing calculations here — prefer backend-provided canonical fields.

  // Helper function to convert PatientDevice to DeviceAssignment
  // Memoized to prevent unnecessary re-renders
  const convertToDeviceAssignment = React.useMemo(() => {
    return (device: PatientDevice | null): DeviceAssignment | null => {
      if (!device) return null;
      
      // Get the correct ear value - handle both backend formats
      let earValue: 'left' | 'right' | 'both' = 'both';
      const earSide = (device as any).earSide;
      const ear = device.ear || device.side;
      
      if (earSide === 'LEFT' || ear === 'left' || ear === 'L') {
        earValue = 'left';
      } else if (earSide === 'RIGHT' || ear === 'right' || ear === 'R') {
        earValue = 'right';
      } else if (earSide === 'BOTH' || ear === 'both' || ear === 'bilateral' || ear === 'B') {
        earValue = 'both';
      }
      
      return {
        id: device.id,
        deviceId: (device as any).inventoryId || (device as any).deviceId || device.id,
        patientId: patientId,
        assignedDate: device.assignedDate || new Date().toISOString(),
        assignedBy: device.assignedBy || 'Current User',
        status: device.status as 'assigned' | 'trial' | 'returned' | 'defective',
        ear: earValue,
        reason: device.reason === 'new' ? 'sale' : device.reason === 'warranty' ? 'service' : device.reason === 'upgrade' ? 'replacement' : (device.reason || 'sale') as 'sale' | 'service' | 'repair' | 'trial' | 'replacement' | 'proposal' | 'other',
        notes: device.notes,
        trialEndDate: device.trialEndDate,
        listPrice: device.listPrice,
        salePrice: device.salePrice,
        sgkReduction: device.sgkReduction,
        patientPayment: device.patientPayment,
        paymentMethod: device.paymentMethod,
        serialNumber: device.serialNumber || (device as any).serialNumberLeft || (device as any).serialNumberRight,
        serialNumberLeft: (device as any).serialNumberLeft,
        serialNumberRight: (device as any).serialNumberRight,
        sgkSupportType: (device as any).sgkScheme || (device as any).sgkSupportType,
        discountType: (device as any).discountType || 'none',
        discountValue: (device as any).discountValue || 0,
        downPayment: (device as any).downPayment || 0,
      };
    };
  }, [patientId]);

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

  const _handleDeviceClick = (device: PatientDevice) => {
    console.log('Device clicked:', device);
  };

  const handleAssignDevice = () => {
    setEditingDevice(null);
    setShowAssignmentForm(true);
    setActionError(null);
  };

  const handleEditDevice = (device: PatientDevice) => {
    setEditingDevice(device);
    setShowAssignmentForm(true); // Open assignment form for editing
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

  const handleCancelDevice = (deviceId: string) => {
    setDeviceToCancel(deviceId);
    setShowCancelConfirm(true);
  };

  const confirmCancelDevice = async () => {
    if (!deviceToCancel) return;

    try {
      setIsSubmitting(true);
      setActionError(null);
      
      // Update device status to cancelled
      const { status, data: cancelResult } = await apiClient.patch<any>(`/api/device-assignments/${deviceToCancel}`, { status: 'cancelled' });

      if (status >= 400 || !cancelResult?.success) {
        const err = cancelResult?.error || cancelResult?.message || `Backend error: ${status}`;
        throw new Error(err);
      }

      setSuccessMessage('Cihaz ataması iptal edildi');
      await refetch();
    } catch (error: any) {
      console.error('Error cancelling device:', error);
      setActionError(error.message || 'Cihaz iptal edilirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
      setShowCancelConfirm(false);
      setDeviceToCancel(null);
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
      // Create replacement record via backend API
      const device = devicesList.find(d => d.id === deviceId);
      if (!device) throw new Error('Cihaz bulunamadı');

      const payload: any = {
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
        createdBy: 'current_user'
      };

      if (newInventoryId) {
        payload.newInventoryId = newInventoryId;
        payload.newDeviceInfo = newDeviceInfo || { id: newInventoryId };
        if (selectedSerial) payload.newDeviceInfo.serial = selectedSerial;

        // If requested new device is out of stock, append a note according to legacy behavior
        try {
          const avail = (payload.newDeviceInfo && payload.newDeviceInfo.availableInventory) || 0;
          if (avail === 0) {
            const note = 'STOK: stokta olmayan ürün satıldı';
            payload.notes = (payload.notes ? payload.notes + '\n' : '') + note;
          }
        } catch (e) {
          // ignore
        }
      }

      console.log('📤 Creating replacement with payload:', payload);

      const { status: createStatus, data: createResult } = await apiClient.post<any>(`/api/patients/${patientId}/replacements`, payload);

      console.log('📥 Replacement create response:', createResult);

      if (createStatus >= 400 || !createResult?.success) {
        let err: any = createResult?.error || createResult?.message || `Backend error: ${createStatus}`;
        if (typeof err === 'object') {
          try { err = JSON.stringify(err); } catch (e) { err = String(err); }
        }
        throw new Error(err);
      }

      setSuccessMessage('Değişim bildirimi oluşturuldu');

      // Notify other parts of the app (Sales tab, lists) to refresh
      window.dispatchEvent(new CustomEvent('replacement:created', { detail: createResult?.data || createResult }));

      // Refresh devices list to reflect any changes
      await refetch();

      // If a new inventory id was requested, prepare prefill data but DO NOT open assignment form automatically
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

        // If inventory shows zero available, mark note
        if ((newDeviceInfo && newDeviceInfo.availableInventory) === 0) {
          prefill.notes = (prefill.notes ? prefill.notes + '\n' : '') + 'STOK: stokta olmayan ürün satıldı';
        }

        setPrefillAssignment(prefill);
      } else {
        setPrefillAssignment(null);
      }

      // NOTE: Do NOT open assignment form automatically. Legacy flow creates the replacement card
      // under Sales/İade-Değişim and assignment (physically giving the new device to patient) is handled
      // from the Sales card when stock actually arrives. If you want an explicit quick-assign action,
      // we can add a button on the replacement card to open the assignment form manually.
    } catch (error) {
      console.error('Error creating replacement:', error);
      const msg = (error as any)?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      setActionError(msg || 'Cihaz değiştirirken bir hata oluştu');
    }
  };

  const _handleStartTrial = (device: PatientDevice) => {
    setSelectedDevice(device);
    setShowTrialModal(true);
  };

  const _handleDeviceMaintenance = (device: PatientDevice) => {
    setSelectedDevice(device);
    setShowMaintenanceModal(true);
  };

  const _handleInventoryManagement = () => {
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
        
        // Prepare update data for API
        const updateData = {
          ear_side: assignmentData.ear,
          reason: assignmentData.reason || 'sale',
          base_price: assignmentData.listPrice || 0,
          // include canonical computed pricing so backend stores correct SGK/discount results
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
          // Update device/inventory if changed
          device_id: assignmentData.deviceId,
          inventory_id: assignmentData.deviceId  // deviceId is actually inventoryId in our system
        };
        
        console.log('📤 Sending device update data:', updateData);
        console.log('📤 Assignment data from form:', assignmentData);
        console.log('📤 Editing device:', editingDevice);
        
        // Call API to update device assignment
        const { status: updateStatus, data: result } = await apiClient.patch<any>(`/api/device-assignments/${editingDevice.id}`, updateData);
        
        console.log('📥 Backend response:', result);
        console.log('📥 Backend response FULL:', JSON.stringify(result, null, 2));
        console.log('📥 Backend response data serial numbers:', {
          serialNumber: result.data?.serialNumber,
          serial_number: result.data?.serial_number,
          serialNumberLeft: result.data?.serialNumberLeft,
          serial_number_left: result.data?.serial_number_left,
          serialNumberRight: result.data?.serialNumberRight,
          serial_number_right: result.data?.serial_number_right
        });
        
        if (updateStatus >= 400 || !result?.success) {
          console.error('❌ Backend error details:', JSON.stringify(result, null, 2));
          const errorMsg = result?.error || result?.message || `Backend error: ${updateStatus}`;
          throw new Error(errorMsg);
        }
        
        console.log('✅ Device assignment updated:', result);
        console.log('✅ Updated device data:', result.data);
        console.log('✅ Updated device FULL:', JSON.stringify(result.data, null, 2));
        
        setSuccessMessage('Cihaz ataması başarıyla güncellendi');
        
        // WORKAROUND: Backend GET doesn't return updated data immediately
        // Wait a bit and then refetch
        console.log('🔄 Waiting 500ms before refetch...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('🔄 Refetching devices...');
        await refetch();
        console.log('✅ Devices refetched');
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('device:updated'));
      } else {
        // Create new device assignment
        console.log('Creating new device assignment:', assignmentData);
        
        // Prepare assignment data for API
        const apiData = {
          device_assignments: [{
            inventoryId: assignmentData.deviceId,
            ear_side: assignmentData.ear,
            reason: assignmentData.reason || 'sale',
            base_price: assignmentData.listPrice || 0,
            // pass calculated pricing per-assignment
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
            serial_number_right: assignmentData.serialNumberRight
          }],
          sgk_scheme: assignmentData.sgkSupportType || 'no_coverage',
          paidAmount: assignmentData.downPayment || 0,
          downPayment: assignmentData.downPayment || 0,
          payment_plan: assignmentData.paymentMethod || 'cash',
          user_id: 'current_user',
          accessories: [],
          services: []
        };
        
        console.log('📤 Sending device assignment data:', apiData);
        
        // Call API to create device assignment and sale record
        const { status: assignStatus, data: result } = await apiClient.post<any>(`/api/patients/${patientId}/assign-devices-extended`, apiData);
        
        
        console.log('📥 Backend response:', result);
        console.log('📥 Response status:', assignStatus);
        console.log('📥 Response success flag:', !!result?.success);
        
        if (assignStatus >= 400 || !result?.success) {
          console.error('❌ Backend error details:', JSON.stringify(result, null, 2));
          const errorMsg = result?.error || result?.message || `Backend error: ${assignStatus}`;
          throw new Error(errorMsg);
        }
        
        console.log('✅ Device assignment created:', result);
        setSuccessMessage('Cihaz başarıyla atandı ve satış kaydı oluşturuldu');
        
        // Refresh devices list
        await refetch();
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('device:assigned'));
      }
      
      setShowAssignmentForm(false);
      setEditingDevice(null);
    } catch (error: any) {
      console.error('Error in device assignment:', error);
      setActionError(error.message || (editingDevice ? 'Cihaz güncellenirken bir hata oluştu' : 'Cihaz atanırken bir hata oluştu'));
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
        <div className="space-y-4" role="list" aria-label="Hasta cihazları listesi">
          {devicesList.map((device) => {
            const isBilateral = device.ear === 'both' || device.ear === 'bilateral' || (device as any).earSide === 'BOTH';
            
            // For bilateral, show two cards side by side (Right on left, Left on right - audiological view)
            if (isBilateral) {
              // For bilateral devices: compute per-item helpers (if backend didn't provide them)
              // and pass them into each duplicated card so UI shows per-ear values.
              const dp: any = device as any;
              // Prefer explicit per-item helpers when present, otherwise divide totals by 2
              const _totalSgk = Number(dp.sgkSupport ?? dp.sgk_support ?? dp.sgkReduction ?? dp.sgk_coverage_amount ?? 0);
              // salePrice returned by backend may already be per-item (common) while netPayable/patientPayment is the total.
              // Determine per-item sale robustly:
              // 1) prefer explicit per-item helpers, 2) if net total exists use net/qty, 3) detect if salePrice is already per-item by comparing sale*qty === netTotal
              const qty = 2;
              const explicitPerItemSgk = dp.sgkSupportPerItem ?? dp.sgk_support_per_item ?? dp.perItem?.sgk_support ?? null;
              const explicitPerItemSale = dp.salePricePerItem ?? dp.sale_price_per_item ?? dp.perItem?.sale_price ?? null;

              const totalSaleRaw = Number(dp.netPayable ?? dp.net_payable ?? dp.patientPayment ?? dp.patient_payment ?? 0);
              const saleRaw = Number(dp.salePrice ?? dp.sale_price ?? 0);

              // Decide per-item SGK: prefer explicit per-item field, otherwise
              // detect whether `totalSgk` is actually a total (needs division)
              // or already a per-item amount. Use same heuristic as PatientDeviceCard.
              let perItemSgk: number = 0;
              const rawSgkNum = Number(dp.sgkSupport ?? dp.sgk_support ?? dp.sgkReduction ?? dp.sgk_coverage_amount ?? 0);
              if (explicitPerItemSgk !== null && explicitPerItemSgk !== undefined) {
                perItemSgk = Number(explicitPerItemSgk);
              } else if (rawSgkNum > 0) {
                const compareBase = Number(dp.salePrice ?? dp.sale_price ?? dp.listPrice ?? dp.list_price ?? dp.netPayable ?? dp.net_payable ?? 0);
                console.log('[PatientDevicesTab] split sgk raw=', rawSgkNum, 'compareBase=', compareBase, 'qty=', qty, 'deviceId=', dp.id);
                if (qty > 1 && compareBase > 0 && rawSgkNum > compareBase * 1.1) {
                  perItemSgk = rawSgkNum / qty;
                  console.log('[PatientDevicesTab] detected total sgk; dividing ->', perItemSgk);
                } else {
                  perItemSgk = rawSgkNum;
                  console.log('[PatientDevicesTab] using raw sgk as per-item ->', perItemSgk);
                }
              } else {
                perItemSgk = 0;
              }

              let perItemSale: number;
              if (explicitPerItemSale !== null && explicitPerItemSale !== undefined) {
                perItemSale = Number(explicitPerItemSale);
              } else if (totalSaleRaw > 0) {
                // If saleRaw * qty approximately equals totalSaleRaw, saleRaw is already per-item.
                if (Math.abs(saleRaw * qty - totalSaleRaw) < 0.01) {
                  perItemSale = saleRaw;
                } else {
                  perItemSale = totalSaleRaw / qty;
                }
              } else {
                // No total available — fall back to saleRaw (may be per-item or total); assume saleRaw is per-item
                perItemSale = saleRaw;
              }

              const rightCard = { ...device, ear: 'right', earSide: 'RIGHT', side: 'right', salePricePerItem: perItemSale, sgkSupportPerItem: perItemSgk } as any;
              const leftCard = { ...device, ear: 'left', earSide: 'LEFT', side: 'left', salePricePerItem: perItemSale, sgkSupportPerItem: perItemSgk } as any;

              return (
                <div key={device.id} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PatientDeviceCard
                    device={rightCard}
                    onEdit={handleEditDevice}
                    onReplace={(d) => handleReplaceDevice(d.id)}
                    onCancel={(d) => handleCancelDevice(d.id)}
                    isCancelled={(device as any).status === 'cancelled'}
                  />
                  <PatientDeviceCard
                    device={leftCard}
                    onEdit={handleEditDevice}
                    onReplace={(d) => handleReplaceDevice(d.id)}
                    onCancel={(d) => handleCancelDevice(d.id)}
                    isCancelled={(device as any).status === 'cancelled'}
                  />
                </div>
              );
            }
            
            // For single-ear devices, do not recompute pricing here — rely on backend-provided fields.

            // For single ear, position card based on ear (audiological view)
            const isRight = device.ear === 'right' || device.ear === 'R' || (device as any).earSide === 'RIGHT';
            const _isLeft = device.ear === 'left' || device.ear === 'L' || (device as any).earSide === 'LEFT';
            
            return (
              <div key={device.id} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Right ear on left column, Left ear on right column */}
                {isRight ? (
                  <>
                    <PatientDeviceCard
                      device={device}
                      onEdit={handleEditDevice}
                      onReplace={(d) => handleReplaceDevice(d.id)}
                      onCancel={(d) => handleCancelDevice(d.id)}
                      isCancelled={(device as any).status === 'cancelled'}
                    />
                    <div />
                  </>
                ) : (
                  <>
                    <div />
                    <PatientDeviceCard
                      device={device}
                      onEdit={handleEditDevice}
                      onReplace={(d) => handleReplaceDevice(d.id)}
                      onCancel={(d) => handleCancelDevice(d.id)}
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
            key={editingDevice?.id || prefillAssignment?.deviceId || 'new'}
            patientId={patientId}
            assignment={prefillAssignment ?? (editingDevice ? convertToDeviceAssignment(editingDevice) : null)}
            isOpen={showAssignmentForm}
            onClose={handleAssignmentFormClose}
            onSave={handleDeviceAssignment}
            onUpdate={handleDeviceAssignment}
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

      {showReplaceModal && selectedDevice && (
        <DeviceReplaceModal
          device={selectedDevice}
          patientId={patientId}
          isOpen={showReplaceModal}
          onClose={() => setShowReplaceModal(false)}
          onReplace={handleReplaceConfirm}
        />
      )}

      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Cihaz Atamasını İptal Et"
        description="Bu cihaz atamasını iptal etmek istediğinizden emin misiniz? İptal edilen atama kartı üzerinde çizili olarak görünecektir."
        onClose={() => {
          setShowCancelConfirm(false);
          setDeviceToCancel(null);
        }}
        onConfirm={confirmCancelDevice}
        confirmLabel="İptal Et"
        cancelLabel="Vazgeç"
      />
    </div>
  );
};