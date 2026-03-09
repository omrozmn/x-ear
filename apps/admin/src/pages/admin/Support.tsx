import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  TicketIcon,
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  HTTPValidationError,
  ListAdminTicketsParams,
  ResponseEnvelopeListUserRead,
  SchemasBaseResponseEnvelopeDict,
  TicketCategory,
  TicketCreate,
  TicketPriority,
  TicketResponseCreate,
  TicketStatus,
  TicketUpdate,
  useListAdminTickets,
  useCreateAdminTicket,
  useUpdateAdminTicket,
  useListAdminUsers,
  useCreateAdminTicketResponse,
} from '@/lib/api-client';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import { ResponsiveTable } from '@/components/responsive/ResponsiveTable';
import Pagination from '@/components/ui/Pagination';
import { unwrapData } from '@/lib/orval-response';

type UnknownRecord = Record<string, unknown>;
type TicketStatusFilter = TicketStatus | 'all';
type TicketPriorityFilter = TicketPriority | 'all';
type TicketColumnStatus = TicketStatus;

interface SupportTicket {
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

interface AdminUserOption {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface TicketPagination {
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
}

interface CreateTicketFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

const getString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

const getNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const isTicketStatus = (value: string): value is TicketStatus =>
  Object.values(TicketStatus).includes(value as TicketStatus);

const isTicketPriority = (value: string): value is TicketPriority =>
  Object.values(TicketPriority).includes(value as TicketPriority);

const isTicketCategory = (value: string): value is TicketCategory =>
  Object.values(TicketCategory).includes(value as TicketCategory);

const isTicketStatusFilter = (value: string): value is TicketStatusFilter =>
  value === 'all' || isTicketStatus(value);

const isTicketPriorityFilter = (value: string): value is TicketPriorityFilter =>
  value === 'all' || isTicketPriority(value);

const getErrorMessage = (error: unknown, fallback: string) => {
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

const normalizeTicket = (value: unknown): SupportTicket | null => {
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

const getTickets = (response: SchemasBaseResponseEnvelopeDict | undefined): SupportTicket[] => {
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

const getTicketPagination = (response: SchemasBaseResponseEnvelopeDict | undefined): TicketPagination | null => {
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

const getAdminUsers = (response: unknown): AdminUserOption[] => {
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

const getAdminUserLabel = (user: AdminUserOption) => {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return fullName || user.email || user.id;
};

const getPriorityBadge = (priority: TicketPriority | undefined) => {
  if (!priority) {
    return null;
  }

  const priorityClasses: Record<TicketPriority, string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  const priorityLabels: Record<TicketPriority, string> = {
    low: 'Düşük',
    medium: 'Orta',
    high: 'Yüksek',
    urgent: 'Acil',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityClasses[priority]}`}
    >
      {priorityLabels[priority]}
    </span>
  );
};

const formatDate = (dateString: string | undefined) => {
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

const isOverdue = (slaDate: string | undefined) => {
  if (!slaDate) {
    return false;
  }

  return new Date(slaDate) < new Date();
};

const Support: React.FC = () => {
  const { isMobile } = useAdminResponsive();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriorityFilter>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const ticketParams: ListAdminTicketsParams = {
    page,
    limit,
    search: searchTerm || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
  };

  const { data: ticketsData, isLoading, error } = useListAdminTickets(ticketParams);
  const { data: adminUsersData } = useListAdminUsers<ResponseEnvelopeListUserRead>({ per_page: 100 });
  const { mutateAsync: updateTicket } = useUpdateAdminTicket();
  const { mutateAsync: createTicket } = useCreateAdminTicket();

  const tickets = getTickets(ticketsData);
  const pagination = getTicketPagination(ticketsData);
  const adminUsers = getAdminUsers(adminUsersData);

  const invalidateTickets = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/admin/tickets'] });
  };

  const handleUpdateTicket = async (id: string, data: TicketUpdate) => {
    setIsSubmitting(true);
    try {
      await updateTicket({ ticketId: id, data });
      await invalidateTickets();
      toast.success('Ticket başarıyla güncellendi');
    } catch (mutationError) {
      toast.error(getErrorMessage(mutationError, 'Ticket güncellenirken hata oluştu'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTicket = async (data: CreateTicketFormData) => {
    const payload: TicketCreate = {
      title: data.title.trim(),
      description: data.description.trim() || null,
      priority: data.priority,
      category: data.category,
    };

    setIsSubmitting(true);
    try {
      await createTicket({ data: payload });
      await invalidateTickets();
      toast.success('Ticket başarıyla oluşturuldu');
      setShowCreateModal(false);
    } catch (mutationError) {
      toast.error(getErrorMessage(mutationError, 'Ticket oluşturulurken hata oluştu'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
  };

  const handleAssignTicket = (ticketId: string, adminId: string) => {
    handleUpdateTicket(ticketId, { assignedTo: adminId || null });
  };

  const handleStatusChange = (ticketId: string, status: TicketStatus) => {
    handleUpdateTicket(ticketId, { status });
  };

  return (
    <div className={`space-y-6 ${isMobile ? 'p-4 pb-safe' : 'p-6'}`}>
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-center'}`}>
        <div>
          <h1 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
            Destek Ticketları
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Müşteri destek taleplerini yönetin ve takip edin
          </p>
        </div>
        <div className={`flex ${isMobile ? 'flex-col w-full' : 'space-x-3'} gap-3`}>
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md border touch-feedback ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${isMobile ? 'flex-1' : ''}`}
            >
              Liste
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b touch-feedback ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${isMobile ? 'flex-1' : ''}`}
            >
              Kanban
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-feedback ${isMobile ? 'w-full' : ''}`}
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Yeni Ticket
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-4'}`}>
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className={isMobile ? 'p-4' : 'p-5'}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TicketIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Toplam Ticket</dt>
                  <dd className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>
                    {pagination?.total ?? 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className={isMobile ? 'p-4' : 'p-5'}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Açık Ticketlar</dt>
                  <dd className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>
                    {tickets.filter((ticket) => ['open', 'in_progress'].includes(ticket.status)).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className={isMobile ? 'p-4' : 'p-5'}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">SLA Aşımı</dt>
                  <dd className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>
                    {
                      tickets.filter(
                        (ticket) => isOverdue(ticket.slaDueDate) && !['resolved', 'closed'].includes(ticket.status),
                      ).length
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className={isMobile ? 'p-4' : 'p-5'}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Bu Ay Çözülen</dt>
                  <dd className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>
                    {tickets.filter((ticket) => ticket.status === 'resolved').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-4'}`}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Ticket ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              if (isTicketStatusFilter(e.target.value)) {
                setStatusFilter(e.target.value);
              }
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="open">Açık</option>
            <option value="in_progress">İşlemde</option>
            <option value="resolved">Çözüldü</option>
            <option value="closed">Kapalı</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              if (isTicketPriorityFilter(e.target.value)) {
                setPriorityFilter(e.target.value);
              }
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tüm Öncelikler</option>
            <option value="urgent">Acil</option>
            <option value="high">Yüksek</option>
            <option value="medium">Orta</option>
            <option value="low">Düşük</option>
          </select>

          <div className={`flex items-center text-sm text-gray-500 dark:text-gray-400 ${isMobile ? 'col-span-1' : ''}`}>
            {pagination && (
              <span>
                {pagination.total} sonuçtan {(page - 1) * limit + 1}-
                {Math.min(page * limit, pagination.total)} arası gösteriliyor
              </span>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <TicketListView
          tickets={tickets}
          isLoading={isLoading}
          error={error}
          onViewTicket={handleViewTicket}
          onAssignTicket={handleAssignTicket}
          onStatusChange={handleStatusChange}
          adminUsers={adminUsers}
          page={page}
          setPage={setPage}
          limit={limit}
          setLimit={setLimit}
          pagination={pagination}
          onRetry={invalidateTickets}
        />
      ) : (
        <TicketKanbanView
          tickets={tickets}
          onViewTicket={handleViewTicket}
          formatDate={formatDate}
          isOverdue={isOverdue}
          isMobile={isMobile}
        />
      )}

      {showTicketModal && selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setShowTicketModal(false)}
          onUpdate={(data) => handleUpdateTicket(selectedTicket.id, data)}
          adminUsers={adminUsers}
          isLoading={isSubmitting}
        />
      )}

      {showCreateModal && (
        <CreateTicketModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateTicket} isLoading={isSubmitting} />
      )}
    </div>
  );
};

interface TicketListViewProps {
  tickets: SupportTicket[];
  isLoading: boolean;
  error: HTTPValidationError | null;
  onViewTicket: (ticket: SupportTicket) => void;
  onAssignTicket: (ticketId: string, adminId: string) => void;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
  adminUsers: AdminUserOption[];
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  pagination: TicketPagination | null;
  onRetry: () => Promise<void>;
}

const TicketListView: React.FC<TicketListViewProps> = ({
  tickets,
  isLoading,
  error,
  onViewTicket,
  onAssignTicket,
  onStatusChange,
  adminUsers,
  page,
  setPage,
  limit,
  setLimit,
  pagination,
  onRetry,
}) => {
  const columns = [
    {
      key: 'ticket',
      header: 'Ticket',
      render: (ticket: SupportTicket) => (
        <div className="flex items-center">
          <TicketIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{ticket.title}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{formatDate(ticket.createdAt)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Müşteri',
      mobileHidden: true,
      render: (ticket: SupportTicket) => (
        <div className="text-sm font-medium text-gray-900 dark:text-white">{ticket.tenantName || '-'}</div>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      render: (ticket: SupportTicket) => (
        <select
          value={ticket.status}
          onChange={(e) => {
            if (isTicketStatus(e.target.value)) {
              onStatusChange(ticket.id, e.target.value);
            }
          }}
          className="text-xs border-0 bg-transparent dark:bg-gray-700 dark:text-white focus:ring-0 p-0 touch-feedback"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="open">Açık</option>
          <option value="in_progress">İşlemde</option>
          <option value="resolved">Çözüldü</option>
          <option value="closed">Kapalı</option>
        </select>
      ),
    },
    {
      key: 'priority',
      header: 'Öncelik',
      mobileHidden: true,
      render: (ticket: SupportTicket) => getPriorityBadge(ticket.priority),
    },
    {
      key: 'assigned',
      header: 'Atanan',
      mobileHidden: true,
      render: (ticket: SupportTicket) => (
        <select
          value={ticket.assignedTo || ''}
          onChange={(e) => onAssignTicket(ticket.id, e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 touch-feedback"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">Atanmamış</option>
          {adminUsers.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {getAdminUserLabel(admin)}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'sla',
      header: 'SLA',
      mobileHidden: true,
      render: (ticket: SupportTicket) => (
        <div>
          <div
            className={`text-sm ${
              isOverdue(ticket.slaDueDate) && !['resolved', 'closed'].includes(ticket.status)
                ? 'text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {formatDate(ticket.slaDueDate)}
          </div>
          {isOverdue(ticket.slaDueDate) && !['resolved', 'closed'].includes(ticket.status) && (
            <div className="text-xs text-red-500 dark:text-red-400">Gecikmiş</div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'İşlemler',
      render: (ticket: SupportTicket) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewTicket(ticket);
          }}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 touch-feedback"
        >
          Detay
        </button>
      ),
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      {isLoading ? (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Ticketlar yükleniyor...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <p className="text-red-600 dark:text-red-400">Ticketlar yüklenirken hata oluştu</p>
          <button
            onClick={() => {
              void onRetry();
            }}
            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 touch-feedback"
          >
            Tekrar dene
          </button>
        </div>
      ) : (
        <>
          <ResponsiveTable
            data={tickets}
            columns={columns}
            keyExtractor={(ticket: SupportTicket) => ticket.id}
            onRowClick={onViewTicket}
            emptyMessage="Ticket bulunamadı."
          />

          <Pagination
            currentPage={page}
            totalPages={pagination?.totalPages || 1}
            totalItems={pagination?.total || 0}
            itemsPerPage={limit}
            onPageChange={setPage}
            onItemsPerPageChange={setLimit}
          />
        </>
      )}
    </div>
  );
};

interface TicketKanbanViewProps {
  tickets: SupportTicket[];
  onViewTicket: (ticket: SupportTicket) => void;
  formatDate: (date: string | undefined) => string;
  isOverdue: (date: string | undefined) => boolean;
  isMobile: boolean;
}

const TicketKanbanView: React.FC<TicketKanbanViewProps> = ({
  tickets,
  onViewTicket,
  formatDate,
  isOverdue,
  isMobile,
}) => {
  const columns: Array<{ id: TicketColumnStatus; title: string; color: string }> = [
    { id: 'open', title: 'Açık', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
    { id: 'in_progress', title: 'İşlemde', color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
    { id: 'resolved', title: 'Çözüldü', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
    { id: 'closed', title: 'Kapalı', color: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700' },
  ];

  const getTicketsByStatus = (status: TicketColumnStatus) => tickets.filter((ticket) => ticket.status === status);

  return (
    <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
      {columns.map((column) => (
        <div key={column.id} className={`rounded-lg border-2 ${column.color} p-4`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">{column.title}</h3>
            <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600">
              {getTicketsByStatus(column.id).length}
            </span>
          </div>

          <div className="space-y-3">
            {getTicketsByStatus(column.id).map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-shadow touch-feedback"
                onClick={() => onViewTicket(ticket)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{ticket.title}</h4>
                  {getPriorityBadge(ticket.priority)}
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{ticket.description}</p>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{ticket.tenantName || '-'}</span>
                  <span>{formatDate(ticket.createdAt)}</span>
                </div>

                {isOverdue(ticket.slaDueDate) && !['resolved', 'closed'].includes(ticket.status) && (
                  <div className="mt-2 flex items-center text-xs text-red-600 dark:text-red-400">
                    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                    SLA Aşımı
                  </div>
                )}

                {ticket.assignedAdminName && (
                  <div className="mt-2 flex items-center text-xs text-gray-600 dark:text-gray-400">
                    <UserIcon className="h-3 w-3 mr-1" />
                    {ticket.assignedAdminName}
                  </div>
                )}
              </div>
            ))}

            {getTicketsByStatus(column.id).length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">Bu durumda ticket yok</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

interface TicketDetailModalProps {
  ticket: SupportTicket;
  onClose: () => void;
  onUpdate: (data: TicketUpdate) => void;
  adminUsers: AdminUserOption[];
  isLoading: boolean;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  onClose,
  onUpdate,
  adminUsers,
  isLoading,
}) => {
  const [response, setResponse] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { mutateAsync: createTicketResponse } = useCreateAdminTicketResponse();

  const getPriorityColor = (priority: TicketPriority | undefined) => {
    if (priority === 'urgent') {
      return 'text-red-600';
    }
    if (priority === 'high') {
      return 'text-orange-600';
    }
    if (priority === 'medium') {
      return 'text-blue-600';
    }
    return 'text-gray-600';
  };

  const handleStatusUpdate = (status: TicketStatus) => {
    onUpdate({ status });
  };

  const handleAssignmentUpdate = (adminId: string) => {
    onUpdate({ assignedTo: adminId || null });
  };

  const handleSendResponse = async () => {
    if (!response.trim()) {
      return;
    }

    const payload: TicketResponseCreate = { message: response.trim() };

    setIsSending(true);
    try {
      await createTicketResponse({ ticketId: ticket.id, data: payload });
      toast.success('Yanıt gönderildi');
      setResponse('');
    } catch (mutationError) {
      toast.error(getErrorMessage(mutationError, 'Yanıt gönderilirken hata oluştu'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Ticket Detayları</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-lg font-medium text-gray-900 mb-2">{ticket.title}</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>

            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-2">Yanıt Ekle</h5>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={4}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Müşteriye yanıt yazın..."
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => {
                    void handleSendResponse();
                  }}
                  disabled={!response.trim() || isSending}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? 'Gönderiliyor...' : 'Yanıt Gönder'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-900 mb-3">Durum & Öncelik</h5>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Durum</label>
                  <select
                    value={ticket.status}
                    onChange={(e) => {
                      if (isTicketStatus(e.target.value)) {
                        handleStatusUpdate(e.target.value);
                      }
                    }}
                    disabled={isLoading}
                    className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="open">Açık</option>
                    <option value="in_progress">İşlemde</option>
                    <option value="resolved">Çözüldü</option>
                    <option value="closed">Kapalı</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Öncelik</label>
                  <div className={`text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority === 'low' && 'Düşük'}
                    {ticket.priority === 'medium' && 'Orta'}
                    {ticket.priority === 'high' && 'Yüksek'}
                    {ticket.priority === 'urgent' && 'Acil'}
                    {!ticket.priority && '-'}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Atanan Kişi</label>
                  <select
                    value={ticket.assignedTo || ''}
                    onChange={(e) => handleAssignmentUpdate(e.target.value)}
                    disabled={isLoading}
                    className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Atanmamış</option>
                    {adminUsers.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {getAdminUserLabel(admin)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-900 mb-3">Ticket Bilgileri</h5>

              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">Müşteri</dt>
                  <dd className="text-gray-900">{ticket.tenantName || '-'}</dd>
                </div>

                <div>
                  <dt className="text-xs text-gray-500">Oluşturulma</dt>
                  <dd className="text-gray-900">{formatDate(ticket.createdAt)}</dd>
                </div>

                <div>
                  <dt className="text-xs text-gray-500">SLA Bitiş</dt>
                  <dd
                    className={`${
                      isOverdue(ticket.slaDueDate) && !['resolved', 'closed'].includes(ticket.status)
                        ? 'text-red-600 font-medium'
                        : 'text-gray-900'
                    }`}
                  >
                    {formatDate(ticket.slaDueDate)}
                    {isOverdue(ticket.slaDueDate) && !['resolved', 'closed'].includes(ticket.status) && (
                      <span className="block text-xs text-red-500">Gecikmiş</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CreateTicketModalProps {
  onClose: () => void;
  onCreate: (data: CreateTicketFormData) => void;
  isLoading: boolean;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ onClose, onCreate, isLoading }) => {
  const [formData, setFormData] = useState<CreateTicketFormData>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'general',
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Yeni Ticket Oluştur</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Başlık
            </label>
            <input
              id="title"
              type="text"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={formData.title}
              onChange={(e) => setFormData((current) => ({ ...current, title: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Açıklama
            </label>
            <textarea
              id="description"
              required
              rows={4}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={formData.description}
              onChange={(e) => setFormData((current) => ({ ...current, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                Öncelik
              </label>
              <select
                id="priority"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.priority}
                onChange={(e) => {
                  const nextPriority = e.target.value;
                  if (isTicketPriority(nextPriority)) {
                    setFormData((current): CreateTicketFormData => ({ ...current, priority: nextPriority }));
                  }
                }}
              >
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
                <option value="urgent">Acil</option>
              </select>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Kategori
              </label>
              <select
                id="category"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.category}
                onChange={(e) => {
                  const nextCategory = e.target.value;
                  if (isTicketCategory(nextCategory)) {
                    setFormData((current): CreateTicketFormData => ({ ...current, category: nextCategory }));
                  }
                }}
              >
                <option value="general">Genel</option>
                <option value="technical">Teknik</option>
                <option value="billing">Fatura</option>
                <option value="feature_request">Özellik İsteği</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Support;
