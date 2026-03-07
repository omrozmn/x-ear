import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';
import { apiClient } from '@/lib/api';
import { useListAdminPlans, useDeleteAdminPlan } from '@/lib/api-client';
import type { DetailedPlanRead as PlanRead } from '@/api/generated/schemas';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Pagination from '@/components/ui/Pagination';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import { ResponsiveTable } from '@/components/responsive/ResponsiveTable';

const PLAN_TYPES = ['BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM'];
const BILLING_INTERVALS = ['MONTHLY', 'YEARLY', 'QUARTERLY'];

const Plans: React.FC = () => {
  const { isMobile } = useAdminResponsive();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Use generated hook for reading data (GET usually works fine with standard params)
  const { data: plansData, isLoading, error } = useListAdminPlans({ page, limit } as any);

  const plans = (plansData as any)?.plans || (plansData as any)?.data?.plans || [];
  const pagination = (plansData as any)?.pagination || (plansData as any)?.data?.pagination;

  // Use generated hook for DELETE (usually simplest payload/param)
  const { mutateAsync: deletePlan } = useDeleteAdminPlan();

  // Local state interface
  interface PlanFormState {
    name: string;
    description: string;
    price: number;
    planType: string;
    billingInterval: string;
    maxUsers: number;
    maxStorageGb: number;
    features: any[];
    isActive: boolean;
  }

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanRead | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);
  const [togglingPlan, setTogglingPlan] = useState<PlanRead | null>(null);

  const [formData, setFormData] = useState<PlanFormState>({
    name: '',
    description: '',
    price: 0,
    planType: 'BASIC',
    billingInterval: 'MONTHLY',
    maxUsers: 1,
    maxStorageGb: 1,
    features: [],
    isActive: true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = (plan?: PlanRead) => {
    if (plan) {
      setEditingPlan(plan);
      // Convert features to array for UI
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
        planType: plan.planType || (plan as any).plan_type || 'BASIC',
        billingInterval: plan.billingInterval || (plan as any).billing_interval || 'MONTHLY',
        maxUsers: plan.maxUsers || (plan as any).max_users || 1,
        maxStorageGb: plan.maxStorageGb || (plan as any).max_storage_gb || 1,
        features: featuresArray,
        isActive: plan.isActive ?? true
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        planType: 'BASIC',
        billingInterval: 'MONTHLY',
        maxUsers: 1,
        maxStorageGb: 1,
        features: [],
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Convert features array back to key-value object
      const featuresObject = formData.features.reduce((acc, feature) => {
        const key = feature.key || feature.name.toLowerCase().replace(/ /g, '_');
        acc[key] = {
          name: feature.name,
          limit: feature.limit,
          is_visible: feature.is_visible
        };
        return acc;
      }, {} as Record<string, any>);

      // Explicit snake_case payload
      const payload = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        plan_type: formData.planType,
        billing_interval: formData.billingInterval,
        max_users: formData.maxUsers,
        max_storage_gb: formData.maxStorageGb,
        features: featuresObject,
        is_active: formData.isActive
      };

      if (editingPlan) {
        await apiClient.put(`/admin/plans/${editingPlan.id}`, payload);
        toast.success('Plan güncellendi');
      } else {
        await apiClient.post(`/admin/plans`, payload);
        toast.success('Plan oluşturuldu');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      await queryClient.invalidateQueries({ queryKey: ['/admin/plans'] }); // Invalidate both possible keys
      setIsModalOpen(false);
    } catch (e: any) {
      console.error('Plan save error:', e);
      toast.error(e.response?.data?.error?.message || 'İşlem başarısız');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!togglingPlan || !togglingPlan.id) return;
    setIsSubmitting(true);

    try {
      // Only send fields that need updating, but typically PUT requires full object or specific PATCH endpoint.
      // Assuming PUT based on previous code. Safest is to send minimal update if supported, or correct full payload.
      // Using direct axios put to /admin/plans/{id} with just is_active if backend supports it, otherwise sending known fields.
      // Here we'll try sending just the status update if backend supports partial updates via PUT or PATCH, 
      // but the generated hook used PUT. Let's send key fields manually.

      const payload = {
        name: togglingPlan.name,
        price: togglingPlan.price,
        plan_type: togglingPlan.planType || (togglingPlan as any).plan_type,
        is_active: !togglingPlan.isActive
      };

      await apiClient.put(`/admin/plans/${togglingPlan.id}`, payload);

      toast.success('Plan durumu güncellendi');
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      setIsToggleModalOpen(false);
    } catch (e: any) {
      console.error('Toggle active error:', e);
      toast.error(e.response?.data?.error?.message || 'Güncelleme başarısız');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingPlanId) return;
    setIsSubmitting(true);
    try {
      await deletePlan({ planId: deletingPlanId });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
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

  const columns = [
    {
      key: 'name',
      header: 'İsim',
      render: (plan: PlanRead) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">{plan.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{plan.description}</div>
        </div>
      )
    },
    {
      key: 'planType',
      header: 'Tip',
      mobileHidden: true,
      render: (plan: PlanRead) => (
        <div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {plan.planType || (plan as any).plan_type}
          </span>
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
            {plan.billingInterval || (plan as any).billing_interval}
          </span>
        </div>
      )
    },
    {
      key: 'price',
      header: 'Fiyat',
      render: (plan: PlanRead) => (
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {plan.price?.toLocaleString('tr-TR')} ₺
        </span>
      )
    },
    {
      key: 'maxUsers',
      header: 'Kullanıcılar',
      mobileHidden: true,
      render: (plan: PlanRead) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {plan.maxUsers || (plan as any).max_users} Kullanıcı
        </span>
      )
    },
    {
      key: 'isActive',
      header: 'Durum',
      render: (plan: PlanRead) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          plan.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }`}>
          {plan.isActive ? 'Aktif' : 'Pasif'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'İşlemler',
      render: (plan: PlanRead) => (
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => { setTogglingPlan(plan); setIsToggleModalOpen(true); }}
            className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded transition-colors touch-feedback ${
              plan.isActive
                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-200'
                : 'text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900 dark:text-green-200'
            }`}
          >
            {plan.isActive ? 'Pasife Al' : 'Aktifleştir'}
          </button>
          <button
            onClick={() => handleOpenModal(plan)}
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors touch-feedback"
            title="Düzenle"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setDeletingPlanId(plan.id!); setIsDeleteModalOpen(true); }}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900 transition-colors touch-feedback"
            title="Sil"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <div className={isMobile ? 'p-4 pb-safe space-y-6' : 'p-6 space-y-6'}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              Planlar
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Abonelik planlarını ve fiyatlandırmayı yönetin
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-feedback"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            {!isMobile && 'Plan Ekle'}
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Planlar yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
            Planlar yüklenirken hata oluştu
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <ResponsiveTable
              data={plans}
              columns={columns}
              keyExtractor={(plan: PlanRead) => plan.id!}
              emptyMessage="Plan bulunamadı"
            />

            <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6">
              <Pagination
                currentPage={page}
                totalPages={pagination?.totalPages || 1}
                totalItems={pagination?.total || 0}
                itemsPerPage={limit}
                onPageChange={setPage}
                onItemsPerPageChange={setLimit}
              />
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
            <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[700px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-xl z-50 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <Dialog.Title className="text-xl font-bold text-gray-900">
                  {editingPlan ? 'Planı Düzenle' : 'Yeni Plan Oluştur'}
                </Dialog.Title>
                <Dialog.Close className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-6 w-6" />
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan Adı</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fiyat (TRY)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                  <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plan Tipi</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      value={formData.planType}
                      onChange={(e) => setFormData({ ...formData, planType: e.target.value })}
                    >
                      {PLAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Faturalama Aralığı</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      value={formData.billingInterval}
                      onChange={(e) => setFormData({ ...formData, billingInterval: e.target.value })}
                    >
                      {BILLING_INTERVALS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Kullanıcı</label>
                    <input
                      type="number"
                      min="1"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      value={formData.maxUsers}
                      onChange={(e) => setFormData({ ...formData, maxUsers: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Depolama (GB)</label>
                    <input
                      type="number"
                      min="1"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      value={formData.maxStorageGb}
                      onChange={(e) => setFormData({ ...formData, maxStorageGb: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Özellikler (Features)</h4>

                  <div className="space-y-3 mb-4 max-h-[200px] overflow-y-auto px-1">
                    {formData.features.map((feature: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                        <div>
                          <div className="font-medium text-sm text-gray-900">{feature.name}</div>
                          <div className="text-xs text-gray-500 flex gap-2">
                            <span className="bg-gray-200 px-1 rounded font-mono">{feature.key || feature.name.toLowerCase().replace(/ /g, '_')}</span>
                            <span>Limit: {feature.limit > 0 ? feature.limit : 'Sınırsız'}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => toggleFeature(index)}
                            className={`p-1.5 rounded-md transition-colors ${feature.is_visible ? 'text-green-600 bg-green-100 hover:bg-green-200' : 'text-gray-400 bg-gray-200 hover:bg-gray-300'}`}
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
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                            title="Sil"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New Feature */}
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                    <h5 className="text-xs font-semibold text-blue-800 uppercase mb-2">Yeni Özellik Ekle</h5>
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-gray-500 mb-1">İsim</label>
                        <input id="new-feat-name" type="text" placeholder="Örn: SMS Hakkı" className="block w-full rounded border-gray-300 text-xs p-1.5 focus:border-blue-500 focus:ring-blue-500" />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Key (Opsiyonel)</label>
                        <input id="new-feat-key" type="text" placeholder="sms_limit" className="block w-full rounded border-gray-300 text-xs p-1.5 focus:border-blue-500 focus:ring-blue-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Limit</label>
                        <input id="new-feat-limit" type="number" placeholder="0" className="block w-full rounded border-gray-300 text-xs p-1.5 focus:border-blue-500 focus:ring-blue-500" />
                      </div>
                      <div className="col-span-2">
                        <button
                          type="button"
                          onClick={() => {
                            const nameInput = document.getElementById('new-feat-name') as HTMLInputElement;
                            const keyInput = document.getElementById('new-feat-key') as HTMLInputElement;
                            const limitInput = document.getElementById('new-feat-limit') as HTMLInputElement;

                            if (nameInput.value) {
                              const newFeature = {
                                name: nameInput.value,
                                key: keyInput.value || nameInput.value.toLowerCase().replace(/ /g, '_'),
                                limit: parseInt(limitInput.value) || 0,
                                is_visible: true
                              };
                              setFormData({ ...formData, features: [...formData.features, newFeature] });
                              nameInput.value = '';
                              keyInput.value = '';
                              limitInput.value = '';
                            } else {
                              toast.error('Özellik ismi gerekli');
                            }
                          }}
                          className="w-full inline-flex justify-center items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <PlusIcon className="h-3 w-3 mr-1" /> Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'İşleniyor...' : (editingPlan ? 'Güncelle' : 'Oluştur')}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Delete Confirmation Modal */}
        <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
            <Dialog.Content className="fixed left-[50%] top-[50%] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-xl z-50">
              <div className="flex items-center mb-4 text-red-600">
                <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
                <Dialog.Title className="text-xl font-bold">Planı Sil</Dialog.Title>
              </div>
              <div className="mb-6 text-gray-600">
                Bu planı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Siliniyor...' : 'Sil'}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Status Toggle Modal */}
        <Dialog.Root open={isToggleModalOpen} onOpenChange={setIsToggleModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
            <Dialog.Content className="fixed left-[50%] top-[50%] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-xl z-50">
              <div className="flex items-center mb-4 text-amber-500">
                <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
                <Dialog.Title className="text-xl font-bold text-gray-900">Durum Değişikliği</Dialog.Title>
              </div>
              <div className="mb-6 text-gray-600">
                Bu planın durumunu <strong>{togglingPlan?.isActive ? 'Pasif' : 'Aktif'}</strong> olarak değiştirmek istediğinize emin misiniz?
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsToggleModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleConfirmToggle}
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-md text-white shadow-sm disabled:opacity-50 ${togglingPlan?.isActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {isSubmitting ? 'İşleniyor...' : 'Onayla'}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

      </div>
    </>
  );
};

export default Plans;