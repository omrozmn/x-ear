import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { ProductLinesSection } from '../ProductLinesSection';

// Mock API client that the component imports
// Mock API client that the component imports
vi.mock('@/api/generated/inventory/inventory', () => ({
  listInventory: vi.fn(async () => ({
    status: 200,
    data: {
      data: [
        {
          id: 'prod-1',
          name: 'Test Product',
          brand: 'ACME',
          model: 'M1',
          price: 100,
          vatRate: 10,
          kdv: 10,
        }
      ],
      pagination: { page: 1, per_page: 20 }
    }
  })),
  getInventory: vi.fn(async () => ({
    status: 200,
    data: { id: 'prod-1', name: 'Test Product' }
  })),
  createInventory: vi.fn()
}));

describe('ProductLinesSection', () => {
  it('updates tax rate from inventory selection via modal', async () => {
    const initialLines = [
      {
        id: 'l1',
        name: '',
        quantity: 1,
        unit: 'Adet',
        unitPrice: 0,
        taxRate: 18,
        taxAmount: 0,
        total: 0
      }
    ];

    const _linesState = [...initialLines];
    const TestWrapper = () => {
      const [lines, setLines] = React.useState(initialLines);
      return <ProductLinesSection lines={lines} onChange={(next) => setLines(next)} />;
    };

    render(<TestWrapper />);

    // Type into the inline product input to open suggestions and select
    const productInput = screen.getByPlaceholderText(/Ürün adı, marka ve model/i);
    await userEvent.type(productInput, 'Test');
    const result = await screen.findByText(/Test Product/i);
    fireEvent.click(result);

    await waitFor(() => {
      // After click, the first line should update taxRate to 10
      const _updatedLine = screen.getByDisplayValue(/Test Product/);
      // Find the KDV select for the line and assert it shows 10
      const kdvSelect = screen.getAllByLabelText(/KDV/i)[0] as HTMLSelectElement;
      expect(kdvSelect.value).toBe('10');
    });
  });
});
