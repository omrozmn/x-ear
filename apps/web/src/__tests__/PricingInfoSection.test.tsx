import React from 'react';
import { render, screen } from '@testing-library/react';
import { PricingInfoSection } from '../pages/inventory/components/PricingInfoSection';
import { InventoryItem } from '../types/inventory';

describe('PricingInfoSection UI behavior', () => {
  const item: InventoryItem = {
    id: '1',
    name: 'Test Product',
    brand: 'TestBrand',
    model: 'T1',
    category: 'accessory',
    availableInventory: 10,
    totalInventory: 10,
    usedInventory: 0,
    reorderLevel: 5,
    price: 100,
    vatIncludedPrice: 118,
    totalValue: 1000,
    cost: 80,
    barcode: '12345',
    supplier: 'Supplier',
    description: 'Test',
    status: 'available',
    features: [],
    availableSerials: [],
    warranty: 12,
    taxRate: 18,
    stockCode: 'S1',
    unit: 'adet',
    createdAt: '',
    lastUpdated: ''
  };

  it('disables KDV controls when not in edit mode', () => {
    render(
      <PricingInfoSection
        item={item}
        isEditMode={false}
        editedItem={{}}
        onEditChange={() => {}}
        kdvRate={18}
        onKdvRateChange={() => {}}
        isPriceKdvIncluded={true}
        onPriceKdvIncludedChange={() => {}}
        isCostKdvIncluded={false}
        onCostKdvIncludedChange={() => {}}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // Should have checkboxes for price and cost KDV
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    checkboxes.forEach(cb => expect(cb).toBeDisabled());

    // Select (KDV rate) should be disabled
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });
});
