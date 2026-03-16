import React from 'react';
import {
  ExclamationTriangleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {
  SupportTicket,
  TicketColumnStatus,
  formatDate,
  isOverdue,
} from './types';
import { getPriorityBadge } from './TicketStatusBadge';

export interface TicketKanbanViewProps {
  tickets: SupportTicket[];
  onViewTicket: (ticket: SupportTicket) => void;
  isMobile: boolean;
}

export const TicketKanbanView: React.FC<TicketKanbanViewProps> = ({
  tickets,
  onViewTicket,
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
        <div key={column.id} className={`rounded-2xl border-2 ${column.color} p-4`}>
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
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-shadow touch-feedback"
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
