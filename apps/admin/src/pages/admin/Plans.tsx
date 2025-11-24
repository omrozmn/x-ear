
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  useGetAdminPlans,
  usePostAdminPlans,
  usePutAdminPlansId,
  useDeleteAdminPlansId,
  Plan,
  PlanInput
} from '@/lib/api-client';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const Plans: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: plansData, isLoading, error } = useGetAdminPlans();
  const plans = plansData?.data?.plans || [];

  const { mutateAsync: createPlan } = usePostAdminPlans();
  const { mutateAsync: updatePlan } = usePutAdminPlansId();
  const { mutateAsync: deletePlan } = useDeleteAdminPlansId();

  const handleCreate = async () => {
    const name = prompt('Plan adı:');
    const priceStr = prompt('Fiyat (TRY):');
    if (!name || !priceStr) return;
    const price = Number(priceStr);
    if (isNaN(price)) return toast.error('Geçerli bir fiyat girin');
    try {
      await createPlan({ data: { name, price, is_active: true } as PlanInput });
      queryClient.invalidateQueries({ queryKey: ['getAdminPlans'] });
      toast.success('Plan oluşturuldu');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Plan oluşturulamadı');
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    try {
      await updatePlan({ id: plan.id!, data: { name: plan.name!, price: plan.price!, is_active: !plan.is_active } });
      queryClient.invalidateQueries({ queryKey: ['getAdminPlans'] });
      toast.success('Plan durumu güncellendi');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Güncelleme başarısız');
    }
  };

  const handleEdit = async (plan: Plan) => {
    const name = prompt('Yeni plan adı:', plan.name);
    const priceStr = prompt('Yeni fiyat (TRY):', plan.price?.toString() ?? '');
    if (!name || !priceStr) return;
    const price = Number(priceStr);
    if (isNaN(price)) return toast.error('Geçerli bir fiyat girin');
    try {
      await updatePlan({ id: plan.id!, data: { name, price, is_active: plan.is_active ?? true } });
      queryClient.invalidateQueries({ queryKey: ['getAdminPlans'] });
      toast.success('Plan güncellendi');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Güncelleme başarısız');
    }
  };

  const handleDelete = async (planId: string) => {
    if (!window.confirm('Bu planı silmek istediğinize emin misiniz?')) return;
    try {
      await deletePlan({ id: planId });
      queryClient.invalidateQueries({ queryKey: ['getAdminPlans'] });
      toast.success('Plan silindi');
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'Silme başarısız');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Planlar</h1>
            <p className="mt-1 text-sm text-gray-500">Abonelik planlarını ve fiyatlandırmayı yönetin</p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Plan Ekle
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 text-center">Yükleniyor...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">Planlar yüklenirken hata oluştu</div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İsim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fiyat (TRY)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{plan.price?.toLocaleString('tr-TR') ?? '-'} TL</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {plan.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleToggleActive(plan)}
                          className="text-green-600 hover:text-green-900"
                          title={plan.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                        >
                          {plan.is_active ? <XMarkIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleEdit(plan)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Düzenle"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(plan.id!)}
                          className="text-red-600 hover:text-red-900"
                          title="Sil"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Plans;