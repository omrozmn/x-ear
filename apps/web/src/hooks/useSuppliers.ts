import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSuppliers,
  createSupplier,
  deleteSupplier,
  getSupplier,
  updateSupplier,
  getGetSuppliersQueryKey,
} from '@/api/generated/suppliers/suppliers';
import {
  useGetAllInventory
} from '@/api/generated/inventory/inventory';
import type {
  SupplierRead,
  SupplierCreate,
  GetSuppliersParams,
  SupplierUpdate,
} from '@/api/generated/schemas';

export const useSuppliers = (params: GetSuppliersParams) => {
  return useQuery({
    queryKey: getGetSuppliersQueryKey(params),
    queryFn: () => getSuppliers(params),
    placeholderData: (previousData) => previousData,
  });
};

export const useSupplier = (id: string) => {
  return useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => getSupplier(Number(id)),
    enabled: !!id,
    select: (data) => data?.data,
  });
};

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

// Map UI form data to API schema
const mapFormDataToApiSchema = (formData: SupplierFormData): SupplierCreate => ({
  name: formData.companyName,
  code: formData.companyCode,
  taxNumber: formData.taxNumber,
  taxOffice: formData.taxOffice,
  contactName: formData.contactPerson,
  email: formData.email,
  phone: formData.phone || formData.mobile,
  address: formData.address,
  city: formData.city,
  notes: formData.notes,
});

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newSupplier: SupplierFormData) => {
      const apiData = mapFormDataToApiSchema(newSupplier);
      return createSupplier(apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ supplierId, updates }: { supplierId: string; updates: SupplierFormData }) => {
      const apiData: SupplierUpdate = {
        name: updates.companyName,
        code: updates.companyCode,
        taxNumber: updates.taxNumber,
        taxOffice: updates.taxOffice,
        contactName: updates.contactPerson,
        email: updates.email,
        phone: updates.phone || updates.mobile,
        address: updates.address,
        city: updates.city,
        notes: updates.notes,
        isActive: updates.isActive,
      };
      return updateSupplier(Number(supplierId), apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
    },
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSupplier(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
    },
  });
};

export const useSupplierProducts = (supplierName?: string): any => {
  return useGetAllInventory(
    { supplier: supplierName, per_page: 100 },
    {
      query: {
        enabled: !!supplierName,
        select: (data) => {
          // We need to return data in a structure that matches { data: { products: [...] } }
          // Because SupplierDetailPage expects productsData.data.products
          const items = (data as any)?.data || [];
          return {
            data: {
              products: items
            }
          };
        }
      }
    }
  );
};

// Re-export types for consumers
export type { SupplierRead, GetSuppliersParams };
