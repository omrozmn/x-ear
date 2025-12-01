
import React, { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';

import {
  useGetAdminPlans,
  usePostAdminPlans,
  usePutAdminPlansId,
  useDeleteAdminPlansId,
  useAdminGetFeatures,
  Plan,
  PlanInput
} from '@/lib/api-client';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const PLAN_TYPES = ['BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM'];
const BILLING_INTERVALS = ['MONTHLY', 'YEARLY', 'QUARTERLY'];

const Plans: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: plansData, isLoading, error } = useGetAdminPlans();
  const { data: featuresData } = useAdminGetFeatures();

  const plans = plansData?.data?.plans || [];
  const features = featuresData?.features || {};

  const { mutateAsync: createPlan } = usePostAdminPlans();
  const { mutateAsync: updatePlan } = usePutAdminPlansId();
  const { mutateAsync: deletePlan } = useDeleteAdminPlansId();

  // Local state interface for the form, where features is an array for easier UI handling
  interface PlanFormState extends Omit<PlanInput, 'features'> {
    features: any[];
  }

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);
  const [togglingPlan, setTogglingPlan] = useState<Plan | null>(null);

  const [formData, setFormData] = useState<PlanFormState>({
    name: '',
    description: '',
    price: 0,
    plan_type: 'BASIC',
    billing_interval: 'MONTHLY',
    max_users: 1,
    max_storage_gb: 1,
    features: [],
    is_active: true
  });

  const handleOpenModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      // Convert features object/array to array for UI
      let featuresArray: any[] = [];
      if (Array.isArray(plan.features)) {
        featuresArray = plan.features;
      } else if (plan.features && typeof plan.features === 'object') {
        featuresArray = Object.entries(plan.features).map(([key, value]: [string, any]) => ({
          key,
          ...value
        }));
      }

      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        price: plan.price || 0,
        plan_type: plan.plan_type || 'BASIC',
        billing_interval: plan.billing_interval || 'MONTHLY',
        max_users: plan.max_users || 1,
        max_storage_gb: plan.max_storage_gb || 1,
        features: featuresArray,
        is_active: plan.is_active ?? true
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        plan_type: 'BASIC',
        billing_interval: 'MONTHLY',
        max_users: 1,
        max_storage_gb: 1,
        features: [],
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Convert features array back to object for API
      const featuresObject = formData.features.reduce((acc, feature) => {
        if (feature.key) {
          acc[feature.key] = {
            name: feature.name,
            limit: feature.limit,
            is_visible: feature.is_visible
          };
        }
        return acc;
      }, {} as Record<string, any>);

      const apiData: PlanInput = {
        ...formData,
        features: featuresObject
      };

      if (editingPlan) {
        await updatePlan({ id: editingPlan.id!, data: apiData });
        toast.success('Plan güncellendi');
      } else {
        await createPlan({ data: apiData });
        toast.success('Plan oluşturuldu');
      }
      await queryClient.invalidateQueries({ queryKey: ['/admin/plans'] });
      setIsModalOpen(false);
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || 'İşlem başarısız');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActiveClick = (plan: Plan) => {
    setTogglingPlan(plan);
    setIsToggleModalOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!togglingPlan || !togglingPlan.id) return;
    setIsSubmitting(true);

    try {
      await updatePlan({
        id: togglingPlan.id,
        data: {
          name: togglingPlan.name!,
          price: togglingPlan.price!,
          is_active: !togglingPlan.is_active
        }
      });
      // Invalidate to ensure consistency
      await queryClient.invalidateQueries({ queryKey: ['/admin/plans'] });
      toast.success('Plan durumu güncellendi');
      setIsToggleModalOpen(false);
    } catch (e: any) {
      console.error('Toggle active error:', e);
      toast.error(e.response?.data?.error?.message || 'Güncelleme başarısız');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (planId: string) => {
    setDeletingPlanId(planId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPlanId) return;
    setIsSubmitting(true);
    try {
      await deletePlan({ id: deletingPlanId });
      await queryClient.invalidateQueries({ queryKey: ['/admin/plans'] });
      toast.success('Plan silindi');
      setIsDeleteModalOpen(false);
    } catch (e: any) {
      console.error('Delete plan error:', e);
      toast.error(e.response?.data?.error?.message || 'Silme başarısız');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFeature = (index: number) => {
    const newFeatures = [...formData.features];
    newFeatures[index].is_visible = !newFeatures[index].is_visible;
    setFormData({ ...formData, features: newFeatures });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Planlar</h1>
            <p className="mt-1 text-sm text-gray-500">Abonelik planlarını ve fiyatlandırmayı yönetin</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fiyat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcılar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                      <div className="text-xs text-gray-500">{plan.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {plan.plan_type} / {plan.billing_interval}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {plan.price?.toLocaleString('tr-TR')} {plan.currency || 'TRY'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {plan.max_users} Kullanıcı
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {plan.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleToggleActiveClick(plan)}
                          className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${plan.is_active
                            ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-500'
                            : 'text-green-700 bg-green-100 hover:bg-green-200 focus:ring-green-500'
                            }`}
                          title={plan.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                        >
                          {plan.is_active ? 'Pasife Al' : 'Aktifleştir'}
                        </button>
                        <button
                          onClick={() => handleOpenModal(plan)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Düzenle"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(plan.id!)}
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

        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow" />
            <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow overflow-y-auto">
              <Dialog.Title className="text-xl font-medium text-gray-900 mb-4">
                {editingPlan ? 'Planı Düzenle' : 'Yeni Plan Oluştur'}
              </Dialog.Title>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="plan-name" className="block text-sm font-medium text-gray-700">Plan Adı</label>
                    <input
                      id="plan-name"
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="plan-price" className="block text-sm font-medium text-gray-700">Fiyat (TRY)</label>
                    <input
                      id="plan-price"
                      type="number"
                      required
                      min="0"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="plan-description" className="block text-sm font-medium text-gray-700">Açıklama</label>
                  <textarea
                    id="plan-description"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="plan-type" className="block text-sm font-medium text-gray-700">Plan Tipi</label>
                    <select
                      id="plan-type"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      value={formData.plan_type}
                      onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
                    >
                      {PLAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="billing-interval" className="block text-sm font-medium text-gray-700">Faturalama Aralığı</label>
                    <select
                      id="billing-interval"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      value={formData.billing_interval}
                      onChange={(e) => setFormData({ ...formData, billing_interval: e.target.value })}
                    >
                      {BILLING_INTERVALS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="max-users" className="block text-sm font-medium text-gray-700">Max Kullanıcı</label>
                    <input
                      id="max-users"
                      type="number"
                      min="1"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      value={formData.max_users}
                      onChange={(e) => setFormData({ ...formData, max_users: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label htmlFor="max-storage" className="block text-sm font-medium text-gray-700">Max Depolama (GB)</label>
                    <input
                      id="max-storage"
                      type="number"
                      min="1"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                      value={formData.max_storage_gb}
                      onChange={(e) => setFormData({ ...formData, max_storage_gb: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Özellikler (Features)</label>

                  {/* Feature List */}
                  <div className="space-y-2 mb-4">
                    {formData.features.map((feature: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                        <div>
                          <div className="font-medium text-sm text-gray-900">{feature.name}</div>
                          <div className="text-xs text-gray-500">Key: {feature.key} | Limit: {feature.limit > 0 ? feature.limit : 'Sınırsız'}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => toggleFeature(index)}
                            className={`p-1 rounded-md ${feature.is_visible ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                            title={feature.is_visible ? 'Görünür' : 'Gizli'}
                          >
                            {feature.is_visible ? <CheckIcon className="h-4 w-4" /> : <XMarkIcon className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newFeatures = [...formData.features];
                              newFeatures.splice(index, 1);
                              setFormData({ ...formData, features: newFeatures });
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-md"
                            title="Sil"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New Feature */}
                  <div className="grid grid-cols-12 gap-2 items-end bg-gray-50 p-3 rounded-md border border-gray-200">
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Key</label>
                      <input
                        type="text"
                        placeholder="sms_limit"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs border p-1.5"
                        id="new-feature-key"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">İsim</label>
                      <input
                        type="text"
                        placeholder="SMS Hakkı"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs border p-1.5"
                        id="new-feature-name"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Limit (0=Sınırsız)</label>
                      <input
                        type="number"
                        placeholder="0"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs border p-1.5"
                        id="new-feature-limit"
                      />
                    </div>
                    <div className="col-span-2">
                      <button
                        type="button"
                        onClick={() => {
                          const keyInput = document.getElementById('new-feature-key') as HTMLInputElement;
                          const nameInput = document.getElementById('new-feature-name') as HTMLInputElement;
                          const limitInput = document.getElementById('new-feature-limit') as HTMLInputElement;

                          if (keyInput.value && nameInput.value) {
                            const newFeature = {
                              key: keyInput.value,
                              name: nameInput.value,
                              limit: parseInt(limitInput.value) || 0,
                              is_visible: true
                            };

                            setFormData({
                              ...formData,
                              features: [...formData.features, newFeature]
                            });

                            keyInput.value = '';
                            nameInput.value = '';
                            limitInput.value = '';
                          }
                        }}
                        className="w-full inline-flex justify-center items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" /> Ekle
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      İptal
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'İşleniyor...' : (editingPlan ? 'Güncelle' : 'Oluştur')}
                  </button>
                </div>
              </form>
              <Dialog.Close asChild>
                <button
                  className="absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Delete Confirmation Modal */}
        <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
            <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50">
              <div className="flex items-center mb-4 text-red-600">
                <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
                <Dialog.Title className="text-xl font-medium text-gray-900">
                  Planı Sil
                </Dialog.Title>
              </div>
              <div className="mb-6 text-sm text-gray-500">
                Bu planı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </div>
              <div className="flex justify-end space-x-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    İptal
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Siliniyor...' : 'Sil'}
                </button>
              </div>
              <Dialog.Close asChild>
                <button
                  className="absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Toggle Status Confirmation Modal */}
        <Dialog.Root open={isToggleModalOpen} onOpenChange={setIsToggleModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
            <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50">
              <div className="flex items-center mb-4 text-amber-500">
                <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
                <Dialog.Title className="text-xl font-medium text-gray-900">
                  Durum Değişikliği
                </Dialog.Title>
              </div>
              <div className="mb-6 text-sm text-gray-500">
                Bu planın durumunu <strong>{togglingPlan?.is_active ? 'Pasif' : 'Aktif'}</strong> olarak değiştirmek istediğinize emin misiniz?
              </div>
              <div className="flex justify-end space-x-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    İptal
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleConfirmToggle}
                  disabled={isSubmitting}
                  className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${togglingPlan?.is_active ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'}`}
                >
                  {isSubmitting ? 'Güncelleniyor...' : (togglingPlan?.is_active ? 'Pasifleştir' : 'Aktifleştir')}
                </button>
              </div>
              <Dialog.Close asChild>
                <button
                  className="absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </>
  );
};

export default Plans;