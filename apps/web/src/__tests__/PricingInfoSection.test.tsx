import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PricingInfoSection } from '../pages/inventory/components/PricingInfoSection';
import { InventoryItem } from '../types/inventory';

// Mock usePermissions to allow cost view
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    permissions: ['*'],
    role: 'admin',
    isSuperAdmin: true,
    isLoading: false,
  }),
}));

// Mock @x-ear/ui-web so Checkbox, Select, Card, Input render real HTML elements
vi.mock('@x-ear/ui-web', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { fullWidth?: boolean }>(
    ({ fullWidth, ...props }, ref) => { void fullWidth; return <input ref={ref} {...props} />; }
  ),
  Checkbox: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    (props, ref) => <input ref={ref} type="checkbox" {...props} />
  ),
  Select: React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { options?: Array<{ value: string; label: string }>; fullWidth?: boolean }>(
    ({ options, fullWidth, ...props }, ref) => {
      void fullWidth;
      return (
        <select ref={ref} {...props}>
          {options?.map((o: { value: string; label: string }) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
  ),
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

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
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
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
