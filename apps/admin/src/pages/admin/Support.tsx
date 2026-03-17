import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  TicketIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  ListAdminTicketsParams,
  ResponseEnvelopeListUserRead,
  TicketCreate,
  TicketStatus,
  TicketUpdate,
  useListAdminTickets,
  useCreateAdminTicket,
  useUpdateAdminTicket,
  useListAdminUsers,
} from '@/lib/api-client';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import {
  SupportTicket,
  TicketStatusFilter,
  TicketPriorityFilter,
  CreateTicketFormData,
  getTickets,
  getTicketPagination,
  getAdminUsers,
  getErrorMessage,
  isOverdue,
} from './support/types';
import TicketFilters from './support/TicketFilters';
import { TicketListView, TicketKanbanView } from './support/TicketTable';
import TicketDetailModal from './support/TicketDetailModal';
import CreateTicketModal from './support/CreateTicketModal';

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
          <div className="flex rounded-xl shadow-sm">
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
            className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white premium-gradient tactile-press focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-feedback ${isMobile ? 'w-full' : ''}`}
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Yeni Ticket
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-4'}`}>
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-2xl">
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

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-2xl">
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

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-2xl">
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

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-2xl">
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

      <TicketFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        pagination={pagination}
        page={page}
        limit={limit}
        isMobile={isMobile}
      />

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

export default Support;
