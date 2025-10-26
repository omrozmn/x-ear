import { useState, useEffect } from 'react';
import { DeviceInventoryItem } from '../components/DeviceSearchForm';
import { DeviceAssignment } from '../components/AssignmentDetailsForm';

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
  calculatePricing: () => void;
  
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

  // Update form data helper
  const updateFormData = (field: keyof DeviceAssignment, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Reset form when modal opens/closes or assignment changes
  useEffect(() => {
    if (isOpen) {
      if (assignment) {
        // Edit mode
        setFormData({
          ...assignment,
          assignedDate: assignment.assignedDate.split('T')[0] // Convert to date input format
        });
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
      setSearchTerm('');
      setSelectedDevice(null);
    }
  }, [isOpen, assignment, patientId]);

  // Load available devices from inventory
  useEffect(() => {
    const loadInventory = async () => {
      try {
        // Mock inventory data - replace with actual API call
        const mockDevices: DeviceInventoryItem[] = [
          {
            id: '1',
            brand: 'Phonak',
            model: 'Audéo Paradise P90',
            price: 12000,
            ear: 'both',
            availableInventory: 5,
            availableSerials: ['PH001', 'PH002', 'PH003', 'PH004', 'PH005'],
            barcode: 'PH-P90-001',
            category: 'hearing_aid',
            status: 'available'
          },
          {
            id: '2',
            brand: 'Oticon',
            model: 'More 1',
            price: 11500,
            ear: 'both',
            availableInventory: 3,
            availableSerials: ['OT001', 'OT002', 'OT003'],
            barcode: 'OT-M1-001',
            category: 'hearing_aid',
            status: 'available'
          },
          {
            id: '3',
            brand: 'Cochlear',
            model: 'Nucleus 8',
            price: 45000,
            ear: 'both',
            availableInventory: 2,
            availableSerials: ['CO001', 'CO002'],
            barcode: 'CO-N8-001',
            category: 'cochlear_implant',
            status: 'available'
          },
          {
            id: '4',
            brand: 'Baha',
            model: 'Attract System',
            price: 25000,
            ear: 'both',
            availableInventory: 1,
            availableSerials: ['BA001'],
            barcode: 'BA-AS-001',
            category: 'bone_anchored',
            status: 'available'
          }
        ];
        
        setAvailableDevices(mockDevices);
        setFilteredDevices(mockDevices);
      } catch (error) {
        console.error('Envanter yüklenirken hata:', error);
      }
    };

    if (isOpen) {
      loadInventory();
    }
  }, [isOpen]);

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

  // Calculate pricing when form data changes
  const calculatePricing = () => {
    if (formData.listPrice && formData.listPrice > 0) {
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
      
      setFormData(prev => ({
        ...prev,
        salePrice: finalSalePrice,
        sgkReduction,
        patientPayment,
        remainingAmount,
        monthlyInstallment
      }));
    }
  };

  // Auto-calculate pricing when relevant fields change
  useEffect(() => {
    calculatePricing();
  }, [formData.listPrice, formData.sgkSupportType, formData.discountType, formData.discountValue, formData.downPayment]);

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

    // Serial number validation
    if (formData.ear === 'both') {
      if (!formData.serialNumberLeft) {
        newErrors.serialNumberLeft = 'Sol kulak seri numarası zorunludur';
      }
      if (!formData.serialNumberRight) {
        newErrors.serialNumberRight = 'Sağ kulak seri numarası zorunludur';
      }
    } else if (!formData.serialNumber) {
      newErrors.serialNumber = 'Seri numarası zorunludur';
    }

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

  return {
    // Form state
    formData,
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
    calculatePricing,
    
    // Form actions
    resetForm
  };
};