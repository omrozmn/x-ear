import React from 'react';

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

export const getStatusBadge = (status: string | undefined) => {
  if (!status) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
      {statusLabels[status] || status}
    </span>
  );
};
