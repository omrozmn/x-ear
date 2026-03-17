/**
 * Property-Based Test: Complete Data Display for Payments
 * 
 * Feature: runtime-bug-fixes
 * Property 3: Complete Data Display
 * Validates: Requirements 5.3
 * 
 * Tests that all payment fields are rendered in the UI
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentsList } from '../components/sales/PaymentsList';

// Mock @x-ear/ui-web so Button renders real HTML
vi.mock('@x-ear/ui-web', async () => {
  const ReactMod = await import('react');
  return {
    Button: ({ children, onClick, className }: any) => ReactMod.createElement('button', { onClick, className }, children),
  };
});

// Mock the usePayments hook directly
const mockUsePayments = vi.fn();

vi.mock('@/hooks/usePayments', () => ({
  usePayments: (...args: unknown[]) => mockUsePayments(...args),
}));

describe('Property 3: Complete Data Display for Payments', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  it('should render all payment fields for any payment data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          saleId: fc.uuid(),
          payments: fc.array(
            fc.record({
              id: fc.uuid(),
              amount: fc.integer({ min: 1, max: 100000 }),
              currency: fc.constantFrom('TRY', 'USD', 'EUR'),
              paymentMethod: fc.constantFrom('cash', 'card', 'transfer'),
              status: fc.constantFrom('completed', 'pending', 'failed'),
              paymentDate: fc.integer({ min: 946684800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
              createdAt: fc.integer({ min: 946684800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        async ({ saleId, payments }) => {
          // Setup: Mock the API response
          mockUsePayments.mockReturnValue({
            data: { data: payments },
            isLoading: false,
            error: null,
            refetch: vi.fn(),
          });

          // Render the component
          const { container, unmount } = render(
            <PaymentsList saleId={saleId} />,
            { wrapper: createWrapper() }
          );

          // Verify: All payments are rendered
          expect(screen.getAllByText(`Ödeme Kayıtları (${payments.length})`)[0]).toBeInTheDocument();

          // Verify: Each payment has all required fields displayed
          for (const payment of payments) {
            // Check if amount is in the document (may be formatted with locale separators like 1.000 for 1000)
            const rawAmount = payment.amount.toString();
            const formattedAmount = payment.amount.toLocaleString('tr-TR');
            const textContent = container.textContent ?? '';
            expect(textContent.includes(rawAmount) || textContent.includes(formattedAmount)).toBe(true);

            // Payment method should be displayed
            const methodText = 
              payment.paymentMethod === 'cash' ? 'Nakit' :
              payment.paymentMethod === 'card' ? 'Kredi Kartı' :
              payment.paymentMethod === 'transfer' ? 'Havale/EFT' :
              payment.paymentMethod;
            expect(screen.getAllByText(methodText)[0]).toBeInTheDocument();

            // Status should be displayed
            const statusText =
              payment.status === 'completed' ? 'Tamamlandı' :
              payment.status === 'pending' ? 'Beklemede' :
              payment.status === 'failed' ? 'Başarısız' :
              payment.status;
            expect(screen.getAllByText(statusText)[0]).toBeInTheDocument();

            // Date should be displayed
            const date = new Date(payment.paymentDate || payment.createdAt);
            const formattedDate = date.toLocaleDateString('tr-TR');
            expect(screen.getAllByText(formattedDate)[0]).toBeInTheDocument();
          }
          
          // Cleanup
          unmount();
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display empty state when no payments exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (saleId) => {
          // Setup: Mock empty payments
          mockUsePayments.mockReturnValue({
            data: { data: [] },
            isLoading: false,
            error: null,
            refetch: vi.fn(),
          });

          // Render
          const { unmount } = render(<PaymentsList saleId={saleId} />, { wrapper: createWrapper() });

          // Verify: Empty state is displayed
          expect(screen.getAllByText('Henüz ödeme kaydı yok')[0]).toBeInTheDocument();
          
          // Cleanup
          unmount();
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display loading state while fetching', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (saleId) => {
          // Setup: Mock loading state
          mockUsePayments.mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
            refetch: vi.fn(),
          });

          // Render
          const { unmount } = render(<PaymentsList saleId={saleId} />, { wrapper: createWrapper() });

          // Verify: Loading indicator is displayed
          expect(screen.getAllByText('Ödemeler yükleniyor...')[0]).toBeInTheDocument();
          
          // Cleanup
          unmount();
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display error state with retry option on failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          saleId: fc.uuid(),
          errorMessage: fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{4,49}$/),
        }),
        async ({ saleId, errorMessage }) => {
          // Setup: Mock error state
          const mockRefetch = vi.fn();
          mockUsePayments.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error(errorMessage),
            refetch: mockRefetch,
          });

          // Render
          const { unmount } = render(<PaymentsList saleId={saleId} />, { wrapper: createWrapper() });

          // Verify: Error message is displayed
          expect(screen.getAllByText('Ödemeler yüklenemedi')[0]).toBeInTheDocument();
          expect(screen.getAllByText(errorMessage)[0]).toBeInTheDocument();

          // Verify: Retry button is available
          expect(screen.getAllByText('Tekrar Dene')[0]).toBeInTheDocument();
          
          // Cleanup
          unmount();
          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});
