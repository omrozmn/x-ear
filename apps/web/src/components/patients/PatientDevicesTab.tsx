import React, { useState, useEffect } from 'react';
import { Button, Input, Badge, Select, Textarea } from '@x-ear/ui-web';
import { FileText, Plus, Search, Calendar, DollarSign, Settings, Trash2, Edit, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Patient } from '../../types/patient';
import { getDevices } from '../../api/generated/devices/devices';
import { getInventory } from '../../api/generated/inventory/inventory';
import { getSales } from '../../api/generated/sales/sales';
import type { 
  Device, 
  DevicesGetDevicesParams,
  DevicesCreateDeviceBody,
  InventoryItem,
  InventoryGetInventoryItemsParams,
  InventoryAssignToPatientBody,
  Sale,
  SalesCreateSaleBody
} from '../../api/generated/api.schemas';
import DeviceEditModal from './modals/DeviceEditModal';

interface PatientDevicesTabProps {
  patient: Patient;
  onPatientUpdate?: (patient: Patient) => void;
}

export const PatientDevicesTab: React.FC<PatientDevicesTabProps> = ({ patient, onPatientUpdate }) => {
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [rightEarMode, setRightEarMode] = useState<'inventory' | 'manual'>('inventory');
  const [leftEarMode, setLeftEarMode] = useState<'inventory' | 'manual'>('manual');
  const [rightEarReason, setRightEarReason] = useState<'Trial' | 'Sale'>('Trial');
  const [leftEarReason, setLeftEarReason] = useState<'Trial' | 'Sale'>('Trial');
  
  // State for API data
  const [devices, setDevices] = useState<Device[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadPatientDevices();
    loadInventoryItems();
    loadPatientSales();
  }, [patient.id]);

  const loadPatientDevices = async () => {
    if (!patient.id) return;
    
    setLoading(true);
    try {
      const devicesApi = getDevices();
      const params: DevicesGetDevicesParams = {
        page: 1,
        per_page: 100
      };
      
      const response = await devicesApi.devicesGetDevices(params);
      // Filter devices assigned to this patient
      const patientDevices = response.data?.data?.filter(device => 
        device.patientId === patient.id || device.patient_id === patient.id
      ) || [];
      setDevices(patientDevices);
    } catch (err) {
      console.error('Error loading patient devices:', err);
      setError('Cihazlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryItems = async () => {
    try {
      const inventoryApi = getInventory();
      const params: InventoryGetInventoryItemsParams = {
        page: 1,
        per_page: 100,
        status: 'available'
      };
      
      const response = await inventoryApi.inventoryGetInventoryItems(params);
      setInventoryItems(response.data?.data || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    }
  };

  const loadPatientSales = async () => {
    if (!patient.id) return;
    
    try {
      const salesApi = getSales();
      // Note: This would need to be filtered by patient ID in a real implementation
      // For now, we'll use mock data structure
      setSales([]);
    } catch (err) {
      console.error('Error loading patient sales:', err);
    }
  };

  const handleAssignDevice = async (deviceData: any) => {
    try {
      setLoading(true);
      
      if (deviceData.mode === 'inventory') {
        // Assign from inventory
        const inventoryApi = getInventory();
        const assignData: InventoryAssignToPatientBody = {
          patientId: patient.id,
          quantity: 1,
          reason: deviceData.reason
        };
        
        await inventoryApi.inventoryAssignToPatient(deviceData.inventoryId, assignData);
      } else {
        // Create new device manually
        const devicesApi = getDevices();
        const createData: DevicesCreateDeviceBody = {
          patientId: patient.id,
          serialNumber: deviceData.serialNumber,
          brand: deviceData.brand,
          model: deviceData.model,
          deviceType: deviceData.deviceType,
          ear: deviceData.ear,
          status: deviceData.reason === 'Trial' ? 'assigned' : 'assigned'
        };
        
        await devicesApi.devicesCreateDevice(createData);
      }

      // If it's a sale, create sale record
      if (deviceData.reason === 'Sale') {
        const salesApi = getSales();
        const saleData: SalesCreateSaleBody = {
          patientId: patient.id,
          deviceId: deviceData.deviceId,
          amount: deviceData.salePrice,
          paymentMethod: deviceData.paymentMethod,
          notes: `${deviceData.brand} ${deviceData.model} satışı`
        };
        
        await salesApi.salesCreateSale(saleData);
      }

      await loadPatientDevices();
      await loadPatientSales();
      setShowDeviceForm(false);
      setError(null);
    } catch (err) {
      console.error('Error assigning device:', err);
      setError('Cihaz atanırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      const devicesApi = getDevices();
      await devicesApi.devicesDeleteDevice(deviceId);
      await loadPatientDevices();
    } catch (err) {
      console.error('Error removing device:', err);
      setError('Cihaz kaldırılırken hata oluştu');
    }
  };

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
    setShowEditModal(true);
  };

  const handleUpdateDevice = async (deviceData: any) => {
    if (!editingDevice?.id) return;
    
    try {
      setLoading(true);
      const devicesApi = getDevices();
      
      const updateData: Partial<DevicesCreateDeviceBody> = {
        serialNumber: deviceData.serialNumber,
        brand: deviceData.brand,
        model: deviceData.model,
        deviceType: deviceData.deviceType,
        ear: deviceData.ear,
        status: deviceData.status,
        notes: deviceData.notes
      };
      
      // Note: This assumes there's an update method in the API
      // await devicesApi.devicesUpdateDevice(editingDevice.id, updateData);
      
      await loadPatientDevices();
      setShowEditModal(false);
      setEditingDevice(null);
      setError(null);
    } catch (err) {
      console.error('Error updating device:', err);
      setError('Cihaz güncellenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleReplaceDevice = async (oldDeviceId: string, newDeviceData: any) => {
    try {
      setLoading(true);
      
      // Remove old device
      await handleRemoveDevice(oldDeviceId);
      
      // Add new device
      await handleAssignDevice(newDeviceData);
      
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

  const getDeviceStatusBadge = (status?: string) => {
    switch (status) {
      case 'assigned':
        return <Badge className="bg-green-100 text-green-800">Atanmış</Badge>;
      case 'available':
        return <Badge className="bg-blue-100 text-blue-800">Müsait</Badge>;
      case 'maintenance':
        return <Badge className="bg-yellow-100 text-yellow-800">Bakımda</Badge>;
      case 'retired':
        return <Badge className="bg-gray-100 text-gray-800">Emekli</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Bilinmiyor</Badge>;
    }
  };

  const getEarText = (ear?: string) => {
    switch (ear) {
      case 'left':
        return 'Sol';
      case 'right':
        return 'Sağ';
      case 'both':
        return 'İkisi';
      default:
        return 'Belirtilmemiş';
    }
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

      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Cihazlar</h3>
          <p className="text-sm text-gray-600">
            {devices.length} cihaz bulundu
          </p>
        </div>
        <Button 
          onClick={() => setShowDeviceForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Cihaz Ata
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Devices List */}
      <div className="space-y-4">
        {devices.length > 0 ? (
          devices.map((device) => (
            <div key={device.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Settings className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {device.brand} {device.model}
                      </p>
                      <p className="text-sm text-gray-600">
                        Seri No: {device.serialNumber}
                      </p>
                    </div>
                    {getDeviceStatusBadge(device.status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <strong>Kulak:</strong> {getEarText(device.ear)}
                    </div>
                    <div>
                      <strong>Tip:</strong> {device.deviceType || 'Belirtilmemiş'}
                    </div>
                    {device.trialStartDate && (
                      <div>
                        <strong>Deneme Başlangıcı:</strong> {new Date(device.trialStartDate).toLocaleDateString('tr-TR')}
                      </div>
                    )}
                    {device.trialEndDate && (
                      <div>
                        <strong>Deneme Bitişi:</strong> {new Date(device.trialEndDate).toLocaleDateString('tr-TR')}
                      </div>
                    )}
                  </div>

                  {device.notes && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
                        <strong>Notlar:</strong> {device.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    onClick={() => handleEditDevice(device)}
                    className="p-2 text-gray-600 hover:bg-gray-50"
                    title="Düzenle"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => device.id && handleRemoveDevice(device.id)}
                    className="p-2 text-red-600 hover:bg-red-50"
                    title="Kaldır"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Henüz atanmış cihaz bulunmamaktadır.</p>
          </div>
        )}
      </div>

      {/* Device Assignment Form Modal */}
      {showDeviceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">Cihaz Atama</h3>
              <Button
                onClick={() => setShowDeviceForm(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              
              // Process right ear data
              if (formData.get('rightEarEnabled')) {
                const rightEarData = {
                  mode: rightEarMode,
                  ear: 'right',
                  reason: rightEarReason,
                  inventoryId: formData.get('rightInventoryId'),
                  brand: formData.get('rightBrand'),
                  model: formData.get('rightModel'),
                  serialNumber: formData.get('rightSerialNumber'),
                  deviceType: formData.get('rightDeviceType'),
                  salePrice: formData.get('rightSalePrice'),
                  paymentMethod: formData.get('rightPaymentMethod')
                };
                handleAssignDevice(rightEarData);
              }

              // Process left ear data
              if (formData.get('leftEarEnabled')) {
                const leftEarData = {
                  mode: leftEarMode,
                  ear: 'left',
                  reason: leftEarReason,
                  inventoryId: formData.get('leftInventoryId'),
                  brand: formData.get('leftBrand'),
                  model: formData.get('leftModel'),
                  serialNumber: formData.get('leftSerialNumber'),
                  deviceType: formData.get('leftDeviceType'),
                  salePrice: formData.get('leftSalePrice'),
                  paymentMethod: formData.get('leftPaymentMethod')
                };
                handleAssignDevice(leftEarData);
              }
            }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Right Ear */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" name="rightEarEnabled" id="rightEarEnabled" defaultChecked />
                    <label htmlFor="rightEarEnabled" className="font-medium text-gray-900">Sağ Kulak</label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mod</label>
                    <select 
                      value={rightEarMode}
                      onChange={(e) => setRightEarMode(e.target.value as 'inventory' | 'manual')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="inventory">Envanterden Seç</option>
                      <option value="manual">Manuel Giriş</option>
                    </select>
                  </div>

                  {rightEarMode === 'inventory' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cihaz Seç</label>
                      <select name="rightInventoryId" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Cihaz seçiniz...</option>
                        {inventoryItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} - {item.brand} {item.model} (Stok: {item.availableInventory || 0})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {rightEarMode === 'manual' && (
                    <div className="space-y-3">
                      <Input name="rightBrand" placeholder="Marka" required />
                      <Input name="rightModel" placeholder="Model" required />
                      <Input name="rightSerialNumber" placeholder="Seri No" required />
                      <Input name="rightDeviceType" placeholder="Tip" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sebep</label>
                    <select 
                      value={rightEarReason}
                      onChange={(e) => setRightEarReason(e.target.value as 'Trial' | 'Sale')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Trial">Deneme</option>
                      <option value="Sale">Satış</option>
                    </select>
                  </div>

                  {rightEarReason === 'Sale' && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-900">Fiyatlandırma</h5>
                      <Input name="rightListPrice" type="number" placeholder="Liste Fiyatı" />
                      <Input name="rightSalePrice" type="number" placeholder="Satış Fiyatı" required />
                      <select name="rightPaymentMethod" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        <option value="">Ödeme Yöntemi</option>
                        <option value="cash">Nakit</option>
                        <option value="credit">Kredi Kartı</option>
                        <option value="installment">Taksit</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Left Ear */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" name="leftEarEnabled" id="leftEarEnabled" />
                    <label htmlFor="leftEarEnabled" className="font-medium text-gray-900">Sol Kulak</label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mod</label>
                    <select 
                      value={leftEarMode}
                      onChange={(e) => setLeftEarMode(e.target.value as 'inventory' | 'manual')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="inventory">Envanterden Seç</option>
                      <option value="manual">Manuel Giriş</option>
                    </select>
                  </div>

                  {leftEarMode === 'inventory' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cihaz Seç</label>
                      <select name="leftInventoryId" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Cihaz seçiniz...</option>
                        {inventoryItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} - {item.brand} {item.model} (Stok: {item.availableInventory || 0})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {leftEarMode === 'manual' && (
                    <div className="space-y-3">
                      <Input name="leftBrand" placeholder="Marka" required />
                      <Input name="leftModel" placeholder="Model" required />
                      <Input name="leftSerialNumber" placeholder="Seri No" required />
                      <Input name="leftDeviceType" placeholder="Tip" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sebep</label>
                    <select 
                      value={leftEarReason}
                      onChange={(e) => setLeftEarReason(e.target.value as 'Trial' | 'Sale')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Trial">Deneme</option>
                      <option value="Sale">Satış</option>
                    </select>
                  </div>

                  {leftEarReason === 'Sale' && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-900">Fiyatlandırma</h5>
                      <Input name="leftListPrice" type="number" placeholder="Liste Fiyatı" />
                      <Input name="leftSalePrice" type="number" placeholder="Satış Fiyatı" required />
                      <select name="leftPaymentMethod" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        <option value="">Ödeme Yöntemi</option>
                        <option value="cash">Nakit</option>
                        <option value="credit">Kredi Kartı</option>
                        <option value="installment">Taksit</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  onClick={() => setShowDeviceForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                  disabled={loading}
                >
                  {loading ? 'Atanıyor...' : 'Cihaz Ata'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Device Edit Modal */}
      <DeviceEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingDevice(null);
        }}
        device={editingDevice}
        inventoryItems={inventoryItems}
        onUpdate={handleUpdateDevice}
        onReplace={handleReplaceDevice}
        loading={loading}
      />
    </div>
  );
};