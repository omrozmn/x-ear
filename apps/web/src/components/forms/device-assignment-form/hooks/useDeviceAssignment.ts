import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { DeviceInventoryItem } from '../components/DeviceSearchForm';
import { DeviceAssignment } from '../components/AssignmentDetailsForm';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5003/api'
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
  setSelectedDevice: (device: DeviceInventoryItem | null) => void;

  // Validation
  errors: Record<string, string>;
  validateForm: () => boolean;

  // Pricing calculations
  sgkAmounts: Record<string, number>;
  calculatedPricing: {
    salePrice: number;
    sgkReduction: number;
    patientPayment: number;
    remainingAmount: number;
    monthlyInstallment: number;
  };

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
    setFormData(prev => {
      // Only update if value actually changed
      if (prev[field] === value) {
        return prev;
      }
      return { ...prev, [field]: value };
    });
  }, []);

  // Reset form when modal opens/closes or assignment changes
  useEffect(() => {
    if (isOpen) {
      if (assignment) {
        // Normalize reportStatus to match dropdown options
        const rawReportStatus = String(assignment.reportStatus || (assignment as any).report_status || '').toLowerCase().trim();

        console.log('🔍 [useDeviceAssignment] RELOADED DEBUG:', {
          incomingAssignment: assignment,
          reportStatus: assignment.reportStatus,
          snake_report: (assignment as any).report_status,
          rawNormalized: rawReportStatus
        });

        let normalizedReportStatus: 'received' | 'pending' | 'none' | undefined = undefined;
        if (['raporlu', 'received', 'has_report', 'true'].includes(rawReportStatus)) normalizedReportStatus = 'received';
        else if (['bekleniyor', 'pending'].includes(rawReportStatus)) normalizedReportStatus = 'pending';
        else if (['none', 'raporsuz'].includes(rawReportStatus)) normalizedReportStatus = 'none';
        // Empty/null/undefined will stay undefined/empty, showing "Seçiniz..."

        // Initialize loaner fields if present in the incoming assignment
        // This ensures that when editing a loaner assignment, the loaner data is pre-filled
        const loanerFields = {
          isLoaner: (assignment as any).isLoaner || (assignment as any).is_loaner || false,
          loanerInventoryId: (assignment as any).loanerInventoryId || (assignment as any).loaner_inventory_id,
          loanerSerialNumber: (assignment as any).loanerSerialNumber || (assignment as any).loaner_serial_number,
          loanerSerialNumberLeft: (assignment as any).loanerSerialNumberLeft || (assignment as any).loaner_serial_number_left,
          loanerSerialNumberRight: (assignment as any).loanerSerialNumberRight || (assignment as any).loaner_serial_number_right,
          loanerBrand: (assignment as any).loanerBrand || (assignment as any).loaner_brand,
          loanerModel: (assignment as any).loanerModel || (assignment as any).loaner_model,
          // Also capture any snake_case variants from backend just in case
          loaner_inventory_id: (assignment as any).loaner_inventory_id,
          loaner_serial_number: (assignment as any).loaner_serial_number
        };

        // Edit mode - load assignment data
        setFormData({
          ...assignment,
          ...loanerFields,
          assignedDate: assignment.assignedDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          reportStatus: normalizedReportStatus // Explicitly set normalized value
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
        // Get auth token from localStorage
        const token = (window as any).__AUTH_TOKEN__ ||
          localStorage.getItem('x-ear.auth.token@v1') ||
          localStorage.getItem('auth_token');

        if (!token) {
          console.error('No auth token found');
          setAvailableDevices([]);
          return;
        }

        const response = await api.get('/inventory', {
          params: {
            category: 'hearing_aid',
            per_page: 100
          },
          headers: {
            Authorization: `Bearer ${token}`
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
      }
    };

    if (isOpen) {
      loadInventory();
    }
  }, [isOpen, assignment]);

  // Filter devices based on search term - using useMemo to prevent unnecessary re-renders
  const filteredDevices = useMemo(() => {
    if (!searchTerm) {
      return availableDevices;
    }

    return availableDevices.filter(device =>
      device.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.barcode && device.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
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

    // Determine per-unit SGK reduction (legacy: min(sgkAmount, listPrice))
    let sgkReductionPerUnit = 0;
    if (formData.sgkSupportType && formData.sgkSupportType !== 'no_coverage') {
      const sgkAmount = sgkAmounts[formData.sgkSupportType as keyof typeof sgkAmounts] || 0;
      sgkReductionPerUnit = Math.min(sgkAmount, listPrice);
    }

    // Quantity (bilateral means two units)
    const quantity = formData.ear === 'both' ? 2 : 1;

    // Sale price per unit after SGK but before discount
    const saleBeforeDiscountPerUnit = Math.max(0, listPrice - sgkReductionPerUnit);

    // Apply discount: percentage discounts apply on total sale price, fixed-amount discounts
    // should be treated as a total discount (not per-unit) and distributed across units.
    let discountTotal = 0;
    if (formData.discountType === 'percentage' && formData.discountValue) {
      // percentage of the total sale (after SGK)
      discountTotal = (saleBeforeDiscountPerUnit * quantity) * (formData.discountValue / 100);
    } else if (formData.discountType === 'amount' && formData.discountValue) {
      // fixed amount applies to the whole sale (not per unit)
      discountTotal = formData.discountValue;
    }

    const discountAmountPerUnit = discountTotal / quantity;
    const finalSalePricePerUnit = Math.max(0, saleBeforeDiscountPerUnit - discountAmountPerUnit);

    // Total SGK reduction across quantity
    const totalSgkReduction = sgkReductionPerUnit * quantity;

    // Patient payment is final sale price per unit times quantity
    const patientPayment = Math.max(0, finalSalePricePerUnit * quantity);
    const remainingAmount = Math.max(0, patientPayment - (formData.downPayment || 0));

    // Monthly installment if applicable
    let monthlyInstallment = 0;
    if (formData.paymentMethod === 'installment' && formData.installmentCount && remainingAmount > 0) {
      monthlyInstallment = remainingAmount / formData.installmentCount;
    }

    return {
      salePrice: finalSalePricePerUnit,
      sgkReduction: totalSgkReduction,
      patientPayment,
      remainingAmount,
      monthlyInstallment
    };
  }, [formData.listPrice, formData.sgkSupportType, formData.discountType, formData.discountValue, formData.downPayment, formData.ear, formData.paymentMethod, formData.installmentCount, sgkAmounts]);

  // Sync calculated pricing back into formData so UI components read the canonical values
  useEffect(() => {
    // Only update when calculated values differ from formData to avoid loops
    setFormData(prev => {
      const updates: Partial<DeviceAssignment> = {};
      if (prev.salePrice !== calculatedPricing.salePrice) updates.salePrice = calculatedPricing.salePrice;
      if (prev.sgkReduction !== calculatedPricing.sgkReduction) updates.sgkReduction = calculatedPricing.sgkReduction;
      if (prev.patientPayment !== calculatedPricing.patientPayment) updates.patientPayment = calculatedPricing.patientPayment;
      if (prev.remainingAmount !== calculatedPricing.remainingAmount) updates.remainingAmount = calculatedPricing.remainingAmount;
      if (prev.monthlyInstallment !== calculatedPricing.monthlyInstallment) updates.monthlyInstallment = calculatedPricing.monthlyInstallment;

      if (Object.keys(updates).length === 0) return prev;
      return { ...prev, ...updates };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedPricing.salePrice, calculatedPricing.sgkReduction, calculatedPricing.patientPayment, calculatedPricing.remainingAmount, calculatedPricing.monthlyInstallment]);

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

  // Don't merge - return formData and calculatedPricing separately
  // This prevents unnecessary re-renders when only one changes
  const enrichedFormData = useMemo(() => formData, [formData]);

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
    setSelectedDevice,

    // Validation
    errors,
    validateForm,

    // Pricing calculations
    sgkAmounts,
    calculatedPricing,

    // Form actions
    resetForm
  };
};