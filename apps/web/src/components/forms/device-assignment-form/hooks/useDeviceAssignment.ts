import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { DeviceInventoryItem } from '../components/DeviceSearchForm';
import { DeviceAssignment } from '../components/AssignmentDetailsForm';

const api = axios.create({
  baseURL: 'http://localhost:5003'
});

interface UseDeviceAssignmentProps {
  patientId: string;
  assignment?: DeviceAssignment | null;
  isOpen: boolean;
}

interface UseDeviceAssignmentReturn {
  // Form state
  formData: Partial<DeviceAssignment>;
  setFormData: (data: Partial<DeviceAssignment>) => void;
  updateFormData: (field: keyof DeviceAssignment, value: any) => void;
  
  // Device management
  availableDevices: DeviceInventoryItem[];
  filteredDevices: DeviceInventoryItem[];
  selectedDevice: DeviceInventoryItem | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleDeviceSelect: (device: DeviceInventoryItem) => void;
  
  // Validation
  errors: Record<string, string>;
  validateForm: () => boolean;
  
  // Pricing calculations
  sgkAmounts: Record<string, number>;
  
  // Form actions
  resetForm: () => void;
}

export const useDeviceAssignment = ({
  patientId,
  assignment,
  isOpen
}: UseDeviceAssignmentProps): UseDeviceAssignmentReturn => {
  // Form state
  const [formData, setFormData] = useState<Partial<DeviceAssignment>>({
    patientId,
    assignedDate: new Date().toISOString().split('T')[0],
    status: 'assigned',
    assignedBy: 'current_user', // TODO: Get from auth context
    ear: 'left',
    reason: 'sale',
    discountType: 'none',
    paymentMethod: 'cash'
  });

  // Device management state
  const [availableDevices, setAvailableDevices] = useState<DeviceInventoryItem[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<DeviceInventoryItem[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceInventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // SGK support amounts (matching legacy system)
  const sgkAmounts = {
    'under4_parent_working': 6104.44,
    'under4_parent_retired': 7630.56,
    'age5_12_parent_working': 5426.17,
    'age5_12_parent_retired': 6782.72,
    'age13_18_parent_working': 5087.04,
    'age13_18_parent_retired': 6358.88,
    'over18_working': 3391.36,
    'over18_retired': 4239.20
  };

  // Update form data helper - memoized to prevent unnecessary re-renders
  const updateFormData = useCallback((field: keyof DeviceAssignment, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Reset form when modal opens/closes or assignment changes
  useEffect(() => {
    if (isOpen) {
      if (assignment) {
        // Edit mode - load assignment data
        setFormData({
          ...assignment,
          assignedDate: assignment.assignedDate?.split('T')[0] || new Date().toISOString().split('T')[0]
        });
        
        // If assignment has deviceId, find and select the device
        if (assignment.deviceId) {
          setSearchTerm(''); // Will trigger device selection after inventory loads
        }
      } else {
        // Create mode
        setFormData({
          patientId,
          assignedDate: new Date().toISOString().split('T')[0],
          status: 'assigned',
          assignedBy: 'current_user', // TODO: Get from auth context
          ear: 'left',
          reason: 'sale',
          discountType: 'none',
          paymentMethod: 'cash'
        });
      }
      setErrors({});
      if (!assignment) {
        setSearchTerm('');
        setSelectedDevice(null);
      }
    }
  }, [isOpen, assignment, patientId]);

  // Load available devices from inventory
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const response = await api.get('/api/inventory', {
          params: {
            category: 'hearing_aid',
            per_page: 100
          }
        });
        
        const result = response.data;
        
        if (!result.success) {
          throw new Error('Envanter yüklenemedi');
        }
        
        // Transform backend data to frontend format
        const devices: DeviceInventoryItem[] = result.data.map((item: any) => ({
          id: item.id.toString(),
          brand: item.brand || '',
          model: item.model || '',
          price: item.price || 0,
          ear: item.ear || 'bilateral',
          availableInventory: item.availableInventory || 0,
          availableSerials: item.availableSerials || [],
          barcode: item.barcode || '',
          category: item.category || 'hearing_aid',
          status: (item.availableInventory || 0) > 0 ? 'available' : 'out_of_stock'
        }));
        
        console.log('✓ Loaded inventory:', devices);
        setAvailableDevices(devices);
        setFilteredDevices(devices);
        
        // If editing and has deviceId, auto-select the device
        if (assignment?.deviceId) {
          const device = devices.find(d => d.id === assignment.deviceId);
          if (device) {
            setSelectedDevice(device);
            setSearchTerm(`${device.brand} ${device.model}`);
          }
        }
      } catch (error) {
        console.error('Envanter yüklenirken hata:', error);
        // Keep empty array on error
        setAvailableDevices([]);
        setFilteredDevices([]);
      }
    };

    if (isOpen) {
      loadInventory();
    }
  }, [isOpen, assignment]);

  // Filter devices based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredDevices(availableDevices);
    } else {
      const filtered = availableDevices.filter(device =>
        device.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (device.barcode && device.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredDevices(filtered);
    }
  }, [searchTerm, availableDevices]);



  // Calculate pricing values using useMemo to avoid triggering re-renders
  const calculatedPricing = useMemo(() => {
    if (!formData.listPrice || formData.listPrice <= 0) {
      return {
        salePrice: 0,
        sgkReduction: 0,
        patientPayment: 0,
        remainingAmount: 0,
        monthlyInstallment: 0
      };
    }

    const listPrice = formData.listPrice;
    let salePrice = listPrice;
    let sgkReduction = 0;
    
    // Apply SGK reduction if applicable (matches legacy system logic)
    if (formData.sgkSupportType && formData.sgkSupportType !== 'no_coverage') {
      const sgkAmount = sgkAmounts[formData.sgkSupportType as keyof typeof sgkAmounts] || 0;
      sgkReduction = Math.min(sgkAmount, listPrice);
      salePrice = listPrice - sgkReduction;
    }
    
    // Apply discount
    let discountAmount = 0;
    if (formData.discountType === 'percentage' && formData.discountValue) {
      discountAmount = (salePrice * formData.discountValue) / 100;
    } else if (formData.discountType === 'amount' && formData.discountValue) {
      discountAmount = formData.discountValue;
    }
    
    const finalSalePrice = Math.max(0, salePrice - discountAmount);
    
    // Calculate patient payment (considering bilateral devices)
    const quantity = formData.ear === 'both' ? 2 : 1;
    const patientPayment = Math.max(0, finalSalePrice * quantity);
    const remainingAmount = Math.max(0, patientPayment - (formData.downPayment || 0));
    
    // Calculate monthly installment if applicable
    let monthlyInstallment = 0;
    if (formData.paymentMethod === 'installment' && formData.installmentCount && remainingAmount > 0) {
      monthlyInstallment = remainingAmount / formData.installmentCount;
    }

    return {
      salePrice: finalSalePrice,
      sgkReduction,
      patientPayment,
      remainingAmount,
      monthlyInstallment
    };
  }, [formData.listPrice, formData.sgkSupportType, formData.discountType, formData.discountValue, formData.downPayment, formData.ear, formData.paymentMethod, formData.installmentCount, sgkAmounts]);

  // Handle device selection
  const handleDeviceSelect = (device: DeviceInventoryItem) => {
    setSelectedDevice(device);
    setFormData(prev => ({
      ...prev,
      deviceId: device.id,
      listPrice: device.price,
      trialListPrice: device.price,
      trialPrice: device.price
    }));
  };

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.deviceId) {
      newErrors.deviceId = 'Cihaz seçimi zorunludur';
    }

    if (!formData.assignedDate) {
      newErrors.assignedDate = 'Atama tarihi zorunludur';
    }

    if (!formData.status) {
      newErrors.status = 'Durum seçimi zorunludur';
    }

    if (!formData.reason) {
      newErrors.reason = 'Atama sebebi zorunludur';
    }

    if (formData.status === 'trial' && !formData.trialEndDate) {
      newErrors.trialEndDate = 'Deneme bitiş tarihi zorunludur';
    }

    if (!formData.ear) {
      newErrors.ear = 'Kulak seçimi zorunludur';
    }

    // Serial number validation - NOT REQUIRED anymore
    // Serial numbers are optional, can be assigned later

    // Pricing validation
    if (formData.reason === 'sale') {
      if (!formData.listPrice || formData.listPrice <= 0) {
        newErrors.listPrice = 'Liste fiyatı zorunludur';
      }
      if (!formData.paymentMethod) {
        newErrors.paymentMethod = 'Ödeme yöntemi seçimi zorunludur';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      patientId,
      assignedDate: new Date().toISOString().split('T')[0],
      status: 'assigned',
      assignedBy: 'current_user',
      ear: 'left',
      reason: 'sale',
      discountType: 'none',
      paymentMethod: 'cash'
    });
    setErrors({});
    setSearchTerm('');
    setSelectedDevice(null);
  };

  // Merge formData with calculated pricing
  const enrichedFormData = useMemo(() => ({
    ...formData,
    ...calculatedPricing
  }), [formData, calculatedPricing]);

  return {
    // Form state
    formData: enrichedFormData,
    setFormData,
    updateFormData,
    
    // Device management
    availableDevices,
    filteredDevices,
    selectedDevice,
    searchTerm,
    setSearchTerm,
    handleDeviceSelect,
    
    // Validation
    errors,
    validateForm,
    
    // Pricing calculations
    sgkAmounts,
    
    // Form actions
    resetForm
  };
};