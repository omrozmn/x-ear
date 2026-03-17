/**
 * Hook to fetch invoice items (products) for a specific supplier.
 * Uses the /api/invoices/incoming/supplier-items endpoint.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { customInstance } from '@/api/orval-mutator';
import { useListInventory, useCreateInventory } from '@/api/client/inventory.client';
import toast from 'react-hot-toast';

export interface SupplierInvoiceItem {
  id: number;
  purchaseInvoiceId: number;
  invoiceNumber: string;
  invoiceDate: string | null;
  productCode: string | null;
  productName: string;
  productDescription: string | null;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  taxRate: number;
  taxAmount: number | null;
  lineTotal: number;
  inventoryId: string | null;
}

interface SupplierInvoiceItemsResponse {
  items: SupplierInvoiceItem[];
  total: number;
  supplierName: string;
}

interface ApiResponse {
  success: boolean;
  data: SupplierInvoiceItemsResponse;
  message?: string;
}

export const useSupplierInvoiceItems = (supplierName?: string) => {
  return useQuery({
    queryKey: ['supplier-invoice-items', supplierName],
    queryFn: () =>
      customInstance<ApiResponse>({
        url: '/api/invoices/incoming/supplier-items',
        method: 'GET',
        params: { supplier_name: supplierName },
      }),
    enabled: !!supplierName,
    select: (data) => data?.data,
  });
};

export const useAddToInventory = (supplierName?: string) => {
  const queryClient = useQueryClient();
  const createInventoryMutation = useCreateInventory();

  // Fetch existing inventory for this supplier to check duplicates
  const { data: existingInventory } = useListInventory(
    { supplier: supplierName, per_page: 500 },
    {
      query: {
        queryKey: ['inventory', 'supplier-check', supplierName],
        enabled: !!supplierName,
      },
    }
  );

  const isDuplicate = (productName: string): boolean => {
    if (!existingInventory) return false;

    // Unwrap response envelope
    const raw = existingInventory as Record<string, unknown>;
    let items: Array<Record<string, unknown>> = [];
    if (Array.isArray(raw?.data)) {
      items = raw.data;
    } else if (raw?.data && typeof raw.data === 'object') {
      const inner = raw.data as Record<string, unknown>;
      if (Array.isArray(inner?.data)) {
        items = inner.data;
      } else if (Array.isArray(inner?.items)) {
        items = inner.items;
      }
    }

    // Check if same supplier + same product name (brand/model) already exists
    const normalizedName = productName.toLowerCase().trim();
    return items.some((item) => {
      const itemName = ((item.name as string) || '').toLowerCase().trim();
      const itemBrand = ((item.brand as string) || '').toLowerCase().trim();
      const itemModel = ((item.model as string) || '').toLowerCase().trim();
      const fullItemName = `${itemBrand} ${itemModel}`.trim();

      return itemName === normalizedName || fullItemName === normalizedName;
    });
  };

  const addToInventory = async (item: SupplierInvoiceItem, brand?: string, model?: string) => {
    // Check for duplicates
    if (isDuplicate(item.productName)) {
      toast.error('Envanterinizde zaten kayıtlı!');
      return false;
    }

    // Use provided brand/model or fall back to parsing
    const finalBrand = brand || item.productName.split(' ')[0] || item.productName;
    const finalModel = model || (item.productName.split(' ').length > 1 ? item.productName.split(' ').slice(1).join(' ') : undefined);

    try {
      await createInventoryMutation.mutateAsync({
        data: {
          name: item.productName,
          brand: finalBrand,
          model: finalModel || null,
          category: 'hearing_aid',
          supplier: supplierName || undefined,
          price: item.unitPrice,
          cost: item.unitPrice,
          vatRate: item.taxRate,
          unit: item.unit || 'Adet',
          availableInventory: item.quantity || 1,
          totalInventory: item.quantity || 1,
          reorderLevel: 1,
          description: item.productDescription || undefined,
          stockCode: item.productCode || undefined,
          tenantId: '', // Will be set by the backend from auth context
        },
      });

      toast.success('Envanterinize kaydedildi!');
      // Invalidate inventory queries to refresh duplicate check and products tab
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-invoice-items'] });
      return true;
    } catch (error) {
      toast.error('Envantere eklenirken hata oluştu.');
      console.error('Failed to add to inventory:', error);
      return false;
    }
  };

  return {
    addToInventory,
    isLoading: createInventoryMutation.isPending,
  };
};
