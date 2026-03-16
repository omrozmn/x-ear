import React from 'react';
import type { DetailedPlanRead as PlanRead } from '@/api/generated/schemas';
import { formatCurrency, formatDate } from './types';

interface PlanManagerProps {
  plans: PlanRead[];
}

const PlanManager: React.FC<PlanManagerProps> = ({ plans }) => {
  return (
    <div className="bg-white shadow rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Abonelik Planları</h3>
        <p className="mt-1 text-sm text-gray-500">
          Mevcut planları görüntüleyin ve yönetin
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {plans.map((plan) => (
          <div key={plan.id} className="border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
                }`}>
                {plan.isActive ? 'Aktif' : 'Pasif'}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
            <div className="mb-4">
              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(plan.price || 0, 'TRY')}
              </span>
              <span className="text-gray-500 text-sm">
                /{plan.billingInterval === 'MONTHLY' ? 'ay' : 'yıl'}
              </span>
            </div>
            {plan.features && Object.keys(plan.features).length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Özellikler:</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  {Object.values(plan.features).slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-primary-600 rounded-full mr-2"></span>
                      {feature as string}
                    </li>
                  ))}
                  {Object.values(plan.features).length > 3 && (
                    <li className="text-gray-400">+{Object.values(plan.features).length - 3} daha fazla</li>
                  )}
                </ul>
              </div>
            )}
            <div className="text-xs text-gray-500">
              Oluşturulma: {plan.createdAt ? formatDate(plan.createdAt) : '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlanManager;
