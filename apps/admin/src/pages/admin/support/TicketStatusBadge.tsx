import React from 'react';
import { TicketPriority } from '@/lib/api-client';

export const getPriorityBadge = (priority: TicketPriority | undefined) => {
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

export const getPriorityColor = (priority: TicketPriority | undefined) => {
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
