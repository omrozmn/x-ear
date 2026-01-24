import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@x-ear/ui-web';
import { FileText, Plus, Calendar, DollarSign, Settings, XCircle } from 'lucide-react';
import { Party, PartyDevice } from '../../types/party';
import { useToastHelpers } from '@x-ear/ui-web';
import { deleteDevice } from '@/api/client/devices.client';
import { createPartyDeviceAssignments } from '@/api/client/sales.client';
import { useCreateReplacement } from '@/api/client/replacements.client';
import { apiClient } from '@/api/orval-mutator';
import type {
} from '@/api/generated/schemas';

// Fallback interfaces for types not exported in schema index
interface SaleRead {
  id?: string;
  totalAmount?: number;
  [key: string]: any;
}


import { DeviceAssignmentForm } from '../forms/device-assignment-form/DeviceAssignmentForm';
import { DeviceAssignment } from '../forms/device-assignment-form/components/AssignmentDetailsForm';
import { PartyDeviceCard } from '../party/PartyDeviceCard';
import DeviceReplacementHistory from '../DeviceReplacementHistory';
import { DeviceReplacementModal } from './modals/DeviceReplacementModal';
import { usePartyDevices } from '../../hooks/party/usePartyDevices';

interface PartyDevicesTabProps {
  party: Party;
  onPartyUpdate?: (party: Party) => void;
}

export const PartyDevicesTab: React.FC<PartyDevicesTabProps> = ({ party }: PartyDevicesTabProps) => {
  const { success: showSuccess, error: showError } = useToastHelpers();

  // Orval mutation hooks
  // const updateDeviceAssignmentMutation = useUpdateDeviceAssignmentApiSalesAssignmentsAssignmentIdPut(); // Hook missing
  const { mutateAsync: createReplacement } = useCreateReplacement();

  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<PartyDevice | null>(null);
  const [replacingDevice, setReplacingDevice] = useState<PartyDevice | null>(null);


  // Use the hook for party devices
  const { data: devices, /* isLoading: devicesLoading, */ error: devicesError, refetch: refetchDevices } = usePartyDevices(party?.id || '');

  // Sync editingDevice with latest data from devices array
  // This ensures the edit modal shows the most recent values after updates
  useEffect(() => {
    if (editingDevice && devices && devices.length > 0 && showEditModal) {
      const updatedDevice = devices.find((d) => d.id === editingDevice.id);
      if (updatedDevice) {
        // Deep compare to avoid unnecessary updates
        const currentStr = JSON.stringify(editingDevice);
        const updatedStr = JSON.stringify(updatedDevice);
        if (currentStr !== updatedStr) {
          // Update editingDevice with latest data without closing modal
          setEditingDevice(updatedDevice);
        }
      }
    }
  }, [devices, editingDevice, showEditModal]);

  // State for other API data
  // const [inventoryItems, setInventoryItems] = useState<InventoryItemRead[]>([]);
  const [sales, setSales] = useState<SaleRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInventoryItems = useCallback(async () => {
    try {
      // const params: ListInventoryParams = {
      //   page: 1,
      //   per_page: 20,
      //   // status: 'IN_STOCK' // Removed, not in new API params. Default shows available inventory.
      // };

      // const response = await listInventory(params);
      // setInventoryItems((response?.data || []) as InventoryItemRead[]);
    } catch (err) {
      console.error('Error loading inventory:', err);
    }
  }, []);

  const loadPartySales = useCallback(async () => {
    if (!party.id) return;

    try {
      // Note: This would need to be filtered by party ID in a real implementation
      // For now, we'll use mock data structure
      setSales([]);
    } catch (err) {
      console.error('Error loading party sales:', err);
    }
  }, [party.id]);

  // Load data on component mount (effect defined after callbacks)
  useEffect(() => {
    loadInventoryItems();
    loadPartySales();
  }, [loadInventoryItems, loadPartySales]);

  const mapToFormAssignment = (device: PartyDevice): DeviceAssignment => {
    return {
      id: device.id,
      deviceId: device.inventoryId || '', // Map inventoryId to form's deviceId
      partyId: party.id!,
      assignedDate: device.assignedDate || device.createdAt || new Date().toISOString(),
      assignedBy: device.assignedBy || '',
      status: (['assigned', 'trial', 'returned', 'defective'].includes(device.status || '')
        ? device.status
        : 'assigned') as DeviceAssignment['status'],
      ear: ((device.ear || device.side || 'left').toLowerCase() === 'both' ? 'both' : (device.ear || device.side || 'left').toLowerCase()) as DeviceAssignment['ear'],
      reason: (device.reason || 'sale') as DeviceAssignment['reason'],
      notes: device.notes,
      trialEndDate: device.trialEndDate,
      returnDate: device.returnDate,
      condition: device.condition,
      listPrice: device.listPrice || device.basePrice,
      salePrice: device.salePrice || device.price,
      sgkSupportType: device.sgkSupportType,
      sgkReduction: device.sgkReduction,
      discountType: (device.discountType === 'none' || device.discountType === 'percentage' || device.discountType === 'amount'
        ? device.discountType : 'none') as DeviceAssignment['discountType'],
      discountValue: device.discountValue,
      partyPayment: device.partyPayment || device.netPayable,
      downPayment: device.downPayment,
      paymentMethod: (['cash', 'card', 'transfer', 'installment'].includes(device.paymentMethod || '')
        ? device.paymentMethod : undefined) as DeviceAssignment['paymentMethod'],

      serialNumber: device.serialNumber,
      serialNumberLeft: device.serialNumberLeft,
      serialNumberRight: device.serialNumberRight,

      deliveryStatus: (device.deliveryStatus === 'pending' || device.deliveryStatus === 'delivered'
        ? device.deliveryStatus : 'pending') as DeviceAssignment['deliveryStatus'],
      isLoaner: device.isLoaner,
      loanerInventoryId: device.loanerInventoryId,
      loanerSerialNumber: device.loanerSerialNumber,
      loanerSerialNumberLeft: device.loanerSerialNumberLeft,
      loanerSerialNumberRight: device.loanerSerialNumberRight,
      loanerBrand: device.loanerBrand,
      loanerModel: device.loanerModel,

      reportStatus: (['received', 'pending', 'none'].includes(device.reportStatus || '')
        ? device.reportStatus : undefined) as DeviceAssignment['reportStatus']
    };
  };

  const handleAssignDevice = async (deviceData: DeviceAssignment & Record<string, any>) => {
    try {
      setLoading(true);

      // Use the new createPartyDeviceAssignments endpoint
      const assignmentItem = {
        inventoryId: deviceData.inventoryId as string,
        ear: deviceData.ear as string || 'both',
        reason: deviceData.reason as string || 'Assignment',
        basePrice: deviceData.basePrice as number || deviceData.listPrice as number,
        discountType: deviceData.discountType as string,
        discountValue: deviceData.discountValue as number,
        salePrice: deviceData.salePrice as number,
        partyPayment: deviceData.partyPayment as number,
        sgkSupport: deviceData.sgkSupport as number,
        sgkScheme: deviceData.sgkScheme as string,
        serialNumber: deviceData.serialNumber as string,
        serialNumberLeft: deviceData.serialNumberLeft as string,
        serialNumberRight: deviceData.serialNumberRight as string,
        deliveryStatus: deviceData.deliveryStatus as string || 'pending',
        reportStatus: deviceData.reportStatus as string,
        isLoaner: deviceData.isLoaner as boolean || false,
        loanerInventoryId: deviceData.loanerInventoryId as string,
        loanerSerialNumber: deviceData.loanerSerialNumber as string,
        loanerSerialNumberLeft: deviceData.loanerSerialNumberLeft as string,
        loanerSerialNumberRight: deviceData.loanerSerialNumberRight as string,
        loanerBrand: deviceData.loanerBrand as string,
        loanerModel: deviceData.loanerModel as string,
        paymentMethod: deviceData.paymentMethod as string || 'cash',
        notes: deviceData.notes as string,
        // Manual device info (when not from inventory)
        manualBrand: deviceData.brand as string,
        manualModel: deviceData.model as string,
      };

      // Remove undefined values
      const cleanedItem = Object.fromEntries(
        Object.entries(assignmentItem).filter(([, v]) => v !== undefined && v !== null && v !== '')
      );

      const payload = {
        deviceAssignments: [cleanedItem],
        sgkScheme: deviceData.sgkScheme as string,
        paymentPlan: deviceData.paymentPlan as string || 'cash',
        branchId: deviceData.branchId as string,
      };

      // Debug logging disabled to reduce console noise
      // console.log('🚀 [handleAssignDevice] Payload:', JSON.stringify(payload, null, 2));

      await createPartyDeviceAssignments(party.id!, payload);
      showSuccess('Başarılı', 'Cihaz başarıyla atandı');

      await refetchDevices();
      await loadPartySales();
      setShowDeviceForm(false);
      setError(null);

    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }; message?: string };
      console.error('[handleAssignDevice] Error:', error.response?.data || error.message);
      setError('Cihaz atanırken hata oluştu: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      await deleteDevice(deviceId);
      await refetchDevices();
    } catch (err) {
      console.error('Error removing device:', err);
      setError('Cihaz kaldırılırken hata oluştu');
    }
  };

  const handleEditDevice = (device: PartyDevice) => {
    setEditingDevice(device);
    setShowEditModal(true);
  };

  const handleOpenReplacementModal = (device: PartyDevice) => {
    setReplacingDevice(device);
    setShowReplacementModal(true);
  };

  const handleUpdateDevice = async (deviceId: string, updates: any) => {
    if (!deviceId) return;

    // Debug logging disabled to reduce console noise
    // console.log('📤 [handleUpdateDevice] BAŞLANGIÇ:', {...});

    try {
      setLoading(true);

      // Transform field names from frontend (camelCase) to backend (snake_case)
      const transformedUpdates: Record<string, any> = {};

      // Field mapping: frontend -> backend
      const fieldMapping: Record<string, string> = {
        sgkSupportType: 'sgk_scheme',
        sgkScheme: 'sgk_scheme',
        listPrice: 'base_price',
        basePrice: 'base_price',
        discountType: 'discount_type',
        discountValue: 'discount_value',
        paymentMethod: 'payment_method',
        downPayment: 'down_payment',
        earSide: 'ear_side',
        ear: 'ear_side',
        deliveryStatus: 'delivery_status',
        reportStatus: 'report_status',
        serialNumber: 'serial_number',
        serialNumberLeft: 'serial_number_left',
        serialNumberRight: 'serial_number_right',
        salePrice: 'sale_price',
        partyPayment: 'party_payment',
        sgkReduction: 'sgk_reduction',
        sgkSupport: 'sgk_support',
        isLoaner: 'is_loaner',
        loanerInventoryId: 'loaner_inventory_id',
        loanerSerialNumber: 'loaner_serial_number',
        loanerSerialNumberLeft: 'loaner_serial_number_left',
        loanerSerialNumberRight: 'loaner_serial_number_right',
        loanerBrand: 'loaner_brand',
        loanerModel: 'loaner_model',
      };

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null) continue;

        // Use mapped field name if exists, otherwise use original
        const backendKey = fieldMapping[key] || key;
        transformedUpdates[backendKey] = value;
      }

      // Use apiClient for manual update - PATCH method
      await apiClient({
        url: `/api/device-assignments/${deviceId}`,
        method: 'PATCH',
        data: transformedUpdates
      });

      // Refresh devices
      await refetchDevices();

      // Dispatch custom event to notify other tabs (e.g., Sales)
      window.dispatchEvent(new CustomEvent('xEar:dataChanged'));

      // If modal was open, handle closing/resetting
      if (showEditModal) {
        setShowEditModal(false);
        setEditingDevice(null);
      }
      showSuccess('Başarılı', 'Cihaz güncellendi');
    } catch (error: any) {
      console.error('[handleUpdateDevice] Error:', error.response?.data || error.message);
      const msg = error.response?.data?.error || error.message || 'Cihaz güncellenirken hata oluştu';
      showError('Hata', msg);
      setError(msg);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleReplaceDevice = async (oldDeviceId: string, reasonOrData: any, maybeNotes?: string, maybeNewInventoryId?: string, maybeNewDeviceInfo?: any) => {
    try {
      setLoading(true);

      // Normalize parameters (support both old and new signatures)
      let reason = 'other';
      let notes: string | undefined = undefined;
      let newInventoryId: string | undefined = undefined;
      let newDeviceInfo: any = undefined;
      if (typeof reasonOrData === 'object') {
        // legacy call used single object
        const obj = reasonOrData || {};
        reason = obj.reason || obj.replacementReason || 'other';
        notes = obj.notes || undefined;
        newInventoryId = obj.inventoryId as string | undefined;
        newDeviceInfo = obj;
      } else {
        reason = reasonOrData || 'other';
        notes = maybeNotes;
        newInventoryId = maybeNewInventoryId;
        newDeviceInfo = maybeNewDeviceInfo;
      }

      // Create replacement record on server before mutating devices
      try {
        const oldDevice = (devices || []).find((d) => d.id === oldDeviceId) || ({ id: oldDeviceId } as PartyDevice);
        const payload: any = {
          oldDeviceId,
          oldDeviceInfo: {
            id: oldDevice.id,
            brand: oldDevice.brand,
            model: oldDevice.model,
            serialNumber: oldDevice.serialNumber || oldDevice.serialNumberLeft || oldDevice.serialNumberRight || undefined
          },
          newInventoryId: newInventoryId,
          newDeviceInfo: newDeviceInfo,
          replacementReason: reason,
          notes: notes
        };

        // 1. Create replacement record
        await createReplacement({
          partyId: party.id,
          data: payload
        });
      } catch (e: any) {
        // Surface backend error to user and abort replace flow
        console.error('Error creating replacement on server:', e);
        const msg = e.response?.data?.error || e.response?.data?.msg || e.response?.data?.message || e.message || 'Replacement failed';
        throw new Error(msg);
      }

      // Remove old device
      await deleteDevice(oldDeviceId);

      // Add new device (from inventory or manual)
      await handleAssignDevice({ inventoryId: newInventoryId, reason, ...newDeviceInfo });

      setError(null);
    } catch (err) {
      console.error('Error replacing device:', err);
      setError('Cihaz değiştirilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };



  // Calculate quick stats from loaded data
  const quickStats = {
    activeDevices: devices.filter(d => d.status === 'assigned').length,
    trials: devices.filter(d => d.trialStartDate).length,
    totalValue: sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
    ereceiptsCount: 0 // This would come from a separate API
  };



  if (loading && devices.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cihazlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aktif Cihaz</p>
              <p className="text-2xl font-bold text-green-600">{quickStats.activeDevices}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-full">
              <Settings className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Deneme</p>
              <p className="text-2xl font-bold text-blue-600">{quickStats.trials}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-full">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Değer</p>
              <p className="text-2xl font-bold text-purple-600">₺{quickStats.totalValue.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-full">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">E-Reçete</p>
              <p className="text-2xl font-bold text-orange-600">{quickStats.ereceiptsCount}</p>
            </div>
            <div className="p-2 bg-orange-100 rounded-full">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Header with Add Device Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Atanmış Cihazlar</h3>
        <Button
          onClick={() => setShowDeviceForm(true)}
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          aria-label="Cihaz ata"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Error Message */}
      {(error || devicesError) && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Hata</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error || (devicesError instanceof Error ? devicesError.message : 'Cihazlar yüklenirken bir hata oluştu.')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Devices List - Row-based Layout for proper bilateral alignment */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <h4 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            Sağ Kulak
          </h4>
          <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            Sol Kulak
          </h4>
        </div>

        {(() => {
          // Sort devices by createdAt descending (newest first)
          const sortedDevices = [...devices].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA; // Descending - newest first
          });

          // Group devices: bilateral devices should be in same row, single-ear devices get their own row
          const bilateralDevices = sortedDevices.filter((d) => {
            const ear = (d.ear || d.side || '').toLowerCase();
            return ear === 'bilateral' || ear === 'b' || ear === 'both';
          });

          const rightOnlyDevices = sortedDevices.filter((d) => {
            const ear = (d.ear || d.side || '').toLowerCase();
            return ear === 'right' || ear === 'r' || ear === 'sağ';
          });

          const leftOnlyDevices = sortedDevices.filter((d) => {
            const ear = (d.ear || d.side || '').toLowerCase();
            return ear === 'left' || ear === 'l' || ear === 'sol';
          });

          const rows: Array<{ right: PartyDevice | null; left: PartyDevice | null }> = [];

          // Add bilateral devices (same device appears in both columns)
          bilateralDevices.forEach((device) => {
            rows.push({ right: device, left: device });
          });

          // Add single-ear devices
          const maxSingleEar = Math.max(rightOnlyDevices.length, leftOnlyDevices.length);
          for (let i = 0; i < maxSingleEar; i++) {
            rows.push({
              right: rightOnlyDevices[i] || null,
              left: leftOnlyDevices[i] || null
            });
          }

          if (rows.length === 0) {
            return (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-red-200 dark:border-red-800 rounded-lg bg-red-50/50 dark:bg-red-900/10">
                  <p className="text-sm">Sağ kulak için cihaz atanmamış</p>
                </div>
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                  <p className="text-sm">Sol kulak için cihaz atanmamış</p>
                </div>
              </div>
            );
          }

          return rows.map((row, index) => (
            <div key={index} className="grid grid-cols-2 gap-4">
              {/* Right Ear */}
              <div>
                {row.right ? (
                  <PartyDeviceCard
                    key={`${row.right.id}-right-${index}`}
                    displaySide="right"
                    device={row.right}
                    onEdit={() => handleEditDevice(row.right!)}
                    onReplace={() => handleOpenReplacementModal(row.right!)}
                    onCancel={() => row.right!.id && handleRemoveDevice(row.right!.id)}
                    onReturnLoaner={async (dev) => {
                      const id = dev.id || dev.assignmentId;
                      if (id) {
                        await handleUpdateDevice(id, {
                          isLoaner: false,
                          loanerInventoryId: undefined,
                          loanerSerialNumber: undefined
                        });
                      }
                    }}
                  />
                ) : (
                  <div className="h-full min-h-[100px]"></div>
                )}
              </div>

              {/* Left Ear */}
              <div>
                {row.left ? (
                  <PartyDeviceCard
                    key={`${row.left.id}-left-${index}`}
                    displaySide="left"
                    device={row.left}
                    onEdit={() => handleEditDevice(row.left!)}
                    onReplace={() => handleOpenReplacementModal(row.left!)}
                    onCancel={() => row.left!.id && handleRemoveDevice(row.left!.id)}
                    onReturnLoaner={async (dev) => {
                      const id = dev.id || dev.assignmentId;
                      if (id) {
                        await handleUpdateDevice(id, {
                          isLoaner: false,
                          loanerInventoryId: undefined,
                          loanerSerialNumber: undefined
                        });
                      }
                    }}
                  />
                ) : (
                  <div className="h-full min-h-[100px]"></div>
                )}
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Empty State */}
      {devices.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Henüz atanmış cihaz bulunmamaktadır.</p>
        </div>
      )}

      {/* Device Replacement History */}
      <DeviceReplacementHistory
        partyId={party.id || ''}
        className="mt-6"
      />

      {/* Device Assignment Form Modal - Used for both new assignment and editing */}
      <DeviceAssignmentForm
        isOpen={showDeviceForm || showEditModal}
        onClose={() => {
          setShowDeviceForm(false);
          setShowEditModal(false);
          setEditingDevice(null);
        }}
        partyId={party.id || ''}
        assignment={editingDevice ? mapToFormAssignment(editingDevice) : null}
        onSave={(data) => handleAssignDevice(data)}
        onUpdate={async (data) => {
          if (editingDevice?.id) {
            await handleUpdateDevice(editingDevice.id, data);
          }
        }}
      />

      {/* Device Replacement Modal */}
      <DeviceReplacementModal
        isOpen={showReplacementModal}
        device={replacingDevice ? {
          id: replacingDevice.id || '',
          brand: replacingDevice.brand || '',
          model: replacingDevice.model || '',
          serialNumber: replacingDevice.serialNumber,
          price: replacingDevice.salePrice || replacingDevice.listPrice || 0,
          ear: replacingDevice.ear
        } : null}
        party={{ id: party.id || '', name: `${party.firstName || ''} ${party.lastName || ''}`.trim() }}
        onClose={() => {
          setShowReplacementModal(false);
          setReplacingDevice(null);
        }}
        onReplacementCreate={async (replacement) => {
          if (replacingDevice?.id) {
            await handleReplaceDevice(
              replacingDevice.id,
              replacement.replacementReason,
              replacement.notes,
              replacement.newInventoryId,
              replacement.newDeviceInfo
            );
          }
          setShowReplacementModal(false);
          setReplacingDevice(null);
        }}
      />
    </div>
  );
};