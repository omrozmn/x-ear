import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';
import { useListAdminPlans, useDeleteAdminPlan, useCreateAdminPlan, useUpdateAdminPlan } from '@/lib/api-client';
import type { DetailedPlanRead as PlanRead, ListAdminPlansParams, PlanCreate, PlanListResponse, PlanUpdate } from '@/api/generated/schemas';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, ExclamationTriangleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Pagination from '@/components/ui/Pagination';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import { ResponsiveTable } from '@/components/responsive/ResponsiveTable';
import { extractPagination, isRecord, unwrapData } from '@/lib/orval-response';

const PLAN_TYPES = ['BASIC', 'PRO', 'ENTERPRISE', 'CUSTOM'] as const;
const BILLING_INTERVALS = ['MONTHLY', 'YEARLY', 'QUARTERLY'] as const;

type PlanType = (typeof PLAN_TYPES)[number];
type BillingInterval = (typeof BILLING_INTERVALS)[number];

interface ApiErrorLike {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

interface FeatureFormItem {
  key: string;
  name: string;
  limit: number;
  is_visible: boolean;
}

interface PaginationInfo {
  totalPages?: number;
  total?: number;
}

interface PlanFormState {
  name: string;
  description: string;
  price: number;
  planType: PlanType;
  billingInterval: BillingInterval;
  maxUsers: number;
  maxStorageGb: number;
  features: FeatureFormItem[];
  isActive: boolean;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorLike;
  return apiError.response?.data?.error?.message || fallback;
}

function getPlans(data: PlanListResponse | undefined): PlanRead[] {
  const responseData = unwrapData<unknown>(data);
  const candidate = Array.isArray(responseData)
    ? responseData
    : isRecord(responseData) && Array.isArray(responseData.plans)
      ? responseData.plans
      : isRecord(responseData) && Array.isArray(responseData.items)
        ? responseData.items
        : [];

  return candidate.filter((plan): plan is PlanRead => isRecord(plan) && typeof plan.id === 'string' && typeof plan.name === 'string');
}

function getPagination(data: PlanListResponse | undefined): PaginationInfo {
  const pagination = extractPagination(data);
  if (!pagination) {
    return {};
  }

  return {
    totalPages: pagination.totalPages,
    total: pagination.total,
  };
}

function normalizeFeatures(features: PlanRead['features']): FeatureFormItem[] {
  if (Array.isArray(features)) {
    return features
      .filter(isRecord)
      .map((feature, index) => ({
        key: typeof feature.key === 'string' ? feature.key : `feature_${index}`,
        name: typeof feature.name === 'string' ? feature.name : `Feature ${index + 1}`,
        limit: typeof feature.limit === 'number' ? feature.limit : 0,
        is_visible: typeof feature.is_visible === 'boolean' ? feature.is_visible : true,
      }));
  }

  if (!features || typeof features !== 'object') {
    return [];
  }

  return Object.entries(features)
    .filter(([, value]) => isRecord(value))
    .map(([key, value]) => {
      const feature = value as Record<string, unknown>;
      return {
        key,
        name: typeof feature.name === 'string' ? feature.name : key,
        limit: typeof feature.limit === 'number' ? feature.limit : 0,
        is_visible: typeof feature.is_visible === 'boolean' ? feature.is_visible : true,
      };
    });
}

const Plans: React.FC = () => {
  const { isMobile } = useAdminResponsive();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const params: ListAdminPlansParams = { page, limit };
  const { data: plansData, isLoading, error } = useListAdminPlans(params);

  const plans = getPlans(plansData).filter((plan) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [
      plan.name,
      plan.description || '',
      plan.planType || '',
      plan.billingInterval || '',
    ].some((value) => value.toLowerCase().includes(query));
  });
  const pagination = getPagination(plansData);

  const { mutateAsync: createPlan } = useCreateAdminPlan();
  const { mutateAsync: updatePlan } = useUpdateAdminPlan();
  const { mutateAsync: deletePlan } = useDeleteAdminPlan();

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

      setFormData({
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        planType: (plan.planType as PlanType | undefined) || 'BASIC',
        billingInterval: (plan.billingInterval as BillingInterval | undefined) || 'MONTHLY',
        maxUsers: plan.maxUsers || 1,
        maxStorageGb: plan.maxStorageGb || 1,
        features: normalizeFeatures(plan.features),
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
      const featuresObject = formData.features.reduce((acc, feature) => {
        const key = feature.key || feature.name.toLowerCase().replace(/ /g, '_');
        acc[key] = {
          name: feature.name,
          limit: feature.limit,
          is_visible: feature.is_visible
        };
        return acc;
      }, {} as Record<string, { name: string; limit: number; is_visible: boolean }>);

      const payload: PlanCreate | PlanUpdate = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        planType: formData.planType,
        billingInterval: formData.billingInterval,
        maxUsers: formData.maxUsers,
        maxStorageGb: formData.maxStorageGb,
        features: featuresObject,
        isActive: formData.isActive
      };

      if (editingPlan) {
        await updatePlan({ planId: editingPlan.id, data: payload as PlanUpdate });
        toast.success('Plan güncellendi');
      } else {
        await createPlan({ data: payload as PlanCreate });
        toast.success('Plan oluşturuldu');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      await queryClient.invalidateQueries({ queryKey: ['/admin/plans'] }); // Invalidate both possible keys
      setIsModalOpen(false);
    } catch (error: unknown) {
      console.error('Plan save error:', error);
      toast.error(getApiErrorMessage(error, 'İşlem başarısız'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!togglingPlan || !togglingPlan.id) return;
    setIsSubmitting(true);

    try {
      const payload: PlanUpdate = {
        name: togglingPlan.name,
        price: togglingPlan.price,
        isActive: !togglingPlan.isActive
      };

      await updatePlan({ planId: togglingPlan.id, data: payload });

      toast.success('Plan durumu güncellendi');
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      setIsToggleModalOpen(false);
    } catch (error: unknown) {
      console.error('Toggle active error:', error);
      toast.error(getApiErrorMessage(error, 'Güncelleme başarısız'));
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
    } catch (error: unknown) {
      console.error('Delete plan error:', error);
      toast.error(getApiErrorMessage(error, 'Silme başarısız'));
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
      sortable: true,
      sortKey: 'name',
      sortValue: (plan: PlanRead) => plan.name,
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
      sortable: true,
      sortKey: 'planType',
      sortValue: (plan: PlanRead) => `${plan.planType || ''} ${plan.billingInterval || ''}`,
      render: (plan: PlanRead) => (
        <div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {plan.planType}
          </span>
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
            {plan.billingInterval}
          </span>
        </div>
      )
    },
    {
      key: 'price',
      header: 'Fiyat',
      sortable: true,
      sortKey: 'price',
      sortValue: (plan: PlanRead) => plan.price || 0,
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
      sortable: true,
      sortKey: 'maxUsers',
      sortValue: (plan: PlanRead) => plan.maxUsers || 0,
      render: (plan: PlanRead) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {plan.maxUsers || 0} Kullanıcı
        </span>
      )
    },
    {
      key: 'isActive',
      header: 'Durum',
      sortable: true,
      sortKey: 'isActive',
      sortValue: (plan: PlanRead) => plan.isActive ? 1 : 0,
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
        <div className="max-w-md">
          <div className="relative rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Plan adı, açıklama veya tip ara..."
              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white pl-10 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
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
                      onChange={(e) => setFormData({ ...formData, planType: e.target.value as PlanType })}
                    >
                      {PLAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Faturalama Aralığı</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      value={formData.billingInterval}
                      onChange={(e) => setFormData({ ...formData, billingInterval: e.target.value as BillingInterval })}
                    >
                      {BILLING_INTERVALS.map((t) => <option key={t} value={t}>{t}</option>)}
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
                    {formData.features.map((feature, index) => (
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
