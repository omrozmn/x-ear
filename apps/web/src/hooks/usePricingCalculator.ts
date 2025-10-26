import { useState, useCallback, useMemo } from 'react';
import { sgkService, SGKCalculationResult } from '../services/sgkService';

export interface PricingItem {
  id: string;
  productId: string;
  name: string;
  listPrice: number;
  salePrice?: number;
  quantity: number;
  ear?: 'left' | 'right' | 'both';
  discount?: number;
  discountType?: 'percentage' | 'fixed';
}

export interface PricingCalculation {
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  vatAmount: number;
  sgkDeduction: number;
  grandTotal: number;
  patientPayment: number;
  sgkPayment: number;
  items: PricingItem[];
  sgkCalculation?: SGKCalculationResult;
}

export interface PricingOptions {
  vatRate?: number;
  sgkSchemeId?: string;
  patientAge?: number;
  isBilateral?: boolean;
  globalDiscount?: number;
  globalDiscountType?: 'percentage' | 'fixed';
}

export function usePricingCalculator(initialOptions: PricingOptions = {}) {
  const [items, setItems] = useState<PricingItem[]>([]);
  const [options, setOptions] = useState<PricingOptions>({
    vatRate: 0.18,
    ...initialOptions
  });

  // Add item to calculation
  const addItem = useCallback((item: Omit<PricingItem, 'id'>) => {
    const newItem: PricingItem = {
      ...item,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      salePrice: item.salePrice || item.listPrice
    };
    setItems(prev => [...prev, newItem]);
  }, []);

  // Update item
  const updateItem = useCallback((id: string, updates: Partial<PricingItem>) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  // Remove item
  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // Clear all items
  const clearItems = useCallback(() => {
    setItems([]);
  }, []);

  // Update pricing options
  const updateOptions = useCallback((newOptions: Partial<PricingOptions>) => {
    setOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  // Calculate item price with discount
  const calculateItemPrice = useCallback((item: PricingItem): number => {
    const basePrice = item.salePrice || item.listPrice;
    let finalPrice = basePrice * item.quantity;

    if (item.discount && item.discount > 0) {
      if (item.discountType === 'percentage') {
        finalPrice = finalPrice * (1 - item.discount / 100);
      } else {
        finalPrice = Math.max(0, finalPrice - item.discount);
      }
    }

    return finalPrice;
  }, []);

  // Main pricing calculation
  const calculation = useMemo((): PricingCalculation => {
    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + calculateItemPrice(item), 0);

    // Apply global discount
    let discountedSubtotal = subtotal;
    let totalDiscount = 0;

    if (options.globalDiscount && options.globalDiscount > 0) {
      if (options.globalDiscountType === 'percentage') {
        totalDiscount = subtotal * (options.globalDiscount / 100);
      } else {
        totalDiscount = Math.min(subtotal, options.globalDiscount);
      }
      discountedSubtotal = subtotal - totalDiscount;
    }

    // Calculate individual item discounts
    const itemDiscounts = items.reduce((sum, item) => {
      const basePrice = (item.salePrice || item.listPrice) * item.quantity;
      const discountedPrice = calculateItemPrice(item);
      return sum + (basePrice - discountedPrice);
    }, 0);

    totalDiscount += itemDiscounts;

    // Calculate VAT
    const vatRate = options.vatRate || 0;
    const taxableAmount = discountedSubtotal;
    const vatAmount = taxableAmount * vatRate;

    // Calculate SGK deduction if applicable
    let sgkCalculation: SGKCalculationResult | undefined;
    let sgkDeduction = 0;
    let sgkPayment = 0;

    if (options.sgkSchemeId && options.patientAge !== undefined) {
      // For bilateral devices, check if we have both ears
      const hasBothEars = items.some(item => item.ear === 'both') || 
        (items.some(item => item.ear === 'left') && items.some(item => item.ear === 'right'));

      sgkCalculation = sgkService.calculateSGKDeduction({
        patientAge: options.patientAge,
        devicePrice: discountedSubtotal,
        isBilateral: options.isBilateral || hasBothEars,
        schemeId: options.sgkSchemeId
      });

      if (sgkCalculation.isEligible) {
        sgkDeduction = sgkCalculation.deductionAmount;
        sgkPayment = sgkCalculation.sgkPayment;
      }
    }

    // Calculate final amounts
    const grandTotal = taxableAmount + vatAmount;
    const patientPayment = Math.max(0, grandTotal - sgkPayment);

    return {
      subtotal,
      totalDiscount,
      taxableAmount,
      vatAmount,
      sgkDeduction,
      grandTotal,
      patientPayment,
      sgkPayment,
      items: [...items],
      sgkCalculation
    };
  }, [items, options, calculateItemPrice]);

  // Get pricing preview for a potential item
  const getItemPreview = useCallback((
    listPrice: number,
    quantity: number = 1,
    discount?: number,
    discountType?: 'percentage' | 'fixed'
  ) => {
    let itemTotal = listPrice * quantity;
    let itemDiscount = 0;

    if (discount && discount > 0) {
      if (discountType === 'percentage') {
        itemDiscount = itemTotal * (discount / 100);
      } else {
        itemDiscount = Math.min(itemTotal, discount);
      }
    }

    const finalPrice = itemTotal - itemDiscount;
    const vatAmount = finalPrice * (options.vatRate || 0);

    return {
      listPrice,
      quantity,
      itemTotal,
      itemDiscount,
      finalPrice,
      vatAmount,
      totalWithVat: finalPrice + vatAmount
    };
  }, [options.vatRate]);

  // Format currency
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  }, []);

  // Get summary for display
  const summary = useMemo(() => ({
    itemCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    hasDiscount: calculation.totalDiscount > 0,
    hasSGK: !!calculation.sgkCalculation?.isEligible,
    savings: calculation.totalDiscount + calculation.sgkDeduction,
    formattedSubtotal: formatCurrency(calculation.subtotal),
    formattedDiscount: formatCurrency(calculation.totalDiscount),
    formattedVat: formatCurrency(calculation.vatAmount),
    formattedSGK: formatCurrency(calculation.sgkDeduction),
    formattedTotal: formatCurrency(calculation.grandTotal),
    formattedPatientPayment: formatCurrency(calculation.patientPayment)
  }), [calculation, formatCurrency]);

  return {
    items,
    calculation,
    options,
    summary,
    addItem,
    updateItem,
    removeItem,
    clearItems,
    updateOptions,
    getItemPreview,
    formatCurrency
  };
}

export default usePricingCalculator;