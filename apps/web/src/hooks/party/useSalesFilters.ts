import { useState, useMemo } from 'react';

export const useSalesFilters = (sales: any[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredSales = useMemo(() => {
    if (!sales || !Array.isArray(sales)) {
      return [];
    }
    
    return sales.filter(sale => {
      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          sale.productId?.toLowerCase().includes(term) ||
          sale.paymentMethod?.toLowerCase().includes(term) ||
          sale.seller?.toLowerCase().includes(term) ||
          sale.notes?.toLowerCase().includes(term);
        
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && sale.status !== statusFilter) {
        return false;
      }

      // Payment method filter
      if (paymentMethodFilter !== 'all' && sale.paymentMethod !== paymentMethodFilter) {
        return false;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        const saleDate = new Date(sale.createdAt || sale.date);
        
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          if (saleDate < fromDate) return false;
        }
        
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999); // End of day
          if (saleDate > toDate) return false;
        }
      }

      return true;
    });
  }, [sales, searchTerm, statusFilter, paymentMethodFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentMethodFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = useMemo(() => {
    return searchTerm !== '' || 
           statusFilter !== 'all' || 
           paymentMethodFilter !== 'all' || 
           dateFrom !== '' || 
           dateTo !== '';
  }, [searchTerm, statusFilter, paymentMethodFilter, dateFrom, dateTo]);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    paymentMethodFilter,
    setPaymentMethodFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    showFilters,
    setShowFilters,
    filteredSales,
    clearFilters,
    hasActiveFilters
  };
};