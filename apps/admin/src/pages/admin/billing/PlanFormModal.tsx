import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { DetailedPlanRead as PlanRead } from '@/api/generated/schemas';
import type { BillingInterval, PlanFormState } from './types';
import PlanListTable from './PlanListTable';

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  planModalView: 'list' | 'form';
  setPlanModalView: (view: 'list' | 'form') => void;
  editingPlan: PlanRead | null;
  plans: PlanRead[];
  planFormData: PlanFormState;
  setPlanFormData: (data: PlanFormState) => void;
  planFeaturesList: string[];
  newFeature: string;
  setNewFeature: (value: string) => void;
  isSubmitting: boolean;
  onAddPlanClick: () => void;
  onEditPlanClick: (plan: PlanRead) => void;
  onDeletePlanClick: (id: string) => void;
  onAddFeature: () => void;
  onRemoveFeature: (index: number) => void;
  onSavePlan: (e: React.FormEvent) => void;
}

const PlanFormModal: React.FC<PlanFormModalProps> = ({
  isOpen,
  onClose,
  planModalView,
  setPlanModalView,
  editingPlan,
  plans,
  planFormData,
  setPlanFormData,
  planFeaturesList,
  newFeature,
  setNewFeature,
  isSubmitting,
  onAddPlanClick,
  onEditPlanClick,
  onDeletePlanClick,
  onAddFeature,
  onRemoveFeature,
  onSavePlan,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-xl bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {planModalView === 'list' ? 'Plan Y\u00f6netimi' : (editingPlan ? 'Plan D\u00fczenle' : 'Yeni Plan Ekle')}
          </h3>
          <button
            onClick={() => {
              if (planModalView === 'form') {
                setPlanModalView('list');
              } else {
                onClose();
              }
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {planModalView === 'list' ? (
          <PlanListTable
            plans={plans}
            onAddPlanClick={onAddPlanClick}
            onEditPlanClick={onEditPlanClick}
            onDeletePlanClick={onDeletePlanClick}
          />
        ) : (
          <form onSubmit={onSavePlan} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Plan Ad\u0131</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  value={planFormData.name}
                  onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fiyat</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  value={planFormData.price}
                  onChange={(e) => setPlanFormData({ ...planFormData, price: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Fatura Aral\u0131\u011f\u0131</label>
                <select
                  className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  value={planFormData.billing_interval}
                  onChange={(e) => setPlanFormData({ ...planFormData, billing_interval: e.target.value as BillingInterval })}
                >
                  <option value="MONTHLY">Ayl\u0131k</option>
                  <option value="YEARLY">Y\u0131ll\u0131k</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">A\u00e7\u0131klama</label>
              <textarea
                className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                rows={3}
                value={planFormData.description}
                onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">\u00d6zellikler</label>
              <div className="flex space-x-2 mt-1 mb-2">
                <input
                  type="text"
                  className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  placeholder="\u00d6zellik ekle..."
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAddFeature())}
                />
                <button
                  type="button"
                  onClick={onAddFeature}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-xl text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Ekle
                </button>
              </div>
              <ul className="space-y-2">
                {planFeaturesList.map((feature, index) => (
                  <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-xl">
                    <span className="text-sm text-gray-700">{feature}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveFeature(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center">
              <input
                id="plan-active"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={planFormData.is_active}
                onChange={(e) => setPlanFormData({ ...planFormData, is_active: e.target.checked })}
              />
              <label htmlFor="plan-active" className="ml-2 block text-sm text-gray-900">
                Plan Aktif
              </label>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setPlanModalView('list')}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50"
              >
                \u0130ptal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '\u0130\u015fleniyor...' : (editingPlan ? 'G\u00fcncelle' : 'Olu\u015ftur')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PlanFormModal;
