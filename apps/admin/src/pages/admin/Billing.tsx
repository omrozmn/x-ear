import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  useListAdminInvoices,
  useGetAdminInvoice,
  useCreateAdminInvoice,
  useCreateAdminInvoicePayment,
  useListAdminPlans,
  useCreateAdminPlan,
  useUpdateAdminPlan,
  useDeleteAdminPlan,
  useListAdminTenants,
  listAdminInvoicePdf,
} from '@/lib/api-client';
import type {
  DetailedPlanRead as PlanRead,
  InvoiceCreate,
  InvoiceRead,
  PlanCreate,
  PlanUpdate,
} from '@/api/generated/schemas';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';

import type { BillingInterval, CreateInvoiceData, PlanFormState } from './billing/types';
import {
  getApiErrorMessage,
  getInvoices,
  getInvoicePagination,
  getSelectedInvoice,
  getPlans,
  getTenants,
  getPdfUrl,
} from './billing/types';

import InvoiceTable from './billing/InvoiceTable';
import InvoiceDetailModal from './billing/InvoiceDetailModal';
import CreateInvoiceModal from './billing/CreateInvoiceModal';
import PaymentModal from './billing/PaymentModal';
import PlanManager from './billing/PlanManager';
import PlanFormModal from './billing/PlanFormModal';

const Billing: React.FC = () => {
  const { isMobile } = useAdminResponsive();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'plans'>('invoices');

  // Plan Management State
  const [planModalView, setPlanModalView] = useState<'list' | 'form'>('list');
  const [editingPlan, setEditingPlan] = useState<PlanRead | null>(null);
  const [planFormData, setPlanFormData] = useState<PlanFormState>({
    name: '',
    description: '',
    price: 0,
    billing_interval: 'MONTHLY',
    features: {},
    is_active: true
  });
  const [planFeaturesList, setPlanFeaturesList] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');

  const queryClient = useQueryClient();

  // Fetch invoices
  const { data: invoicesData, isLoading, error } = useListAdminInvoices({
    page,
    limit,
    search: searchTerm || undefined,
    status: statusFilter !== 'all' ? (statusFilter as InvoiceRead['status']) : undefined
  });

  const invoices = getInvoices(invoicesData);
  const pagination = getInvoicePagination(invoicesData);

  // Fetch plans
  const { data: plansData } = useListAdminPlans();
  const plans = getPlans(plansData);

  // Fetch tenants for invoice creation
  const { data: tenantsData } = useListAdminTenants({ limit: 100 }, { query: { enabled: showCreateModal } });
  const tenants = getTenants(tenantsData);

  // Fetch invoice details
  const { data: invoiceDetailsData } = useGetAdminInvoice(selectedInvoiceId ?? '', {
    query: { enabled: Boolean(selectedInvoiceId) && showInvoiceModal }
  });
  const selectedInvoice = getSelectedInvoice(invoiceDetailsData);

  // Create invoice mutation
  const { mutateAsync: createInvoice } = useCreateAdminInvoice();
  const { mutateAsync: recordInvoicePayment } = useCreateAdminInvoicePayment();

  // Plan mutations
  const { mutateAsync: createPlan } = useCreateAdminPlan();
  const { mutateAsync: updatePlan } = useUpdateAdminPlan();
  const { mutateAsync: deletePlan } = useDeleteAdminPlan();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePaymentRecordClick = (invoiceId: string) => {
    setPaymentInvoiceId(invoiceId);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoiceId) return;
    setIsSubmitting(true);
    try {
      await recordInvoicePayment({ invoiceId: paymentInvoiceId });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/invoices'] });
      await queryClient.invalidateQueries({ queryKey: [`/api/admin/invoices/${paymentInvoiceId}`] });
      toast.success('Fatura ödendi olarak işaretlendi');
      setShowPaymentModal(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Ödeme kaydedilirken hata oluştu'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setShowInvoiceModal(true);
  };

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      const response = await listAdminInvoicePdf(invoiceId);
      const pdfUrl = getPdfUrl(response);
      if (!pdfUrl) {
        throw new Error('PDF link not available');
      }
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error(error);
      toast.error('PDF indirilemedi');
    }
  };

  const handleCreateInvoice = async (data: CreateInvoiceData) => {
    setIsSubmitting(true);
    try {
      const payload: InvoiceCreate = {
        tenantId: data.tenant_id,
        subtotal: data.amount,
        vatAmount: 0,
        discountAmount: 0,
        totalAmount: data.amount,
      };
      await createInvoice({ data: payload });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/invoices'] });
      setShowCreateModal(false);
      toast.success('Fatura başarıyla oluşturuldu');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Fatura oluşturulurken hata oluştu'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Plan Management Handlers
  const handleAddPlanClick = () => {
    setEditingPlan(null);
    setPlanFormData({ name: '', description: '', price: 0, billing_interval: 'MONTHLY', features: {}, is_active: true });
    setPlanFeaturesList([]);
    setPlanModalView('form');
  };

  const handleEditPlanClick = (plan: PlanRead) => {
    setEditingPlan(plan);
    const featuresArray = plan.features ? Object.values(plan.features) : [];
    setPlanFeaturesList(featuresArray as unknown as string[]);
    setPlanFormData({
      name: plan.name || '',
      description: plan.description || '',
      price: plan.price || 0,
      billing_interval: (plan.billingInterval as BillingInterval | undefined) || 'MONTHLY',
      features: (plan.features || {}) as Record<string, string>,
      is_active: plan.isActive ?? true
    });
    setPlanModalView('form');
  };

  const handleDeletePlanClick = async (id: string) => {
    if (!window.confirm('Bu planı silmek istediğinize emin misiniz?')) return;
    try {
      await deletePlan({ planId: id });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      toast.success('Plan silindi');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Plan silinemedi'));
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
    const featuresMap: Record<string, string> = {};
    planFeaturesList.forEach((f, i) => { featuresMap[`feature_${i}`] = f; });
    const dataToSave: PlanCreate | PlanUpdate = {
      name: planFormData.name,
      description: planFormData.description,
      price: planFormData.price,
      billingInterval: planFormData.billing_interval,
      features: featuresMap,
      isActive: planFormData.is_active
    };
    try {
      if (editingPlan?.id) {
        await updatePlan({ planId: editingPlan.id, data: dataToSave as PlanUpdate });
        toast.success('Plan güncellendi');
      } else {
        await createPlan({ data: dataToSave as PlanCreate });
        toast.success('Plan oluşturuldu');
      }
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      setPlanModalView('list');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'İşlem başarısız'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className={isMobile ? 'p-4 pb-safe space-y-6' : 'space-y-6'}>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              Faturalandırma
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Faturaları, ödemeleri ve planları yönetin
            </p>
          </div>
          <div className="flex space-x-3">
            {!isMobile && (
              <button
                onClick={() => setShowPlansModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 touch-feedback"
              >
                <BuildingOfficeIcon className="-ml-1 mr-2 h-5 w-5" />
                Planları Yönet
              </button>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white premium-gradient tactile-press dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-feedback"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              {!isMobile && 'Fatura Oluştur'}
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
          <InvoiceTable
            isMobile={isMobile}
            invoices={invoices}
            pagination={pagination}
            isLoading={isLoading}
            error={error}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            page={page}
            limit={limit}
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onPageChange={(p, ps) => { setPage(p); setLimit(ps); }}
            onViewInvoice={handleViewInvoice}
            onDownloadPDF={handleDownloadPDF}
            onPaymentRecordClick={handlePaymentRecordClick}
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['getAdminInvoices'] })}
          />
        )}

        {/* Plans Tab */}
        {activeTab === 'plans' && <PlanManager plans={plans} />}

        {/* Invoice Detail Modal */}
        {showInvoiceModal && selectedInvoice && (
          <InvoiceDetailModal
            invoice={selectedInvoice}
            onClose={() => setShowInvoiceModal(false)}
            onDownloadPDF={handleDownloadPDF}
            onPaymentRecordClick={handlePaymentRecordClick}
          />
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
        <PlanFormModal
          isOpen={showPlansModal}
          onClose={() => setShowPlansModal(false)}
          planModalView={planModalView}
          setPlanModalView={setPlanModalView}
          editingPlan={editingPlan}
          plans={plans}
          planFormData={planFormData}
          setPlanFormData={setPlanFormData}
          planFeaturesList={planFeaturesList}
          newFeature={newFeature}
          setNewFeature={setNewFeature}
          isSubmitting={isSubmitting}
          onAddPlanClick={handleAddPlanClick}
          onEditPlanClick={handleEditPlanClick}
          onDeletePlanClick={handleDeletePlanClick}
          onAddFeature={handleAddFeature}
          onRemoveFeature={handleRemoveFeature}
          onSavePlan={handleSavePlan}
        />

        {/* Payment Modal */}
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          onConfirmPayment={handleConfirmPayment}
          isSubmitting={isSubmitting}
        />
      </div >
    </>
  );
};

export default Billing;
