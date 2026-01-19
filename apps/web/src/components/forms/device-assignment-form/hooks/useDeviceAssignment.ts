import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DeviceInventoryItem } from '../components/DeviceSearchForm';
import { DeviceAssignment } from '../components/AssignmentDetailsForm';
import { getCurrentUserId } from '@/utils/auth-utils';
import { listInventory } from '@/api/client/inventory.client';

// Interface representing raw backend assignment data with both camelCase and snake_case variants
interface RawAssignmentData extends Partial<DeviceAssignment> {
  // Snake_case variants from backend
  report_status?: string;
  is_loaner?: boolean;
  loaner_inventory_id?: string;
  loaner_serial_number?: string;
  loaner_serial_number_left?: string;
  loaner_serial_number_right?: string;
  loaner_brand?: string;
  loaner_model?: string;
  sgk_scheme?: string;
  down_payment?: number;
  discount_value?: number;
  discount_type?: string;
  list_price?: number;
  payment_method?: string;
  delivery_status?: string;
  ear_side?: string;
  device_name?: string;
  deviceName?: string;
  deviceBrand?: string;
  deviceModel?: string;
}


interface UseDeviceAssignmentProps {
  partyId: string;
  assignment?: RawAssignmentData | null;
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
    partyPayment: number;
    remainingAmount: number;
    monthlyInstallment: number;
  };

  // Form actions
  resetForm: () => void;
}

export const useDeviceAssignment = ({
  partyId,
  assignment,
  isOpen
}: UseDeviceAssignmentProps): UseDeviceAssignmentReturn => {
  // Form state
  const [formData, setFormData] = useState<Partial<DeviceAssignment>>({
    partyId,
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
        const rawReportStatus = String(assignment.reportStatus || assignment.report_status || '').toLowerCase().trim();

        // Debug logging disabled to reduce console noise
        // console.log('🔍 [useDeviceAssignment] RELOADED DEBUG:', {...});

        let normalizedReportStatus: 'received' | 'pending' | 'none' | undefined = undefined;
        if (['raporlu', 'received', 'has_report', 'true'].includes(rawReportStatus)) normalizedReportStatus = 'received';
        else if (['bekleniyor', 'pending'].includes(rawReportStatus)) normalizedReportStatus = 'pending';
        else if (['none', 'raporsuz'].includes(rawReportStatus)) normalizedReportStatus = 'none';
        // Empty/null/undefined will stay undefined/empty, showing "Seçiniz..."

        // Initialize loaner fields if present in the incoming assignment
        // This ensures that when editing a loaner assignment, the loaner data is pre-filled
        const loanerFields = {
          isLoaner: assignment.isLoaner || assignment.is_loaner || false,
          loanerInventoryId: assignment.loanerInventoryId || assignment.loaner_inventory_id,
          loanerSerialNumber: assignment.loanerSerialNumber || assignment.loaner_serial_number,
          loanerSerialNumberLeft: assignment.loanerSerialNumberLeft || assignment.loaner_serial_number_left,
          loanerSerialNumberRight: assignment.loanerSerialNumberRight || assignment.loaner_serial_number_right,
          loanerBrand: assignment.loanerBrand || assignment.loaner_brand,
          loanerModel: assignment.loanerModel || assignment.loaner_model,
          // Also capture any snake_case variants from backend just in case
          loaner_inventory_id: assignment.loaner_inventory_id,
          loaner_serial_number: assignment.loaner_serial_number
        };

        // Debug logging disabled to reduce console noise
        // console.log('🔍 [useDeviceAssignment] LOANER FIELDS:', {...});

        // Edit mode - load assignment data
        setFormData({
          ...assignment,
          ...loanerFields,
          // Explicitly map pricing/payment fields to ensure they persist over spread
          sgkSupportType: assignment.sgkSupportType || assignment.sgk_scheme || '',
          downPayment: assignment.downPayment || assignment.down_payment || 0,
          discountValue: assignment.discountValue || assignment.discount_value || 0,
          discountType: (assignment.discountType || assignment.discount_type || 'none') as DeviceAssignment['discountType'],
          listPrice: assignment.listPrice || assignment.list_price || 0,
          paymentMethod: (assignment.paymentMethod || assignment.payment_method || '') as DeviceAssignment['paymentMethod'],
          reason: (assignment.reason || 'sale') as DeviceAssignment['reason'],

          assignedDate: assignment.assignedDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          reportStatus: normalizedReportStatus, // Explicitly set normalized value
          deliveryStatus: (assignment.deliveryStatus || assignment.delivery_status || 'pending').toLowerCase() as DeviceAssignment['deliveryStatus'],
          // Ensure ear is normalized (backend might send LEFT/RIGHT uppercase)
          ear: (assignment.ear || assignment.ear_side || 'left').toLowerCase() as 'left' | 'right' | 'both',
        });

        // If assignment has deviceId, find and select the device
        if (assignment.deviceId) {
          setSearchTerm(''); // Will trigger device selection after inventory loads
        }
      } else {
        // Create mode
        setFormData({
          partyId,
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
  }, [isOpen, assignment, partyId]);

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

        // Debug logging disabled to reduce console noise
        // console.log('✓ Loaded inventory:', devices);
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
            // Extract brand and model from various possible field names
            let brand = assignment.brand || assignment.deviceBrand;
            let model = assignment.model || assignment.deviceModel;

            // For loaner devices, check loaner-specific fields
            if (assignment.isLoaner || assignment.is_loaner) {
              brand = brand || assignment.loanerBrand || assignment.loaner_brand;
              model = model || assignment.loanerModel || assignment.loaner_model;
            }

            // Extract from deviceName if available (e.g., "ReSound hb-2477")
            if (!brand || !model) {
              const deviceName = assignment.deviceName || assignment.device_name;
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
        partyPayment: 0,
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

    // Party payment is final sale price per unit times quantity
    const partyPayment = Math.max(0, finalSalePricePerUnit * quantity);
    const remainingAmount = Math.max(0, partyPayment - (formData.downPayment || 0));

    // Monthly installment if applicable
    let monthlyInstallment = 0;
    if (formData.paymentMethod === 'installment' && formData.installmentCount && remainingAmount > 0) {
      monthlyInstallment = remainingAmount / formData.installmentCount;
    }

    return {
      salePrice: finalSalePricePerUnit,
      sgkReduction: totalSgkReduction,
      partyPayment,
      remainingAmount,
      monthlyInstallment
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.listPrice, formData.sgkSupportType, formData.discountType, formData.discountValue, formData.downPayment, formData.ear, formData.paymentMethod, formData.installmentCount, sgkAmounts]);

  // Sync calculated pricing back into formData so UI components read the canonical values
  // Use a ref to track if we're in the middle of a pricing sync to prevent loops
  const pricingSyncRef = useRef(false);

  useEffect(() => {
    // Prevent re-entry during sync
    if (pricingSyncRef.current) return;

    // Only update when calculated values differ from formData to avoid loops
    setFormData(prev => {
      const updates: Partial<DeviceAssignment> = {};

      // Use tolerance for floating point comparison
      const tolerance = 0.01;
      const isDifferent = (a: number | undefined, b: number) =>
        a === undefined || Math.abs((a || 0) - b) > tolerance;

      if (isDifferent(prev.salePrice, calculatedPricing.salePrice)) updates.salePrice = calculatedPricing.salePrice;
      if (isDifferent(prev.sgkReduction, calculatedPricing.sgkReduction)) updates.sgkReduction = calculatedPricing.sgkReduction;
      if (isDifferent(prev.partyPayment, calculatedPricing.partyPayment)) updates.partyPayment = calculatedPricing.partyPayment;
      if (isDifferent(prev.remainingAmount, calculatedPricing.remainingAmount)) updates.remainingAmount = calculatedPricing.remainingAmount;
      if (isDifferent(prev.monthlyInstallment, calculatedPricing.monthlyInstallment)) updates.monthlyInstallment = calculatedPricing.monthlyInstallment;

      if (Object.keys(updates).length === 0) return prev;

      pricingSyncRef.current = true;
      // Reset the flag after the state update is processed
      setTimeout(() => { pricingSyncRef.current = false; }, 0);

      return { ...prev, ...updates };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedPricing.salePrice, calculatedPricing.sgkReduction, calculatedPricing.partyPayment, calculatedPricing.remainingAmount, calculatedPricing.monthlyInstallment]);

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
      // Payment method is only required if downPayment is entered
      const downPayment = formData.downPayment || 0;
      if (downPayment > 0 && !formData.paymentMethod) {
        newErrors.paymentMethod = 'Peşinat girildiğinde ödeme yöntemi seçimi zorunludur';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      partyId,
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