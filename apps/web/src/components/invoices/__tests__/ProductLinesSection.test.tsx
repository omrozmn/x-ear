import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { ProductLinesSection } from '../ProductLinesSection';

// Mock @x-ear/ui-web with functional HTML elements so that inputs actually render
vi.mock('@x-ear/ui-web', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Input: ({ label, fullWidth, error, helperText, leftIcon, rightIcon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; fullWidth?: boolean; error?: string; helperText?: string; leftIcon?: React.ReactNode; rightIcon?: React.ReactNode }) => (
    <label>
      {label}
      <input data-allow-raw="true" aria-label={label} {...props} />
    </label>
  ),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Select: ({ label, options, fullWidth, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options?: Array<{ value: string; label: string }>; fullWidth?: boolean }) => (
    <label>
      {label}
      <select data-allow-raw="true" aria-label={label} {...props}>
        {(options || []).map((o: { value: string; label: string }) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  ),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Button: ({ children, variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button data-allow-raw="true" {...props}>{children}</button>
  ),
}));

// Mock the adapter module actually imported by ProductLinesSection
vi.mock('@/api/client/inventory.client', () => ({
  listInventory: vi.fn(async () => ({
    data: [
      {
        id: 'prod-1',
        name: 'Test Product',
        brand: 'ACME',
        model: 'M1',
        price: 100,
        vatRate: 10,
        kdv: 10,
        availableInventory: 5,
      },
    ],
  })),
  getInventory: vi.fn(async () => ({
    data: {
      id: 'prod-1',
      name: 'Test Product',
      brand: 'ACME',
      model: 'M1',
      price: 100,
      vatRate: 10,
      kdv: 10,
      availableInventory: 5,
    },
  })),
  createInventory: vi.fn(),
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

    // Removed unused _linesState
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
      screen.getByDisplayValue(/Test Product/); // Removed unused _updatedLine
      // Find the KDV select for the line and assert it shows 10
      const kdvSelect = screen.getAllByLabelText(/KDV/i)[0] as HTMLSelectElement;
      expect(kdvSelect.value).toBe('10');
    });
  });
});
