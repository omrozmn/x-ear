import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import type { DetailedPlanRead as PlanRead } from '@/api/generated/schemas';
import { formatCurrency } from './types';

interface PlanListTableProps {
  plans: PlanRead[];
  onAddPlanClick: () => void;
  onEditPlanClick: (plan: PlanRead) => void;
  onDeletePlanClick: (id: string) => void;
}

const PlanListTable: React.FC<PlanListTableProps> = ({
  plans,
  onAddPlanClick,
  onEditPlanClick,
  onDeletePlanClick,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onAddPlanClick}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Yeni Plan Ekle
        </button>
      </div>
      <DataTable<PlanRead>
        data={plans}
        columns={[
          {
            key: 'name',
            title: 'Plan Ad\u0131',
            render: (_: unknown, plan: PlanRead) => plan.name,
          },
          {
            key: 'price',
            title: 'Fiyat',
            render: (_: unknown, plan: PlanRead) => formatCurrency(plan.price || 0, 'TRY'),
          },
          {
            key: 'billingInterval',
            title: 'Periyot',
            render: (_: unknown, plan: PlanRead) => plan.billingInterval === 'MONTHLY' ? 'Ayl\u0131k' : 'Y\u0131ll\u0131k',
          },
          {
            key: 'isActive',
            title: 'Durum',
            render: (_: unknown, plan: PlanRead) => (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {plan.isActive ? 'Aktif' : 'Pasif'}
              </span>
            ),
          },
          {
            key: '_actions',
            title: '\u0130\u015flemler',
            align: 'right',
            render: (_: unknown, plan: PlanRead) => (
              <div className="flex justify-end gap-4">
                <button onClick={() => onEditPlanClick(plan)} className="text-indigo-600 hover:text-indigo-900">D\u00fczenle</button>
                <button onClick={() => onDeletePlanClick(plan.id!)} className="text-red-600 hover:text-red-900">Sil</button>
              </div>
            ),
          },
        ] as Column<PlanRead>[]}
        rowKey={(plan) => plan.id!}
        emptyText="Hen\u00fcz plan eklenmemi\u015f"
        striped
        hoverable
        size="small"
      />
    </div>
  );
};

export default PlanListTable;
