import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  suppliersGetSuppliers,
  suppliersCreateSupplier,
  suppliersDeleteSupplier,
  suppliersGetSupplierProducts,
  useSuppliersCreateSupplier,
} from '@/api/generated';
import {
  type Supplier,
  type SuppliersCreateSupplierBody,
  type SuppliersGetSuppliersParams,
} from '@/api/generated/schemas';
import { customInstance } from '@/api/orval-mutator';

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

async function makeIdempotencyKey(prefix: string, body: unknown) {
  const json = JSON.stringify(body ?? {});
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json));
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}:${hex}`;
}

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
      // Transform to snake_case for backend
      const payload = {
        company_name: newSupplier.companyName,
        company_code: newSupplier.companyCode,
        tax_number: newSupplier.taxNumber,
        tax_office: newSupplier.taxOffice,
        contact_person: newSupplier.contactPerson,
        email: newSupplier.email,
        phone: newSupplier.phone,
        mobile: newSupplier.mobile,
        website: newSupplier.website,
        address: newSupplier.address,
        city: newSupplier.city,
        country: newSupplier.country,
        postal_code: newSupplier.postalCode,
        payment_terms: newSupplier.paymentTerms,
        currency: newSupplier.currency,
        rating: newSupplier.rating,
        notes: newSupplier.notes,
        is_active: newSupplier.isActive
      };

      const key = await makeIdempotencyKey('suppliers:create', payload);
      return customInstance<Supplier>({
        url: `/api/suppliers`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key
        },
        data: payload
      });
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
      // Transform to snake_case for backend
      const payload = {
        company_name: updates.companyName,
        company_code: updates.companyCode,
        tax_number: updates.taxNumber,
        tax_office: updates.taxOffice,
        contact_person: updates.contactPerson,
        email: updates.email,
        phone: updates.phone,
        mobile: updates.mobile,
        website: updates.website,
        address: updates.address,
        city: updates.city,
        country: updates.country,
        postal_code: updates.postalCode,
        payment_terms: updates.paymentTerms,
        currency: updates.currency,
        rating: updates.rating,
        notes: updates.notes,
        is_active: updates.isActive
      };

      const key = await makeIdempotencyKey('suppliers:update', { supplierId, ...payload });
      // TODO: Use proper update endpoint when available
      // The generated client might not have a dedicated update method exposed cleanly if it wasn't in the swagger
      // But based on routes/suppliers.py, PUT /api/suppliers/<id> exists.
      // We'll use axios directly or cast the api call if needed, but for now let's try to use the create method 
      // if the generated client maps PUT to it (unlikely) or if we need to use a raw request.
      // Wait, the generated client usually has an update method. Let's check api.ts again or just use axios.
      // For now, assuming api.suppliersCreateSupplier is NOT the right one for update.
      // Let's check if there is a suppliersUpdateSupplier in the generated code.
      // If not, I will use a direct axios call or the generic request.

      // Checking the generated code earlier, I didn't see suppliersUpdateSupplier explicitly in the snippet I read.
      // But I can assume it might exist or I can use the generic axios instance.
      // Let's try to find it in the api object first.

      // Actually, looking at the previous file view of api.ts, I didn't see `suppliersUpdateSupplier`.
      // I will use `axios.put` directly to be safe and ensure it hits `/api/suppliers/${supplierId}`.

      // Importing axios from the generated file or a configured instance would be best.
      // The generated file exports `suppliersCreateSupplier` which uses `axios.post`.
      // I'll assume `api` has what I need or I'll use the one from `xEarCRMAPIAutoGenerated`.

      // Let's try to use the `api` object if it has it. If not, I'll use `axios`.
      // Since I can't see the full `api` object definition here, I'll use a safe approach:
      // I'll assume the generated client *should* have it. If not, I'll use a custom fetch.

      // REVISION: I will use the `api` object but I need to be sure.
      // Let's look at `xEarCRMAPIAutoGenerated.ts` to see available methods.
      // For now, I will assume `suppliersUpdateSupplier` exists or I will use `axios` directly.
      // To be safe and quick, I will use `axios` directly if I can import it, or just try `api.suppliersUpdateSupplier` and if it fails I'll fix it.
      // Actually, I'll use `api.suppliersUpdateSupplier` if it exists.

      // Wait, I can't verify if it exists without reading the file.
      // I'll assume it exists because `PUT` route exists.

      return customInstance<Supplier>({
        url: `/api/suppliers/${supplierId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key
        },
        data: payload
      });
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
