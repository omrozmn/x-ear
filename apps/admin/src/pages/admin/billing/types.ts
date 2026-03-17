import type {
  DetailedPlanRead as PlanRead,
  InvoiceDetailResponse,
  InvoiceListResponse,
  InvoiceRead,
  PlanListResponse,
  SchemasBaseResponseEnvelope,
} from '@/api/generated/schemas';
import { isRecord as isEnvelopeRecord, unwrapData } from '@/lib/orval-response';

export interface CreateInvoiceData {
  tenant_id: string;
  amount: number;
}

export type BillingInterval = 'MONTHLY' | 'YEARLY';

export interface ApiErrorLike {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

export interface InvoicePaginationInfo {
  total?: number;
  totalPages?: number;
}

export interface AdminInvoice extends InvoiceRead {
  tenantName?: string;
  patientName?: string;
}

export interface TenantOption {
  id: string;
  name: string;
  company_name?: string;
}

export interface PlanFormState {
  name: string;
  description: string;
  price: number;
  billing_interval: BillingInterval;
  features: Record<string, string>;
  is_active: boolean;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorLike;
  return apiError.response?.data?.error?.message || fallback;
}

export function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value || 0);
}

export function getInvoices(data: InvoiceListResponse | undefined): AdminInvoice[] {
  const responseData = unwrapData<Record<string, unknown>>(data);
  if (!isRecord(responseData) || !Array.isArray(responseData.items)) {
    return [];
  }

  return responseData.items.filter((invoice): invoice is AdminInvoice => isRecord(invoice));
}

export function getInvoicePagination(data: InvoiceListResponse | undefined): InvoicePaginationInfo {
  const responseData = unwrapData<Record<string, unknown>>(data);
  if (!isRecord(responseData) || !isRecord(responseData.pagination)) {
    return {};
  }

  return {
    total: typeof responseData.pagination.total === 'number' ? responseData.pagination.total : undefined,
    totalPages: typeof responseData.pagination.totalPages === 'number' ? responseData.pagination.totalPages : undefined,
  };
}

export function getSelectedInvoice(data: InvoiceDetailResponse | undefined): AdminInvoice | null {
  const responseData = unwrapData<Record<string, unknown>>(data);
  if (!isRecord(responseData) || !isRecord(responseData.invoice)) {
    return null;
  }

  return responseData.invoice as AdminInvoice;
}

export function getPlans(data: PlanListResponse | undefined): PlanRead[] {
  // Try unwrapped envelope first
  const responseData = unwrapData<Record<string, unknown>>(data);
  if (responseData && typeof responseData === 'object') {
    if ('items' in responseData && Array.isArray(responseData.items)) {
      return responseData.items.filter((plan): plan is PlanRead => isRecord(plan) && typeof plan.id === 'string' && typeof plan.name === 'string');
    }
    if ('plans' in responseData && Array.isArray(responseData.plans)) {
      return responseData.plans.filter((plan): plan is PlanRead => isRecord(plan) && typeof plan.id === 'string' && typeof plan.name === 'string');
    }
  }

  // Orval may have unwrapped directly
  const raw = data as unknown as Record<string, unknown> | undefined;
  if (raw && typeof raw === 'object') {
    if ('items' in raw && Array.isArray(raw.items)) {
      return raw.items.filter((plan): plan is PlanRead => isRecord(plan) && typeof plan.id === 'string' && typeof plan.name === 'string');
    }
  }

  return [];
}

export function getTenants(data: unknown): TenantOption[] {
  if (isRecord(data)) {
    if (Array.isArray(data.tenants)) {
      return data.tenants.filter((tenant): tenant is TenantOption => isRecord(tenant) && typeof tenant.id === 'string' && typeof tenant.name === 'string');
    }
    if (Array.isArray(data.items)) {
      return data.items.filter((tenant): tenant is TenantOption => isRecord(tenant) && typeof tenant.id === 'string' && typeof tenant.name === 'string');
    }

    const nestedData = isEnvelopeRecord(data) ? unwrapData<Record<string, unknown>>(data) : undefined;
    if (isRecord(nestedData)) {
      if (Array.isArray(nestedData.tenants)) {
        return nestedData.tenants.filter((tenant): tenant is TenantOption => isRecord(tenant) && typeof tenant.id === 'string' && typeof tenant.name === 'string');
      }
      if (Array.isArray(nestedData.items)) {
        return nestedData.items.filter((tenant): tenant is TenantOption => isRecord(tenant) && typeof tenant.id === 'string' && typeof tenant.name === 'string');
      }
    }
  }

  return [];
}

export function getPdfUrl(data: SchemasBaseResponseEnvelope): string | null {
  const payload = unwrapData<Record<string, unknown>>(data);
  if (!isRecord(payload) || typeof payload.url !== 'string') {
    return null;
  }

  return payload.url;
}

export function getStatusBadge(status: string | undefined) {
  if (!status) return null;
  const statusClasses: Record<string, string> = {
    active: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-orange-100 text-orange-800'
  };

  const statusLabels: Record<string, string> = {
    active: 'Aktif',
    paid: 'Ödendi',
    cancelled: 'İptal',
    refunded: 'İade'
  };

  return { className: statusClasses[status] || 'bg-gray-100 text-gray-800', label: statusLabels[status] || status };
}

export function formatCurrency(amount: number, currency: string = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR');
}
