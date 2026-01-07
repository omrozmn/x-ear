import { useState, useEffect, useCallback } from 'react';
import { 
  Invoice, 
  InvoiceFilters, 
  InvoiceSearchResult,
  CreateInvoiceData,
  UpdateInvoiceData
} from '../types/invoice';
import { invoiceService } from '../services/invoice.service';

export interface UseInvoices {
  // Data
  invoices: Invoice[];
  currentInvoice: Invoice | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  createInvoice: (data: CreateInvoiceData) => Promise<Invoice | null>;
  updateInvoice: (id: string, updates: UpdateInvoiceData) => Promise<Invoice | null>;
  deleteInvoice: (id: string) => Promise<boolean>;
  loadInvoice: (id: string) => Promise<Invoice | null>;
  searchInvoices: (filters: InvoiceFilters) => Promise<InvoiceSearchResult>;
  
  // Utility
  refreshInvoices: () => Promise<void>;
}

export function useInvoices(initialFilters?: InvoiceFilters): UseInvoices {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadInvoices(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally run only on mount

  // Listen for invoice updates
  useEffect(() => {
    const handleInvoiceUpdated = (event: CustomEvent) => {
      const { invoice } = event.detail;
      setInvoices(prev => prev.map(i => i.id === invoice.id ? invoice : i));
      
      if (currentInvoice && currentInvoice.id === invoice.id) {
        setCurrentInvoice(invoice);
      }
    };

    const handleInvoiceCreated = (event: CustomEvent) => {
      const { invoice } = event.detail;
      setInvoices(prev => [...prev, invoice]);
    };

    const handleInvoiceDeleted = (event: CustomEvent) => {
      const { invoice } = event.detail;
      setInvoices(prev => prev.filter(i => i.id !== invoice.id));
      
      if (currentInvoice && currentInvoice.id === invoice.id) {
        setCurrentInvoice(null);
      }
    };

    window.addEventListener('invoice:updated', handleInvoiceUpdated as EventListener);
    window.addEventListener('invoice:created', handleInvoiceCreated as EventListener);
    window.addEventListener('invoice:deleted', handleInvoiceDeleted as EventListener);

    return () => {
      window.removeEventListener('invoice:updated', handleInvoiceUpdated as EventListener);
      window.removeEventListener('invoice:created', handleInvoiceCreated as EventListener);
      window.removeEventListener('invoice:deleted', handleInvoiceDeleted as EventListener);
    };
  }, [currentInvoice]);

  const loadInvoices = useCallback(async (filters?: InvoiceFilters) => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoiceService.getInvoices(filters);
      setInvoices(result.invoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  const createInvoice = useCallback(async (data: CreateInvoiceData): Promise<Invoice | null> => {
    try {
      setLoading(true);
      setError(null);
      const invoice = await invoiceService.createInvoice(data);
      return invoice;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateInvoice = useCallback(async (id: string, updates: UpdateInvoiceData): Promise<Invoice | null> => {
    try {
      setLoading(true);
      setError(null);
      const invoice = await invoiceService.updateInvoice(id, updates);
      return invoice;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteInvoice = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await invoiceService.deleteInvoice(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invoice');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInvoice = useCallback(async (id: string): Promise<Invoice | null> => {
    try {
      setLoading(true);
      setError(null);
      const invoice = await invoiceService.getInvoice(id);
      setCurrentInvoice(invoice);
      return invoice;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchInvoices = useCallback(async (filters: InvoiceFilters): Promise<InvoiceSearchResult> => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoiceService.getInvoices(filters);
      setInvoices(result.invoices);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search invoices');
      return {
        invoices: [],
        total: 0,
        page: 1,
        pageSize: 0,
        totalPages: 0,
        hasMore: false,
        filters: filters || {}
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshInvoices = useCallback(async () => {
    await loadInvoices();
  }, [loadInvoices]);

  return {
    // Data
    invoices,
    currentInvoice,
    loading,
    error,
    
    // Actions
    createInvoice,
    updateInvoice,
    deleteInvoice,
    loadInvoice,
    searchInvoices,
    refreshInvoices
  };
}

// Specialized hook for single invoice
export function useInvoice(id: string | null) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setInvoice(null);
      return;
    }

    const loadInvoice = async () => {
      try {
        setLoading(true);
        setError(null);
        const invoiceData = await invoiceService.getInvoice(id);
        setInvoice(invoiceData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [id]);

  // Listen for updates to this specific invoice
  useEffect(() => {
    if (!id) return;

    const handleInvoiceUpdated = (event: CustomEvent) => {
      const { invoice: updatedInvoice } = event.detail;
      if (updatedInvoice.id === id) {
        setInvoice(updatedInvoice);
      }
    };

    const handleInvoiceDeleted = (event: CustomEvent) => {
      const { invoice: deletedInvoice } = event.detail;
      if (deletedInvoice.id === id) {
        setInvoice(null);
      }
    };

    window.addEventListener('invoice:updated', handleInvoiceUpdated as EventListener);
    window.addEventListener('invoice:deleted', handleInvoiceDeleted as EventListener);

    return () => {
      window.removeEventListener('invoice:updated', handleInvoiceUpdated as EventListener);
      window.removeEventListener('invoice:deleted', handleInvoiceDeleted as EventListener);
    };
  }, [id]);

  return { invoice, loading, error };
}