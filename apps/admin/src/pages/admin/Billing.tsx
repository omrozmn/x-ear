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
import toast from 'react-hot-toast';

import Layout from '@/components/Layout';
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
  InvoiceStatus
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
  const [activeTab, setActiveTab] = useState<'invoices' | 'plans'>('invoices');
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

  const handlePaymentRecord = async (invoiceId: string, totalAmount: number) => {
    const amountStr = prompt(`Ödeme tutarını girin (Maksimum: ${totalAmount} TL):`);
    if (amountStr && !isNaN(Number(amountStr))) {
      const paymentAmount = Number(amountStr);
      if (paymentAmount > 0 && paymentAmount <= totalAmount) {
        try {
          await recordPayment({ id: invoiceId, data: { amount: paymentAmount } });
          queryClient.invalidateQueries({ queryKey: ['getAdminInvoices'] });
          queryClient.invalidateQueries({ queryKey: ['getAdminInvoicesId', invoiceId] });
          toast.success('Ödeme başarıyla kaydedildi');
        } catch (error: any) {
          toast.error(error.response?.data?.error?.message || 'Ödeme kaydedilirken hata oluştu');
        }
      } else {
        toast.error('Geçersiz ödeme tutarı');
      }
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
    try {
      await createInvoice({ data });
      queryClient.invalidateQueries({ queryKey: ['getAdminInvoices'] });
      setShowCreateModal(false);
      toast.success('Fatura başarıyla oluşturuldu');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Fatura oluşturulurken hata oluştu');
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
    <Layout>
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
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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
                                  onClick={() => handlePaymentRecord(invoice.id!, (invoice.total || 0) - (invoice.paid_amount || 0))}
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
                  {pagination && pagination.totalPages > 1 && (
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
                      /{plan.billing_cycle === 'monthly' ? 'ay' : 'yıl'}
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
                        handlePaymentRecord(selectedInvoice.id!, (selectedInvoice.total || 0) - (selectedInvoice.paid_amount || 0));
                        setShowInvoiceModal(false);
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
            isLoading={isCreatingInvoice}
          />
        )}

        {/* Plans Modal */}
        {showPlansModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Plan Yönetimi</h3>
                <button
                  onClick={() => setShowPlansModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="text-center py-8">
                <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Plan yönetimi</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Plan oluşturma ve düzenleme özellikleri yakında eklenecek.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
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