// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from 'react';
import { PatientApiService } from '../../services/patient/patient-api.service';

export interface PatientSale {
  id: string;
  patientId: string;
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
  patientPayment?: number;
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
    patientResponsibleAmount?: number;
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
 * Hook for fetching and managing patient sales
 */
export function usePatientSales(patientId?: string) {
  const [sales, setSales] = useState<PatientSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  // Memoize apiService to prevent unnecessary re-renders and API calls
  const apiService = useMemo(() => new PatientApiService(), []);

  // Fetch sales for a patient
  const fetchSales = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getSales(id);
      setSales(result?.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  // Load sales on mount or when patientId changes
  useEffect(() => {
    if (patientId) {
      fetchSales(patientId);
    } else {
      setSales([]);
    }
  }, [patientId, fetchSales]);

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