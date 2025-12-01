import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  CreditCardIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';
import toast from 'react-hot-toast';


import {
  useGetAdminInvoices,
  useGetAdminPlans,
  useGetAdminTenants,
  useGetAdminInvoicesId,
  usePostAdminInvoicesIdPayment,
  usePostAdminInvoices,
  getAdminInvoicesIdPdf,
  Invoice,
  Plan,
  InvoiceInput,
  InvoiceStatus,
  usePostAdminPlans,
  usePutAdminPlansId,
  useDeleteAdminPlansId,
  PlanInput
} from '@/lib/api-client';

// Helper interfaces for component state if not fully covered by generated types
interface CreateInvoiceData extends InvoiceInput { }

const Billing: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [paymentMaxAmount, setPaymentMaxAmount] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'invoices' | 'plans'>('invoices');

  // Plan Management State
  const [planModalView, setPlanModalView] = useState<'list' | 'form'>('list');
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planFormData, setPlanFormData] = useState({
    name: '',
    description: '',
    price: 0,
    currency: 'TRY',
    billing_interval: 'MONTHLY',
    features: {} as Record<string, string>,
    is_active: true
  });
  const [planFeaturesList, setPlanFeaturesList] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');

  const queryClient = useQueryClient();

  // Fetch invoices
  const { data: invoicesData, isLoading, error } = useGetAdminInvoices({
    page,
    limit: 10,
    search: searchTerm || undefined,
    status: statusFilter !== 'all' ? (statusFilter as InvoiceStatus) : undefined
  });

  const invoices = invoicesData?.data?.invoices || [];
  const pagination = invoicesData?.data?.pagination;

  // Fetch plans
  const { data: plansData } = useGetAdminPlans();
  const plans = plansData?.data?.plans || [];

  // Fetch tenants for invoice creation
  const { data: tenantsData } = useGetAdminTenants({ limit: 100 }, { query: { enabled: showCreateModal } });
  const tenants = tenantsData?.data?.tenants || [];

  // Fetch invoice details
  const { data: invoiceDetailsData } = useGetAdminInvoicesId(selectedInvoiceId!, {
    query: { enabled: !!selectedInvoiceId && showInvoiceModal }
  });
  const selectedInvoice = invoiceDetailsData?.data?.invoice;

  // Payment record mutation
  const { mutateAsync: recordPayment } = usePostAdminInvoicesIdPayment();

  // Create invoice mutation
  const { mutateAsync: createInvoice, isPending: isCreatingInvoice } = usePostAdminInvoices();

  // Plan mutations
  const { mutateAsync: createPlan } = usePostAdminPlans();
  const { mutateAsync: updatePlan } = usePutAdminPlansId();
  const { mutateAsync: deletePlan } = useDeleteAdminPlansId();

  const handlePaymentRecordClick = (invoiceId: string, totalAmount: number) => {
    setPaymentInvoiceId(invoiceId);
    setPaymentMaxAmount(totalAmount);
    setPaymentAmount(totalAmount); // Default to full remaining amount
    setShowPaymentModal(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoiceId) return;

    if (paymentAmount > 0 && paymentAmount <= paymentMaxAmount) {
      setIsSubmitting(true);
      try {
        await recordPayment({ id: paymentInvoiceId, data: { amount: paymentAmount } });
        await queryClient.invalidateQueries({ queryKey: ['/admin/invoices'] });
        await queryClient.invalidateQueries({ queryKey: ['getAdminInvoicesId', paymentInvoiceId] });
        toast.success('Ödeme başarıyla kaydedildi');
        setShowPaymentModal(false);
        // Also close invoice detail modal if open and it's the same invoice
        if (showInvoiceModal && selectedInvoiceId === paymentInvoiceId) {
          // Optionally keep it open but it will refresh due to query invalidation
        }
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Ödeme kaydedilirken hata oluştu');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      toast.error('Geçersiz ödeme tutarı');
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setShowInvoiceModal(true);
  };

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      const response = await getAdminInvoicesIdPdf(invoiceId);
      // response is Blob because of the way getAdminInvoicesIdPdf is generated with responseType: 'blob'
      // but we need to check if orval returns the data directly or the axios response.
      // Based on previous experience with Orval and the generated code I saw:
      // return adminApi<Blob>(...)
      // adminApi usually returns AxiosResponse or the data depending on config.
      // Assuming it returns the data (Blob) or we access .data if it returns response.
      // Let's assume it returns the data directly if using a custom instance that unwraps, 
      // but the standard generated one usually returns the promise of the response.
      // However, looking at the generated code: `return adminApi<Blob>(...)`.
      // If adminApi is the custom instance from `@/lib/api`, I should check if it unwraps data.
      // The `api.ts` I viewed earlier showed interceptors but didn't explicitly show unwrapping in the default export.
      // But `useQuery` hooks usage `response.data.data` suggests it returns the full response.
      // So `getAdminInvoicesIdPdf` likely returns the response.

      // Let's try to handle it safely.
      const blob = response as any; // Cast to any to avoid TS issues if type is complex
      // If it's an axios response, it has .data. If it's already blob, it is the blob.
      const pdfBlob = blob.data instanceof Blob ? blob.data : blob;

      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error('PDF indirilemedi');
    }
  };

  const handleCreateInvoice = async (data: CreateInvoiceData) => {
    setIsSubmitting(true);
    try {
      await createInvoice({ data });
      await queryClient.invalidateQueries({ queryKey: ['/admin/invoices'] });
      setShowCreateModal(false);
      toast.success('Fatura başarıyla oluşturuldu');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Fatura oluşturulurken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Plan Management Handlers
  const handleAddPlanClick = () => {
    setEditingPlan(null);
    setPlanFormData({
      name: '',
      description: '',
      price: 0,
      currency: 'TRY',
      billing_interval: 'MONTHLY',
      features: {},
      is_active: true
    });
    setPlanFeaturesList([]);
    setPlanModalView('form');
  };

  const handleEditPlanClick = (plan: Plan) => {
    setEditingPlan(plan);
    // Convert features object to array for UI
    const featuresArray = plan.features ? Object.values(plan.features) : [];
    setPlanFeaturesList(featuresArray as string[]);

    setPlanFormData({
      name: plan.name || '',
      description: plan.description || '',
      price: plan.price || 0,
      currency: plan.currency || 'TRY',
      billing_interval: plan.billing_interval || 'MONTHLY',
      features: (plan.features || {}) as Record<string, string>,
      is_active: plan.is_active ?? true
    });
    setPlanModalView('form');
  };

  const handleDeletePlanClick = async (id: string) => {
    if (window.confirm('Bu planı silmek istediğinize emin misiniz?')) {
      try {
        await deletePlan({ id });
        await queryClient.invalidateQueries({ queryKey: ['/admin/plans'] });
        toast.success('Plan silindi');
      } catch (error: any) {
        toast.error('Plan silinemedi');
      }
    }
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setPlanFeaturesList([...planFeaturesList, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setPlanFeaturesList(planFeaturesList.filter((_, i) => i !== index));
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Convert features array back to object/map for API
    const featuresMap: Record<string, string> = {};
    planFeaturesList.forEach((f, i) => {
      featuresMap[`feature_${i}`] = f;
    });

    const dataToSave: PlanInput = {
      name: planFormData.name,
      description: planFormData.description,
      price: planFormData.price,
      billing_interval: planFormData.billing_interval,
      features: featuresMap as any, // Cast to any or PlanInputFeatures
      is_active: planFormData.is_active
    };

    try {
      if (editingPlan?.id) {
        await updatePlan({ id: editingPlan.id, data: dataToSave });
        toast.success('Plan güncellendi');
      } else {
        await createPlan({ data: dataToSave });
        toast.success('Plan oluşturuldu');
      }
      await queryClient.invalidateQueries({ queryKey: ['/admin/plans'] });
      setPlanModalView('list');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'İşlem başarısız');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    const statusClasses: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      open: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      void: 'bg-red-100 text-red-800',
      overdue: 'bg-orange-100 text-orange-800'
    };

    const statusLabels: Record<string, string> = {
      draft: 'Taslak',
      open: 'Açık',
      paid: 'Ödendi',
      void: 'İptal',
      overdue: 'Gecikmiş'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const formatCurrency = (amount: number, currency: string = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Faturalandırma</h1>
            <p className="mt-1 text-sm text-gray-500">
              Faturaları, ödemeleri ve planları yönetin
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowPlansModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <BuildingOfficeIcon className="-ml-1 mr-2 h-5 w-5" />
              Planları Yönet
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Fatura Oluştur
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'invoices'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <DocumentTextIcon className="h-5 w-5 inline mr-2" />
              Faturalar
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'plans'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <BuildingOfficeIcon className="h-5 w-5 inline mr-2" />
              Planlar
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'invoices' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Toplam Fatura
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {pagination?.total || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Ödenen
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {invoices.filter(inv => inv.status === 'paid').length || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Gecikmiş
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {invoices.filter(inv => inv.status === 'overdue').length || 0}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Toplam Tutar
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {formatCurrency(invoices.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Fatura ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="draft">Taslak</option>
                  <option value="open">Açık</option>
                  <option value="paid">Ödendi</option>
                  <option value="overdue">Gecikmiş</option>
                  <option value="void">İptal</option>
                </select>

                {/* Results count */}
                <div className="flex items-center text-sm text-gray-500">
                  {pagination && (
                    <span>
                      {pagination.total} sonuçtan {((page - 1) * 10) + 1}-{Math.min(page * 10, pagination.total || 0)} arası gösteriliyor
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Faturalar yükleniyor...</p>
                </div>
              ) : error ? (
                <div className="p-6 text-center">
                  <p className="text-red-600">Faturalar yüklenirken hata oluştu</p>
                  <button
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['getAdminInvoices'] })}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-500"
                  >
                    Tekrar dene
                  </button>
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fatura No
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kiracı
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tutar
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vade Tarihi
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {invoice.invoice_number}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {invoice.issue_date ? formatDate(invoice.issue_date) : '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.tenant_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(invoice.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(invoice.total || 0, invoice.currency)}
                            </div>
                            {(invoice.paid_amount || 0) > 0 && (
                              <div className="text-sm text-green-600">
                                Ödenen: {formatCurrency(invoice.paid_amount || 0, invoice.currency)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleViewInvoice(invoice.id!)}
                                className="text-primary-600 hover:text-primary-900"
                                title="Detayları Görüntüle"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadPDF(invoice.id!)}
                                className="text-gray-600 hover:text-gray-900"
                                title="PDF İndir"
                              >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                              </button>
                              {invoice.status === 'open' && (
                                <button
                                  onClick={() => handlePaymentRecordClick(invoice.id!, (invoice.total || 0) - (invoice.paid_amount || 0))}
                                  className="text-green-600 hover:text-green-900 text-xs px-2 py-1 border border-green-300 rounded"
                                >
                                  Ödeme Kaydet
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {pagination && (pagination.totalPages || 0) > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => setPage(page - 1)}
                          disabled={page === 1}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Önceki
                        </button>
                        <button
                          onClick={() => setPage(page + 1)}
                          disabled={page === pagination.totalPages}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Sonraki
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Sayfa <span className="font-medium">{page}</span> / {' '}
                            <span className="font-medium">{pagination.totalPages}</span>
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                            <button
                              onClick={() => setPage(page - 1)}
                              disabled={page === 1}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Önceki
                            </button>
                            <button
                              onClick={() => setPage(page + 1)}
                              disabled={page === pagination.totalPages}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Sonraki
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Abonelik Planları</h3>
              <p className="mt-1 text-sm text-gray-500">
                Mevcut planları görüntüleyin ve yönetin
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {plans.map((plan) => (
                <div key={plan.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                      }`}>
                      {plan.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(plan.price || 0, plan.currency)}
                    </span>
                    <span className="text-gray-500 text-sm">
                      /{plan.billing_interval === 'MONTHLY' ? 'ay' : 'yıl'}
                    </span>
                  </div>
                  {plan.features && plan.features.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Özellikler:</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {plan.features.slice(0, 3).map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-primary-600 rounded-full mr-2"></span>
                            {feature}
                          </li>
                        ))}
                        {plan.features.length > 3 && (
                          <li className="text-gray-400">+{plan.features.length - 3} daha fazla</li>
                        )}
                      </ul>
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    Oluşturulma: {plan.created_at ? formatDate(plan.created_at) : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoice Detail Modal */}
        {showInvoiceModal && selectedInvoice && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Fatura Detayları - {selectedInvoice.invoice_number}
                </h3>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Invoice Header */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Fatura Bilgileri</h4>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Fatura No:</dt>
                        <dd className="text-gray-900">{selectedInvoice.invoice_number}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Durum:</dt>
                        <dd>{getStatusBadge(selectedInvoice.status)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Düzenleme:</dt>
                        <dd className="text-gray-900">{selectedInvoice.issue_date ? formatDate(selectedInvoice.issue_date) : '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Vade:</dt>
                        <dd className="text-gray-900">{selectedInvoice.due_date ? formatDate(selectedInvoice.due_date) : '-'}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Müşteri Bilgileri</h4>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Kiracı:</dt>
                        <dd className="text-gray-900">{selectedInvoice.tenant_name}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Invoice Items */}
                {selectedInvoice.items && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Fatura Kalemleri</h4>
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miktar</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Birim Fiyat</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Toplam</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {selectedInvoice.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">{item.quantity}</td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {formatCurrency(item.unit_price || 0, selectedInvoice.currency)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {formatCurrency(item.total || 0, selectedInvoice.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Invoice Totals */}
                <div className="border-t pt-4">
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Ara Toplam:</dt>
                      <dd className="text-gray-900">{formatCurrency(selectedInvoice.subtotal || 0, selectedInvoice.currency)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Vergi:</dt>
                      <dd className="text-gray-900">{formatCurrency(selectedInvoice.tax_total || 0, selectedInvoice.currency)}</dd>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-medium">
                      <dt className="text-gray-900">Toplam:</dt>
                      <dd className="text-gray-900">{formatCurrency(selectedInvoice.total || 0, selectedInvoice.currency)}</dd>
                    </div>
                    {(selectedInvoice.paid_amount || 0) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <dt>Ödenen:</dt>
                        <dd>{formatCurrency(selectedInvoice.paid_amount || 0, selectedInvoice.currency)}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => handleDownloadPDF(selectedInvoice.id!)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    PDF İndir
                  </button>
                  {selectedInvoice.status === 'open' && (
                    <button
                      onClick={() => {
                        handlePaymentRecordClick(selectedInvoice.id!, (selectedInvoice.total || 0) - (selectedInvoice.paid_amount || 0));
                        // Don't close invoice modal, let them stack or handle appropriately. 
                        // Actually, maybe better to close invoice modal or keep it? 
                        // Let's keep it open, the payment modal will be on top (z-50 vs z-50 might be tricky, let's ensure payment modal has higher z-index or is nested properly)
                        // Radix Dialog Portal handles z-index well usually.
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      <CreditCardIcon className="h-4 w-4 mr-2" />
                      Ödeme Kaydet
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Invoice Modal */}
        {showCreateModal && (
          <CreateInvoiceModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateInvoice}
            tenants={tenants}
            isLoading={isSubmitting}
          />
        )}

        {/* Plans Management Modal */}
        {showPlansModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {planModalView === 'list' ? 'Plan Yönetimi' : (editingPlan ? 'Plan Düzenle' : 'Yeni Plan Ekle')}
                </h3>
                <button
                  onClick={() => {
                    if (planModalView === 'form') {
                      setPlanModalView('list');
                    } else {
                      setShowPlansModal(false);
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {planModalView === 'list' ? (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddPlanClick}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                    >
                      <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                      Yeni Plan Ekle
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Adı</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fiyat</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periyot</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {plans.map((plan) => (
                          <tr key={plan.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{plan.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(plan.price || 0, plan.currency)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{plan.billing_interval === 'MONTHLY' ? 'Aylık' : 'Yıllık'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {plan.is_active ? 'Aktif' : 'Pasif'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button onClick={() => handleEditPlanClick(plan)} className="text-indigo-600 hover:text-indigo-900 mr-4">Düzenle</button>
                              <button onClick={() => handleDeletePlanClick(plan.id!)} className="text-red-600 hover:text-red-900">Sil</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSavePlan} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Plan Adı</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        value={planFormData.price}
                        onChange={(e) => setPlanFormData({ ...planFormData, price: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Para Birimi</label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        value={planFormData.currency}
                        onChange={(e) => setPlanFormData({ ...planFormData, currency: e.target.value })}
                      >
                        <option value="TRY">TRY</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fatura Aralığı</label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        value={planFormData.billing_interval}
                        onChange={(e) => setPlanFormData({ ...planFormData, billing_interval: e.target.value as 'MONTHLY' | 'YEARLY' })}
                      >
                        <option value="MONTHLY">Aylık</option>
                        <option value="YEARLY">Yıllık</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                    <textarea
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      rows={3}
                      value={planFormData.description}
                      onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Özellikler</label>
                    <div className="flex space-x-2 mt-1 mb-2">
                      <input
                        type="text"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        placeholder="Özellik ekle..."
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                      />
                      <button
                        type="button"
                        onClick={handleAddFeature}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        Ekle
                      </button>
                    </div>
                    <ul className="space-y-2">
                      {planFeaturesList.map((feature, index) => (
                        <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                          <span className="text-sm text-gray-700">{feature}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFeature(index)}
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
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'İşleniyor...' : (editingPlan ? 'Güncelle' : 'Oluştur')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Payment Modal */}
        <Dialog.Root open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-[60]" />
            <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-[70]">
              <Dialog.Title className="text-xl font-medium text-gray-900 mb-4">
                Ödeme Kaydet
              </Dialog.Title>
              <form onSubmit={handleConfirmPayment} className="space-y-4">
                <div>
                  <label htmlFor="payment-amount" className="block text-sm font-medium text-gray-700">Tutar (Maks: {formatCurrency(paymentMaxAmount)})</label>
                  <input
                    id="payment-amount"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    max={paymentMaxAmount}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                      İptal
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
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
      </div >
    </>
  );
};

// Create Invoice Modal Component
interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInvoiceData) => void;
  tenants: any[];
  isLoading: boolean;
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  tenants,
  isLoading
}) => {
  const [formData, setFormData] = useState<CreateInvoiceData>({
    tenant_id: '',
    due_date: '',
    currency: 'TRY',
    items: [{ description: '', quantity: 1, unit_price: 0 }]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), { description: '', quantity: 1, unit_price: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Yeni Fatura Oluştur</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Kiracı</label>
              <select
                value={formData.tenant_id}
                onChange={(e) => setFormData(prev => ({ ...prev, tenant_id: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Kiracı seçin</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name || tenant.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Vade Tarihi</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Para Birimi</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Fatura Kalemleri</label>
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                + Kalem Ekle
              </button>
            </div>
            <div className="space-y-3">
              {formData.items?.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Açıklama"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Miktar"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      min="1"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="Birim Fiyat"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    {(formData.items?.length || 0) > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-full px-3 py-2 text-sm text-red-600 hover:text-red-500"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {isLoading ? 'Oluşturuluyor...' : 'Fatura Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Billing;