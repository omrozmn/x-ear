import { useState, useEffect, useCallback, useMemo } from 'react';
import { PartyApiService } from '../../services/party/party-api.service';
import { SaleRead } from '@/api/generated/schemas';

export interface PartySale {
  id: string;
  partyId: string;
  productId?: string;
  saleDate: string;
  listPriceTotal?: number;
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
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  productBarcode?: string;
  productSerialNumber?: string;
  devices?: Array<{
    id: string;
    name: string;
    brand: string;
    model: string;
    serialNumber?: string;
    barcode?: string;
    ear?: string;
    listPrice?: number;
    salePrice?: number;
    sgkCoverageAmount?: number;
    partyResponsibleAmount?: number;
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
      const mappedSales: PartySale[] = (result?.data || []).map((sale: SaleRead) => ({
        ...sale,
        finalAmount: (sale.finalAmount as unknown as number) ?? (sale.totalAmount as unknown as number) ?? 0,
        paidAmount: (sale.paidAmount as unknown as number) ?? 0,
        paymentStatus: (sale.status as any) ?? 'pending',
      })) as unknown as PartySale[];
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