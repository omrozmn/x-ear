import { useState, useEffect, useCallback, useMemo } from 'react';
import { PartyApiService } from '../../services/party/party-api.service';
import { SaleRead } from '@/api/generated/schemas';

export interface PartySale {
  id: string;
  partyId: string;
  productId?: string;
  saleDate: string;
  listPriceTotal?: number;
  actualListPriceTotal?: number;  // NEW: Actual total (unit × count) for bilateral
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paidAmount: number;
  remainingAmount?: number;
  paymentStatus: 'completed' | 'pending' | 'cancelled';
  paymentMethod?: string;
  soldBy?: string;
  sgkCoverage?: number;
  partyPayment?: number;
  sgkScheme?: string;
  sgkGroup?: string;
  discountRate?: number;
  rightEarAssignmentId?: string;
  leftEarAssignmentId?: string;
  status: 'completed' | 'pending' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Legacy form fields
  vatAmount?: number;
  vatRate?: number;
  kdvAmount?: number;
  kdvRate?: number;
  discountType?: 'percentage' | 'amount' | 'none';
  discountValue?: number;
  productBarcode?: string;
  productSerialNumber?: string;
  // Sale-level product fields (from first device)
  productName?: string;  // Real product name from inventory (e.g., "deneme")
  brand?: string;
  model?: string;
  category?: string;
  barcode?: string;
  serialNumber?: string;
  serialNumberLeft?: string;
  serialNumberRight?: string;
  devices?: Array<{
    id: string;
    name: string;
    brand: string;
    model: string;
    serialNumber?: string;
    serialNumberLeft?: string;
    serialNumberRight?: string;
    barcode?: string;
    ear?: string;
    listPrice?: number;
    salePrice?: number;
    sgkCoverageAmount?: number;
    partyResponsibleAmount?: number;
    category?: string;
    assignmentUid?: string;
  }>;
  paymentPlan?: {
    id: string;
    planName: string;
    totalAmount: number;
    installmentCount: number;
    installmentAmount: number;
    interestRate?: number;
    processingFee?: number;
    status: string;
    startDate: string;
  };
  paymentRecords?: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    dueDate?: string;
    paymentMethod: string;
    paymentType: string;
    status: string;
    referenceNumber?: string;
    notes?: string;
  }>;
  invoice?: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    status: string;
  };
}

/**
 * Hook for fetching and managing party sales
 */
export function usePartySales(partyId?: string) {
  const [sales, setSales] = useState<PartySale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  // Memoize apiService to prevent unnecessary re-renders and API calls
  const apiService = useMemo(() => new PartyApiService(), []);

  // Fetch sales for a party
  const fetchSales = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getSales(id);
      // Map Sale[] to PartySale[] with required fields
      const mappedSales: PartySale[] = (result?.data || []).map((sale: SaleRead) => {
        const status = sale.status as 'completed' | 'pending' | 'cancelled';
        const saleData = sale as unknown as Record<string, unknown>;
        return {
          ...sale,
          ...sale,
          finalAmount: typeof saleData.finalAmount === 'number' ? saleData.finalAmount : Number(saleData.finalAmount || saleData.totalAmount || 0),
          paidAmount: typeof saleData.paidAmount === 'number' ? saleData.paidAmount : Number(saleData.paidAmount || 0),
          paymentStatus: status || 'pending',
        } as unknown as PartySale;
      });
      setSales(mappedSales);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  // Load sales on mount or when partyId changes
  useEffect(() => {
    if (partyId) {
      fetchSales(partyId);
    } else {
      setSales([]);
    }
  }, [partyId, fetchSales]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Data
    sales,
    data: sales,

    // State
    loading,
    isLoading: loading,
    error,

    // Actions
    fetchSales,
    refresh: fetchSales,
    clearError
  };
}