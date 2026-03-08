import { useState, useEffect, useMemo } from 'react';
import { listInventory, getInventory } from '@/api/client/inventory.client';
import { updateSale } from '@/api/client/sales.client';
import type { SaleUpdate } from '@/api/generated/schemas';
import type {
  Sale,
  SaleFormData,
  EditSaleState,
  PaymentRecord,
  SGKScheme,
  ServiceInfo
} from '../types';
import type { InventoryItem } from '../components/SaleFormFields';
import { ExtendedSaleRead } from '@/types/extended-sales';

export const useEditSale = (sale: Sale, isOpen: boolean) => {
  // Form data state
  const [formData, setFormData] = useState<SaleFormData>({
    productName: '',
    brand: '',
    model: '',
    category: '',
    barcode: '',
    serialNumber: '',
    serialNumberLeft: '',
    serialNumberRight: '',
    listPrice: 0,
    salePrice: 0,
    discountAmount: 0,
    discountValue: 0,  // ✅ NEW: Add discountValue to initial state
    discountType: 'none',
    sgkCoverage: 0,
    sgkScheme: '',
    downPayment: 0,
    notes: '',
    saleDate: '',
    deviceId: '',
    ear: 'both',
    quantity: 1, // Default quantity
    reason: 'Satış', // Default assignment reason
    warrantyPeriod: 24,
    fittingDate: '',
    deliveryDate: '',
    deliveryStatus: 'pending',
    reportStatus: 'raporsuz'
  });

  // UI state
  const [state, setState] = useState<EditSaleState>({
    saleType: 'device',
    saleStatus: 'draft',
    paymentMethod: 'cash',
    deviceSearchTerm: '',
    showPaymentModal: false,
    showSgkModal: false,
    showServiceModal: false,
    showDeviceSelector: false,
    isSubmitting: false,
    error: null,
    success: false
  });

  // Data states
  const [availableDevices, setAvailableDevices] = useState<InventoryItem[]>([]);
  const [productDetails, setProductDetails] = useState<InventoryItem | null>(null);
  const [sgkSchemes, setSgkSchemes] = useState<SGKScheme[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [serviceInfo, setServiceInfo] = useState<ServiceInfo>({
    type: 'warranty',
    description: '',
    duration: 24,
    cost: 0,
    notes: ''
  });

  // SGK support amounts (matching device assignment form)
  const sgkAmounts = useMemo(() => ({
    'no_coverage': 0,
    'under4_parent_working': 6104.44,
    'under4_parent_retired': 7630.56,
    'age5_12_parent_working': 5426.17,
    'age5_12_parent_retired': 6782.72,
    'age13_18_parent_working': 5087.04,
    'age13_18_parent_retired': 6358.88,
    'over18_working': 3391.36,
    'over18_retired': 4239.20,
    'under18': 5000,
    'standard': 0
  }), []);

  // Reactive pricing calculation (matching device assignment form logic)
  const calculatedPricing = useMemo(() => {
    if (!formData.listPrice || formData.listPrice <= 0) {
      return {
        salePrice: 0,
        sgkReduction: 0,
        totalAmount: 0,
        remainingAmount: 0
      };
    }

    // ✅ UPDATED: SGK ÖNCE, İndirim SONRA formula (per user decision)
    const listPrice = formData.listPrice;
    const quantity = formData.ear === 'both' ? 2 : 1;
    const totalListPrice = listPrice * quantity;

    // 1. Calculate SGK reduction per unit
    let sgkReductionPerUnit = 0;
    const sgkScheme = formData.sgkScheme as keyof typeof sgkAmounts | '';
    if (sgkScheme && sgkScheme !== 'no_coverage') {
      const sgkAmount = sgkAmounts[sgkScheme];
      if (sgkAmount !== undefined) {
        sgkReductionPerUnit = Math.min(sgkAmount, listPrice);
      }
    }

    // 2. Calculate total SGK reduction
    const totalSgkReduction = sgkReductionPerUnit * quantity;

    // 3. Apply SGK FIRST: Total after SGK
    const totalAfterSgk = totalListPrice - totalSgkReduction;

    // 4. Apply discount SECOND: To the SGK-reduced amount
    let discountTotal = 0;
    if (formData.discountType === 'percentage' && formData.discountValue) {
      discountTotal = (totalAfterSgk * formData.discountValue) / 100;
    } else if (formData.discountType === 'amount' && formData.discountValue) {
      discountTotal = formData.discountValue;
    }

    // 5. Final calculations
    const totalAmount = Math.max(0, totalAfterSgk - discountTotal);
    const salePrice = totalAmount / quantity; // Per unit final price
    const remainingAmount = Math.max(0, totalAmount - (formData.downPayment || 0));

    return {
      salePrice: salePrice,  // ✅ Fixed: Use calculated salePrice instead of undefined variable
      sgkReduction: totalSgkReduction,
      totalAmount,
      remainingAmount
    };
  }, [formData.listPrice, formData.sgkScheme, formData.discountType, formData.discountValue, formData.ear, formData.downPayment, sgkAmounts]);

  // Calculated values
  const totalPaid = paymentRecords.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const remainingBalance = calculatedPricing.totalAmount - totalPaid;
  const discountPercentage = formData.listPrice > 0 ? ((formData.discountAmount / formData.listPrice) * 100) : 0;
  const hasPayments = paymentRecords.length > 0;

  // Load available devices for assignment
  const loadAvailableDevices = async () => {
    try {
      const response = await listInventory({
        page: 1,
        per_page: 50
      });
      interface InventoryResponse { data?: InventoryItem[] }
      setAvailableDevices((response as InventoryResponse)?.data || []);
    } catch (err) {
      console.error('Error loading devices:', err);
    }
  };

  // Load SGK schemes
  const loadSgkSchemes = async () => {
    // Mock SGK schemes - in real app, this would come from API
    const mockSchemes: SGKScheme[] = [
      { id: '1', name: 'SGK Genel', code: 'SGK001', coveragePercentage: 80, maxAmount: 5000 },
      { id: '2', name: 'SGK Emekli', code: 'SGK002', coveragePercentage: 90, maxAmount: 7500 },
      { id: '3', name: 'Bağ-Kur', code: 'BK001', coveragePercentage: 75, maxAmount: 4500 },
      { id: '4', name: 'Yeşil Kart', code: 'YK001', coveragePercentage: 100, maxAmount: 3000 }
    ];
    setSgkSchemes(mockSchemes);
  };

  // Load payment records for this sale
  const loadPaymentRecords = async () => {
    try {
      // TODO: Replace with actual payments API when available
      // For now, use mock data or get from sale data
      setPaymentRecords([]);
    } catch (err) {
      console.error('Error loading payment records:', err);
      setPaymentRecords([]);
    }
  };

  // Load product details if productId exists
  const loadProductDetails = async () => {
    if (!sale.productId) return;

    try {
      const response = await getInventory(sale.productId);
      interface InventoryData { data?: InventoryItem }
      setProductDetails((response as InventoryData)?.data || null);
    } catch (err) {
      console.error('Error loading product details:', err);
    }
  };

  // Load Reference Data
  useEffect(() => {
    if (isOpen) {
      loadAvailableDevices();
      loadSgkSchemes();
    }
  }, [isOpen]);

  // Load Product Details
  useEffect(() => {
    if (sale?.productId && isOpen) {
      loadProductDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale?.productId, isOpen]);

  // Load Payment Records
  useEffect(() => {
    if (sale?.id && isOpen) {
      loadPaymentRecords();
    }
  }, [sale?.id, isOpen]);

  // Initialize form data when sale or productDetails availability changes
  useEffect(() => {
    if (sale && isOpen) {
      const s = sale as unknown as Record<string, unknown>;
      const extendedSale = sale as unknown as ExtendedSaleRead;

      // Get device data from devices array
      const devices = extendedSale.devices || [];
      const firstDevice = devices[0];

      // Calculate totals from ALL devices (for bilateral sales)
      const totalSgkCoverage = devices.reduce((sum, d) => sum + (d.sgkSupport || d.sgkCoverageAmount || 0), 0);

      // ✅ FIXED: Get serial numbers from correct devices for bilateral sales
      const leftDevice = devices.find(d => d.ear === 'left');
      const rightDevice = devices.find(d => d.ear === 'right');

      setFormData(prev => ({
        ...prev,
        // ✅ FIXED: Use productName from sale-level data (real inventory name)
        productName: (s.productName as string) || (firstDevice as Record<string, unknown> | undefined)?.productName as string || firstDevice?.name || productDetails?.name || (s.product_name as string) || sale.productId || '',
        brand: firstDevice?.brand || productDetails?.brand || (s.brand as string) || (s.productBrand as string) || (s.product_brand as string) || '',
        model: firstDevice?.model || productDetails?.model || (s.model as string) || (s.productModel as string) || (s.product_model as string) || '',
        category: firstDevice?.category || productDetails?.category || (s.category as string) || '',
        barcode: (firstDevice?.barcode || productDetails?.barcode || (s.barcode as string) || '') as string,
        serialNumber: firstDevice?.serialNumber || firstDevice?.serialNumberLeft || firstDevice?.serialNumberRight || productDetails?.availableSerials?.[0] || (s.serialNumber as string) || (s.serial_number as string) || '',
        // ✅ FIXED: Get serial numbers from correct ear devices
        serialNumberLeft: leftDevice?.serialNumber || leftDevice?.serialNumberLeft || firstDevice?.serialNumberLeft || (s.serialNumberLeft as string) || (s.serial_number_left as string) || '',
        serialNumberRight: rightDevice?.serialNumber || rightDevice?.serialNumberRight || firstDevice?.serialNumberRight || (s.serialNumberRight as string) || (s.serial_number_right as string) || '',
        // ✅ FIXED: Use per-unit prices correctly - NEVER divide by device count
        listPrice: (extendedSale.unitListPrice) ||  // PRIMARY: Explicit unit price
                   (extendedSale.listPriceTotal) ||  // FALLBACK: This is actually unit price in DB
                   firstDevice?.listPrice ||          // FALLBACK: From device assignment
                   (s.listPrice as number) || (s.list_price as number) || 0,
        
        // ✅ FIXED: Use per-unit sale price, not total
        salePrice: firstDevice?.salePrice || 
                   (devices.length > 0 ? (extendedSale.finalAmount || extendedSale.totalAmount || 0) / devices.length : 0) ||
                   (extendedSale.finalAmount || extendedSale.totalAmount || (s.amount as number) || 0),
        
        // ✅ FIXED: Initialize discountValue properly for form input
        discountAmount: extendedSale.discountAmount || (s.discount_amount as number) || 0,  // Keep for backward compatibility
        discountValue: extendedSale.discountValue || (s.discount_value as number) || 0,  // ✅ PRIMARY: This is what the form uses
        discountType: (extendedSale.discountType || s.discountType || s.discount_type || 'none') as 'none' | 'percentage' | 'amount',
        // In the calculation hook, total SGK reduction is sgkReductionPerUnit * quantity.
        // Therefore, formData.sgkCoverage isn't strictly used in the calculation, but let's set it accurately.
        sgkCoverage: totalSgkCoverage || extendedSale.sgkCoverage || (s.sgk_coverage as number) || 0,
        sgkScheme: firstDevice?.sgkScheme || (s.sgk_scheme as string) || '',
        downPayment: extendedSale.paidAmount || (s.paid_amount as number) || 0,
        notes: sale.notes || '',
        saleDate: sale.saleDate ? sale.saleDate.split('T')[0] : ((s.date as string)?.split('T')[0] || ''),
        deviceId: firstDevice?.id || sale.productId || '',
        // Check if bilateral: if devices array has 2 items with left and right, set to 'both'
        ear: devices.length === 2 && devices.some(d => d.ear === 'left') && devices.some(d => d.ear === 'right')
          ? 'both'
          : ((firstDevice?.ear as 'left' | 'right' | 'both') || (s.ear as 'left' | 'right' | 'both') || 'both'),
        reason: firstDevice?.reason || (s.reason as string) || 'Satış', // Get reason from device data
        warrantyPeriod: prev.warrantyPeriod, // Keep existing
        fittingDate: prev.fittingDate, // Keep existing
        deliveryDate: prev.deliveryDate, // Keep existing
        deliveryStatus: firstDevice?.deliveryStatus || (s.delivery_status as string) || 'pending',
        reportStatus: firstDevice?.reportStatus || (s.report_status as string) || 'none',
        inventoryId: firstDevice?.inventoryId || '',
      }));

      setState(prev => ({
        ...prev,
        saleStatus: sale.status || 'pending',
        paymentMethod: sale.paymentMethod || 'cash',
        saleType: (productDetails?.category as string) === 'hearing_aid' ? 'device' : 'service'
      }));
    }
  }, [sale, isOpen, productDetails]);

  // Update form data
  const updateFormData = (updates: Partial<SaleFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Update state
  const updateState = (updates: Partial<EditSaleState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.productName.trim()) {
      updateState({ error: 'Product name is required' });
      return false;
    }
    // Check listPrice instead of salePrice (salePrice is calculated, not user input)
    if (formData.listPrice <= 0) {
      updateState({ error: 'List price must be greater than 0' });
      return false;
    }
    if (!formData.saleDate) {
      updateState({ error: 'Satış tarihi zorunludur' });
      return false;
    }

    // ✅ STEP 7: Payment method validation (User Decision)
    if (!state.paymentMethod || state.paymentMethod.trim() === '') {
      updateState({ error: 'Ödeme yöntemi seçilmelidir' });
      return false;
    }

    // ✅ FIXED: Seri numaralar artık zorunlu değil (User Request)
    // Hearing aid kategorisi için seri numarası validasyonu kaldırıldı

    return true;
  };

  // Submit form
  const submitForm = async (onSaleUpdate: (sale: Sale) => void) => {
    console.log('[useEditSale] submitForm called');

    if (!validateForm()) {
      console.log('[useEditSale] Validation failed');
      return;
    }

    console.log('[useEditSale] Validation passed, starting update...');
    updateState({ isSubmitting: true, error: null });

    try {
      const updateData = {
        listPriceTotal: formData.listPrice,
        unitListPrice: formData.listPrice,  // ✅ NEW: Send unit list price for clarity
        finalAmount: calculatedPricing.totalAmount,
        patientPayment: calculatedPricing.totalAmount,
        // paidAmount is not part of SaleUpdate in the generated schema, but is needed for the backend logic
        paidAmount: formData.downPayment,
        discountValue: formData.discountValue,  // ✅ FIXED: Send discountValue instead of discountAmount
        discountType: formData.discountType || undefined,  // CRITICAL: Send discount type
        sgkCoverage: formData.sgkCoverage,
        notes: formData.notes,
        status: state.saleStatus,
        paymentMethod: state.paymentMethod,
        // Device-specific fields
        ear: formData.ear || undefined,  // CRITICAL: Send ear selection
        sgkScheme: formData.sgkScheme || undefined,
        serialNumberLeft: formData.serialNumberLeft || undefined,
        serialNumberRight: formData.serialNumberRight || undefined,
        deliveryStatus: formData.deliveryStatus || undefined,
        reportStatus: formData.reportStatus || undefined
      };

      console.log('[useEditSale] Update data:', updateData);
      console.log('[useEditSale] Sale ID:', sale.id);

      interface UpdateResponse { data?: Sale }
      const response = await updateSale(sale.id!, updateData as unknown as SaleUpdate) as UpdateResponse;

      console.log('[useEditSale] Update response:', response);

      if (response?.data) {
        console.log('[useEditSale] Update successful, calling onSaleUpdate');
        onSaleUpdate(response.data as Sale);
        updateState({ success: true, isSubmitting: false });

        setTimeout(() => {
          updateState({ success: false });
        }, 2000);
      } else {
        console.error('[useEditSale] No data in response:', response);
        updateState({
          error: 'No data returned from server',
          isSubmitting: false
        });
      }
    } catch (err: unknown) {
      console.error('[useEditSale] Error updating sale:', err);
      const errorObj = err as {
        response?: {
          data?: {
            error?: string | { message?: string; code?: string; details?: unknown };
            detail?: string;
            message?: string
          }
        };
        message?: string
      };

      // Extract error message from various possible structures
      let errorMessage = 'Failed to update sale';

      if (errorObj.response?.data?.error) {
        const errorField = errorObj.response.data.error;
        if (typeof errorField === 'string') {
          errorMessage = errorField;
        } else if (typeof errorField === 'object' && errorField.message) {
          errorMessage = errorField.message;
        }
      } else if (errorObj.response?.data?.detail) {
        errorMessage = errorObj.response.data.detail;
      } else if (errorObj.response?.data?.message) {
        errorMessage = errorObj.response.data.message;
      } else if (errorObj.message) {
        errorMessage = errorObj.message;
      }

      console.error('[useEditSale] Error message:', errorMessage);
      console.error('[useEditSale] Full error object:', JSON.stringify(errorObj, null, 2));

      updateState({
        error: errorMessage,
        isSubmitting: false
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      productName: '',
      brand: '',
      model: '',
      category: '',
      barcode: '',
      serialNumber: '',
      serialNumberLeft: '',
      serialNumberRight: '',
      listPrice: 0,
      salePrice: 0,
      discountAmount: 0,
      discountValue: 0,
      sgkCoverage: 0,
      sgkScheme: '',
      downPayment: 0,
      notes: '',
      saleDate: '',
      deviceId: '',
      ear: 'both',
      quantity: 1,
      reason: 'Satış',
      warrantyPeriod: 24,
      fittingDate: '',
      deliveryDate: '',
      deliveryStatus: 'pending',
      reportStatus: 'raporsuz'
    });

    setState({
      saleType: 'device',
      saleStatus: 'draft',
      paymentMethod: 'cash',
      deviceSearchTerm: '',
      showPaymentModal: false,
      showSgkModal: false,
      showServiceModal: false,
      showDeviceSelector: false,
      isSubmitting: false,
      error: null,
      success: false
    });
  };

  return {
    // State
    formData,
    state,
    availableDevices,
    productDetails,
    sgkSchemes,
    paymentRecords,
    serviceInfo,

    // Calculated values
    calculatedPricing,
    totalPaid,
    remainingBalance,
    discountPercentage,
    hasPayments,

    // Actions
    updateFormData,
    updateState,
    validateForm,
    submitForm,
    resetForm,
    loadAvailableDevices,
    setServiceInfo
  };
};
