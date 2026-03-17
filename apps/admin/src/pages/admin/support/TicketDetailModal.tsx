import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  TicketResponseCreate,
  TicketStatus,
  TicketUpdate,
  useCreateAdminTicketResponse,
} from '@/lib/api-client';
import {
  SupportTicket,
  AdminUserOption,
  isTicketStatus,
  getAdminUserLabel,
  getErrorMessage,
  formatDate,
  isOverdue,
} from './types';
import { getPriorityColor } from './TicketStatusBadge';
import TicketResponseForm from './TicketResponseForm';

export interface TicketDetailModalProps {
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
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-xl bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Ticket Detayları</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-50 rounded-2xl p-4">
              <h4 className="text-lg font-medium text-gray-900 mb-2">{ticket.title}</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>

            <TicketResponseForm
              response={response}
              setResponse={setResponse}
              isSending={isSending}
              onSend={() => {
                void handleSendResponse();
              }}
            />
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
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
                    className="block w-full text-sm border border-gray-300 rounded-xl px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="block w-full text-sm border border-gray-300 rounded-xl px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div className="bg-white border border-gray-200 rounded-2xl p-4">
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

export default TicketDetailModal;
