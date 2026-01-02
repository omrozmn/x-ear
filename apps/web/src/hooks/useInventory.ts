import { useState, useEffect } from 'react';
import { inventoryGetInventoryItems } from '@/api/generated';
import type { InventoryItem } from '@/api/generated/schemas';
import { unwrapArray } from '../utils/response-unwrap';

interface UseInventoryResult {
  products: InventoryItem[];
  loading: boolean;
  error: string | null;
  searchProducts: (query: string) => InventoryItem[];
  refetch: () => Promise<void>;
}

export const useInventory = (): UseInventoryResult => {
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await inventoryGetInventoryItems({
        category: 'hearing_aid', // Focus on hearing aids for sales
        search: undefined,
        lowStock: false
      });

      // Use unwrap helper for consistent response handling
      const items = unwrapArray<InventoryItem>(response);
      setProducts(items);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = (query: string): InventoryItem[] => {
    if (!query.trim()) return products;

    const searchTerm = query.toLowerCase();
    return products.filter(product =>
      product.name?.toLowerCase().includes(searchTerm) ||
      product.brand?.toLowerCase().includes(searchTerm) ||
      product.model?.toLowerCase().includes(searchTerm) ||
      product.barcode?.toLowerCase().includes(searchTerm)
    );
  };

  const refetch = async () => {
    await fetchInventory();
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return {
    products,
    loading,
    error,
    searchProducts,
    refetch
  };
};