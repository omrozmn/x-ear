import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DeviceInventoryItem } from '../components/DeviceSearchForm';
import { DeviceAssignment } from '../components/AssignmentDetailsForm';
import { getCurrentUserId } from '@/utils/auth-utils';
import { listInventory } from '@/api/generated';


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
    assignedBy: getCurrentUserId(),
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

        console.log('🔍 [useDeviceAssignment] LOANER FIELDS:', {
          raw_isLoaner: (assignment as any).isLoaner,
          raw_is_loaner: (assignment as any).is_loaner,
          raw_loanerBrand: (assignment as any).loanerBrand,
          raw_loaner_brand: (assignment as any).loaner_brand,
          raw_loanerModel: (assignment as any).loanerModel,
          raw_loaner_model: (assignment as any).loaner_model,
          extracted: loanerFields
        });

        // Edit mode - load assignment data
        setFormData({
          ...assignment,
          ...loanerFields,
          // Explicitly map pricing/payment fields to ensure they persist over spread
          sgkSupportType: (assignment as any).sgkSupportType || (assignment as any).sgkScheme || (assignment as any).sgk_scheme || '',
          downPayment: (assignment as any).downPayment || (assignment as any).down_payment || 0,
          discountValue: (assignment as any).discountValue || (assignment as any).discount_value || 0,
          discountType: (assignment as any).discountType || (assignment as any).discount_type || 'none',
          listPrice: (assignment as any).listPrice || (assignment as any).list_price || 0,

          assignedDate: assignment.assignedDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          reportStatus: normalizedReportStatus, // Explicitly set normalized value
          deliveryStatus: (assignment.deliveryStatus || (assignment as any).delivery_status || 'pending').toLowerCase(),
          // Ensure ear is normalized (backend might send LEFT/RIGHT uppercase)
          ear: (assignment.ear || (assignment as any).ear_side || 'left').toLowerCase() as 'left' | 'right' | 'both',
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
          assignedBy: getCurrentUserId(),
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
        const response = await listInventory({
          category: 'hearing_aid',
          per_page: 100
        });

        // Extract data array from response
        let itemsArray: any[] = [];
        if (response && typeof response === 'object') {
          // Case 1: { data: { data: [...] } }
          if ('data' in response && response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray(response.data.data)) {
            itemsArray = response.data.data;
          }
          // Case 2: { data: [...] }
          else if ('data' in response && Array.isArray(response.data)) {
            itemsArray = response.data;
          }
          // Case 3: Direct array
          else if (Array.isArray(response)) {
            itemsArray = response;
          }
        }

        if (itemsArray.length === 0) {
          console.warn('No inventory items found');
        }

        // Transform backend data to frontend format
        const devices: DeviceInventoryItem[] = itemsArray.map((item: any) => ({
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
          } else {
            // Fallback: Create synthetic device from assignment data if not found in inventory
            console.warn('Device not found in loaded inventory, using assignment data fallback');

            // Extract brand and model from various possible field names
            const assignmentAny = assignment as any;
            let brand = assignmentAny.brand || assignmentAny.deviceBrand;
            let model = assignmentAny.model || assignmentAny.deviceModel;

            // For loaner devices, check loaner-specific fields
            if (assignmentAny.isLoaner || assignmentAny.is_loaner) {
              brand = brand || assignmentAny.loanerBrand || assignmentAny.loaner_brand;
              model = model || assignmentAny.loanerModel || assignmentAny.loaner_model;
            }

            // Extract from deviceName if available (e.g., "ReSound hb-2477")
            if (!brand || !model) {
              const deviceName = assignmentAny.deviceName || assignmentAny.device_name;
              if (deviceName) {
                const parts = deviceName.split(' ');
                if (parts.length >= 2) {
                  brand = brand || parts[0];
                  model = model || parts.slice(1).join(' ');
                }
              }
            }

            const syntheticDevice: DeviceInventoryItem = {
              id: assignment.deviceId,
              brand: brand || 'Bilinmiyor',
              model: model || 'Bilinmiyor',
              price: assignment.listPrice || 0,
              ear: assignment.ear || 'bilateral',
              category: 'hearing_aid',
              barcode: '',
              availableInventory: 0,
              availableSerials: [],
              status: 'out_of_stock'
            };
            setSelectedDevice(syntheticDevice);
            setSearchTerm(`${syntheticDevice.brand} ${syntheticDevice.model}`);
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
      const sgkAmount = sgkAmounts[formData.sgkSupportType as keyof typeof sgkAmounts];

      if (sgkAmount !== undefined) {
        // Known scheme - use defined amount
        sgkReductionPerUnit = Math.min(sgkAmount, listPrice);
      } else {
        // Unknown scheme (e.g. 'standard') - preserve existing reduction if possible
        // Calculate per-unit from total
        const currentTotal = formData.sgkReduction || 0;
        // Don't recalculate if we can't determine authoritative source, stick to current
        sgkReductionPerUnit = currentTotal / (formData.ear === 'both' ? 2 : 1);
      }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      assignedBy: getCurrentUserId(),
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