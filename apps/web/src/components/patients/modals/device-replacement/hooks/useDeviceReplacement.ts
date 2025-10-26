import { useState, useEffect } from 'react';
import type { InventoryItem } from '@/types/inventory';
import type { ReplacementFormData, ReplacementFormState, Device } from '../types';

export const useDeviceReplacement = (isOpen: boolean) => {
  const [formData, setFormData] = useState<ReplacementFormData>({
    replacementReason: '',
    notes: '',
    selectedInventoryItem: null,
    createReturnInvoice: false,
    invoiceType: 'individual'
  });

  const [state, setState] = useState<ReplacementFormState>({
    isLoading: false,
    error: '',
    success: false,
    searchTerm: '',
    inventoryItems: []
  });

  useEffect(() => {
    if (isOpen) {
      resetForm();
      loadInventoryItems();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      replacementReason: '',
      notes: '',
      selectedInventoryItem: null,
      createReturnInvoice: false,
      invoiceType: 'individual'
    });
    setState(prev => ({
      ...prev,
      error: '',
      success: false,
      searchTerm: ''
    }));
  };

  const loadInventoryItems = async () => {
    try {
      // Mock inventory data - replace with actual API call
      const mockInventory: InventoryItem[] = [
        {
          id: 'INV-001',
          name: 'Phonak Audéo Paradise P90-R',
          brand: 'Phonak',
          model: 'Audéo Paradise P90-R',
          category: 'hearing_aid',
          price: 15000,
          availableInventory: 5,
          totalInventory: 5,
          usedInventory: 0,
          reorderLevel: 2,
          availableSerials: ['PH001', 'PH002', 'PH003'],
          barcode: '1234567890123',
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'INV-002',
          name: 'Oticon More 1',
          brand: 'Oticon',
          model: 'More 1',
          category: 'hearing_aid',
          price: 18000,
          availableInventory: 3,
          totalInventory: 3,
          usedInventory: 0,
          reorderLevel: 2,
          availableSerials: ['OT001', 'OT002'],
          barcode: '1234567890124',
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        {
          id: 'INV-003',
          name: 'Signia Pure Charge&Go AX',
          brand: 'Signia',
          model: 'Pure Charge&Go AX',
          category: 'hearing_aid',
          price: 16500,
          availableInventory: 7,
          totalInventory: 7,
          usedInventory: 0,
          reorderLevel: 2,
          availableSerials: ['SG001', 'SG002', 'SG003', 'SG004'],
          barcode: '1234567890125',
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
      ];
      setState(prev => ({ ...prev, inventoryItems: mockInventory }));
    } catch (error) {
      console.error('Error loading inventory:', error);
      setState(prev => ({ ...prev, error: 'Envanter yüklenirken hata oluştu' }));
    }
  };

  const filteredInventory = state.inventoryItems.filter(item =>
    item.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    item.brand.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    (item.model && item.model.toLowerCase().includes(state.searchTerm.toLowerCase()))
  );

  const calculatePriceDifference = (device: Device | null) => {
    if (!formData.selectedInventoryItem || !device?.price) return 0;
    return formData.selectedInventoryItem.price - device.price;
  };

  const validateForm = () => {
    if (!formData.replacementReason) {
      setState(prev => ({ ...prev, error: 'Lütfen değişim nedenini seçiniz.' }));
      return false;
    }
    if (!formData.selectedInventoryItem) {
      setState(prev => ({ ...prev, error: 'Lütfen yeni cihaz seçiniz.' }));
      return false;
    }
    return true;
  };

  const updateFormData = (updates: Partial<ReplacementFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateState = (updates: Partial<ReplacementFormState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  return {
    formData,
    state,
    filteredInventory,
    calculatePriceDifference,
    validateForm,
    updateFormData,
    updateState,
    resetForm
  };
};