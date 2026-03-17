import {
  SchemasBaseResponseEnvelopeDict,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/lib/api-client';
import { unwrapData } from '@/lib/orval-response';

export type UnknownRecord = Record<string, unknown>;
export type TicketStatusFilter = TicketStatus | 'all';
export type TicketPriorityFilter = TicketPriority | 'all';
export type TicketColumnStatus = TicketStatus;

export interface SupportTicket {
  id: string;
  title: string;
  description?: string;
  status: TicketStatus;
  priority?: TicketPriority;
  tenantName?: string;
  assignedTo?: string;
  assignedAdminName?: string;
  slaDueDate?: string;
  createdAt?: string;
}

export interface AdminUserOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface TicketPagination {
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
}

export interface CreateTicketFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
}

export const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

export const getString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

export const getNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export const isTicketStatus = (value: string): value is TicketStatus =>
  Object.values(TicketStatus).includes(value as TicketStatus);

export const isTicketPriority = (value: string): value is TicketPriority =>
  Object.values(TicketPriority).includes(value as TicketPriority);

export const isTicketCategory = (value: string): value is TicketCategory =>
  Object.values(TicketCategory).includes(value as TicketCategory);

export const isTicketStatusFilter = (value: string): value is TicketStatusFilter =>
  value === 'all' || isTicketStatus(value);

export const isTicketPriorityFilter = (value: string): value is TicketPriorityFilter =>
  value === 'all' || isTicketPriority(value);

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (!isRecord(error)) {
    return fallback;
  }

  const directMessage = getString(error.message);
  if (directMessage) {
    return directMessage;
  }

  const response = isRecord(error.response) ? error.response : undefined;
  const responseData = response && isRecord(response.data) ? response.data : undefined;
  const nestedError = responseData && isRecord(responseData.error) ? responseData.error : undefined;
  const nestedMessage = nestedError ? getString(nestedError.message) : undefined;

  return nestedMessage ?? fallback;
};

export const normalizeTicket = (value: unknown): SupportTicket | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = getString(value.id);
  const title = getString(value.title) ?? getString(value.subject);
  const rawStatus = getString(value.status);

  if (!id || !title || !rawStatus || !isTicketStatus(rawStatus)) {
    return null;
  }

  const rawPriority = getString(value.priority);
  const priority = rawPriority && isTicketPriority(rawPriority) ? rawPriority : undefined;

  return {
    id,
    title,
    description: getString(value.description),
    status: rawStatus,
    priority,
    tenantName: getString(value.tenantName) ?? getString(value.tenant_name),
    assignedTo: getString(value.assignedTo) ?? getString(value.assigned_to),
    assignedAdminName: getString(value.assignedAdminName) ?? getString(value.assigned_admin_name),
    slaDueDate: getString(value.slaDueDate) ?? getString(value.sla_due_date),
    createdAt: getString(value.createdAt) ?? getString(value.created_at),
  };
};

export const getTickets = (response: SchemasBaseResponseEnvelopeDict | undefined): SupportTicket[] => {
  const data = unwrapData<unknown>(response);

  if (!data) {
    return [];
  }

  const candidate = isRecord(data) && Array.isArray(data.tickets)
    ? data.tickets
    : isRecord(data) && Array.isArray(data.items)
      ? data.items
    : Array.isArray(data)
      ? data
      : [];

  return candidate
    .map(normalizeTicket)
    .filter((ticket): ticket is SupportTicket => ticket !== null);
};

export const getTicketPagination = (response: SchemasBaseResponseEnvelopeDict | undefined): TicketPagination | null => {
  const nestedData = unwrapData<unknown>(response);
  const pagination =
    nestedData && isRecord(nestedData) && isRecord(nestedData.pagination)
      ? nestedData.pagination
      : response?.meta && isRecord(response.meta)
        ? response.meta
        : undefined;

  if (!pagination || !isRecord(pagination)) {
    return null;
  }

  return {
    total: getNumber(pagination.total) ?? 0,
    totalPages: getNumber(pagination.totalPages) ?? 1,
    page: getNumber(pagination.page) ?? 1,
    perPage: getNumber(pagination.perPage) ?? 10,
  };
};

export const getAdminUsers = (response: unknown): AdminUserOption[] => {
  const payload = unwrapData<unknown>(response);
  const candidate = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.users)
      ? payload.users
    : isRecord(payload) && Array.isArray(payload.items)
      ? payload.items
      : [];

  return candidate.reduce<AdminUserOption[]>((users, user) => {
    if (!isRecord(user)) {
      return users;
    }

      const id = getString(user.id);

      if (!id) {
        return users;
      }

    users.push({
      id,
      firstName: getString(user.firstName) ?? getString(user.first_name),
      lastName: getString(user.lastName) ?? getString(user.last_name),
      email: getString(user.email),
    });

    return users;
  }, []);
};

export const getAdminUserLabel = (user: AdminUserOption) => {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return fullName || user.email || user.id;
};

export const formatDate = (dateString: string | undefined) => {
  if (!dateString) {
    return '';
  }

  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const isOverdue = (slaDate: string | undefined) => {
  if (!slaDate) {
    return false;
  }

  return new Date(slaDate) < new Date();
};
