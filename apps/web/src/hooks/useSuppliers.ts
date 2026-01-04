import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  suppliersGetSuppliers,
  suppliersCreateSupplier,
  suppliersDeleteSupplier,
  suppliersGetSupplierProducts,
  suppliersUpdateSupplier,
} from '@/api/generated';
import {
  type Supplier,
  type SuppliersCreateSupplierBody,
  type SuppliersGetSuppliersParams,
  type SuppliersUpdateSupplierBody,
} from '@/api/generated/schemas';

export const useSuppliers = (params: SuppliersGetSuppliersParams) => {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => suppliersGetSuppliers(params),
    placeholderData: (previousData, previousQuery) => previousData,
  });
};

export const useSupplier = (id: string) => {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => suppliersGetSuppliers({ search: id }),
    enabled: !!id,
    select: (data) => data?.data?.find(s => String(s.id) === String(id) || (s as any)._id === id),
  });
};

// Idempotency key generation is now handled by the API client interceptor

// Local interface matching UI form data
export interface SupplierFormData {
  companyName: string;
  companyCode?: string;
  taxNumber?: string;
  taxOffice?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  paymentTerms?: string;
  currency?: string;
  rating?: number;
  notes?: string;
  isActive?: boolean;
}

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newSupplier: SupplierFormData) => {
      // Interceptor handles snake_case conversion and Idempotency-Key
      return suppliersCreateSupplier(newSupplier as unknown as SuppliersCreateSupplierBody);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ supplierId, updates }: { supplierId: string; updates: SupplierFormData }) => {
      // Interceptor handles snake_case conversion and Idempotency-Key
      return suppliersUpdateSupplier(supplierId, updates as unknown as SuppliersUpdateSupplierBody);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suppliersDeleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
};

interface SupplierProductsResponse {
  data: {
    products: Array<{
      id: string;
      supplier_product_name?: string;
      supplier_product_code?: string;
      unit_cost?: number;
      currency?: string;
      lead_time_days?: number;
      product?: {
        name: string;
        sku?: string;
      };
    }>;
  };
}

export const useSupplierProducts = (supplierId: string) => {
  return useQuery<SupplierProductsResponse>({
    queryKey: ['supplier-products', supplierId],
    queryFn: () => (suppliersGetSupplierProducts(supplierId) as unknown) as Promise<SupplierProductsResponse>,
    enabled: !!supplierId,
  });
};
