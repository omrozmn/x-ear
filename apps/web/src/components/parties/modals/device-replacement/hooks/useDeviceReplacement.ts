import { useState, useEffect } from 'react';
import { listInventory } from '@/api/client/inventory.client';
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
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await listInventory({ page: 1, per_page: 100 });
      const items = response?.data || [];
      
      // Map backend response to InventoryItem type
      const mappedItems: InventoryItem[] = items.map((item: Record<string, unknown>) => ({
        id: item.id as string,
        name: `${item.brand || ''} ${item.model || ''}`.trim() || (item.name as string) || 'Bilinmeyen',
        brand: (item.brand as string) || '',
        model: (item.model as string) || '',
        category: (item.category as string) || (item.deviceType as string) || 'hearing_aid',
        price: (item.listPrice as number) || (item.price as number) || 0,
        availableInventory: (item.availableInventory as number) ?? (item.quantity as number) ?? 0,
        totalInventory: (item.totalInventory as number) ?? (item.quantity as number) ?? 0,
        usedInventory: (item.usedInventory as number) ?? 0,
        reorderLevel: (item.reorderLevel as number) ?? 2,
        availableSerials: (item.availableSerials as string[]) || [],
        barcode: (item.barcode as string) || '',
        createdAt: (item.createdAt as string) || new Date().toISOString(),
        lastUpdated: (item.updatedAt as string) || (item.lastUpdated as string) || new Date().toISOString()
      }));
      
      // Filter only items with available stock
      const availableItems = mappedItems.filter(item => item.availableInventory > 0);
      
      setState(prev => ({ ...prev, inventoryItems: availableItems, isLoading: false }));
    } catch (error) {
      console.error('Error loading inventory:', error);
      setState(prev => ({ ...prev, error: 'Envanter yüklenirken hata oluştu', isLoading: false }));
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