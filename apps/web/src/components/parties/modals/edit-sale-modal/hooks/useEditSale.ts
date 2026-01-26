import { useState, useEffect } from 'react';
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
    serialNumber: '',
    listPrice: 0,
    salePrice: 0,
    discountAmount: 0,
    sgkCoverage: 0,
    notes: '',
    saleDate: '',
    deviceId: '',
    ear: 'both',
    warrantyPeriod: 24,
    fittingDate: '',
    deliveryDate: ''
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

  // Calculated values
  const totalPaid = paymentRecords.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const remainingBalance = formData.salePrice - totalPaid;
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
  // Note: We use a ref or check to prevent overwriting user edits if we handled that, 
  // but here we assume simple init on open + update when data arrives.
  useEffect(() => {
    if (sale && isOpen) {
      // Use efficient fallbacks for extended Sale properties
      const s = sale as unknown as Record<string, unknown>;
      const extendedSale = sale as unknown as ExtendedSaleRead;

      setFormData(prev => ({
        ...prev,
        productName: productDetails?.name || (s.productName as string) || (s.product_name as string) || sale.productId || '',
        brand: productDetails?.brand || (s.brand as string) || (s.productBrand as string) || (s.product_brand as string) || '',
        model: productDetails?.model || (s.model as string) || (s.productModel as string) || (s.product_model as string) || '',
        serialNumber: productDetails?.availableSerials?.[0] || (s.serialNumber as string) || (s.serial_number as string) || '',
        listPrice: extendedSale.listPriceTotal || (s.listPrice as number) || (s.list_price as number) || 0,
        salePrice: extendedSale.totalAmount || (s.amount as number) || 0,
        discountAmount: extendedSale.discountAmount || (s.discount_amount as number) || 0,
        sgkCoverage: extendedSale.sgkCoverage || (s.sgk_coverage as number) || 0,
        notes: sale.notes || '',
        saleDate: sale.saleDate ? sale.saleDate.split('T')[0] : ((s.date as string)?.split('T')[0] || ''),
        deviceId: sale.productId || '',
        ear: (s.ear as 'left' | 'right' | 'both') || 'both', // default
        // Preserve existing values if they were manually set? 
        // For now, simpler to just re-sync, assuming this only runs on load.
      }));

      setState(prev => ({
        ...prev,
        saleStatus: sale.status || 'PENDING',
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
    if (formData.salePrice <= 0) {
      updateState({ error: 'Sale price must be greater than 0' });
      return false;
    }
    if (!formData.saleDate) {
      updateState({ error: 'Sale date is required' });
      return false;
    }
    return true;
  };

  // Submit form
  const submitForm = async (onSaleUpdate: (sale: Sale) => void) => {
    if (!validateForm()) return;

    updateState({ isSubmitting: true, error: null });

    try {
      const updateData: SaleUpdate = {
        patientPayment: formData.salePrice,
        discountAmount: formData.discountAmount,
        sgkCoverage: formData.sgkCoverage,
        notes: formData.notes,
        status: state.saleStatus,
        paymentMethod: state.paymentMethod
      };

      interface UpdateResponse { data?: Sale }
      const response = await updateSale(sale.id!, updateData) as UpdateResponse;

      if (response?.data) {
        onSaleUpdate(response.data as Sale);
        updateState({ success: true, isSubmitting: false });

        setTimeout(() => {
          updateState({ success: false });
        }, 2000);
      }
    } catch (err: unknown) {
      console.error('Error updating sale:', err);
      const errorObj = err as { response?: { data?: { error?: string } } };
      updateState({
        error: errorObj.response?.data?.error || 'Failed to update sale',
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
      serialNumber: '',
      listPrice: 0,
      salePrice: 0,
      discountAmount: 0,
      sgkCoverage: 0,
      notes: '',
      saleDate: '',
      deviceId: '',
      ear: 'both',
      warrantyPeriod: 24,
      fittingDate: '',
      deliveryDate: ''
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