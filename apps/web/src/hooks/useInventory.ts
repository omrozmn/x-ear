import { useState, useEffect } from 'react';
import { listInventory } from '@/api/client/inventory.client';
import type { InventoryItemRead } from '@/api/generated/schemas';
import { unwrapArray } from '../utils/response-unwrap';

// Use InventoryItemCreate as base type since InventoryItemRead doesn't exist
// type InventoryItemRead = InventoryItemCreate & { id?: string };

interface UseInventoryResult {
  products: InventoryItemRead[];
  loading: boolean;
  error: string | null;
  searchProducts: (query: string) => InventoryItemRead[];
  refetch: () => Promise<void>;
}

export const useInventory = (): UseInventoryResult => {
  const [products, setProducts] = useState<InventoryItemRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await listInventory({
        category: 'hearing_aid', // Focus on hearing aids for sales
        search: undefined,
        low_stock: false
      });

      // Use unwrap helper for consistent response handling
      const items = unwrapArray<InventoryItemRead>(response);
      setProducts(items);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = (query: string): InventoryItemRead[] => {
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

// Re-export types for consumers
export type { InventoryItemRead };