import { Button, Card, Input, Select, DatePicker, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { FileText, Download, Filter, Search, CheckCircle, AlertCircle, Send, Eye, X, Plus, MoreVertical, Copy, XCircle, Clock, Ban, CreditCard, CheckSquare, Square, RefreshCw, Receipt } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import { useListOutgoingInvoices } from '@/api/client/invoices.client';
import type { OutgoingInvoiceResponse, SchemasInvoicesNewInvoiceStatus } from '@/api/client/invoices.client';
import { ONBOARDING_OUTGOING_INVOICES_DISMISSED } from '@/constants/storage-keys';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient } from '@/api/orval-mutator';
import toast from 'react-hot-toast';
import { useNavigate } from '@tanstack/react-router';
import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';
import { ExportDropdown } from '@/components/common/ExportDropdown';
import { PermissionGate } from '@/components/PermissionGate';
import { useTranslation } from 'react-i18next';
interface InvoiceLog {
  id?: string;
  status?: string;
  description?: string;
  createDate?: string;
  createTime?: string;
}

interface ProviderStatusData {
  invoiceId: number;
  birfaturaUuid: string;
  envelopeId: string;
  inOutCode: string;
  currentStatus: string;
  providerStatusCode?: string;
  providerMessage?: string;
  retryable?: boolean;
  rawResult?: Record<string, unknown> | null;
}

type InvoiceDocumentInfo = OutgoingInvoiceResponse & {
  documentKind?: string;
  documentKindLabel?: string;
  profileId?: string;
  invoiceTypeCode?: string;
};

interface InvoiceManagementPageProps {
  className?: string;
}

async function fetchInvoiceDocument(invoiceId: string | number, format: 'pdf' | 'html' | 'xml', renderMode: 'auto' | 'local' | 'remote' = 'auto'): Promise<{ data: ArrayBuffer; contentType: string }> {
  const resp = await apiClient.get<ArrayBuffer>(`/api/invoices/${invoiceId}/document?format=${format}&render_mode=${renderMode}`, {
    responseType: 'arraybuffer',
  });
  const contentType = (resp.headers?.['content-type'] as string) || (format === 'pdf' ? 'application/pdf' : 'text/html');
  return { data: resp.data, contentType };
}

async function postInvoiceAction(invoiceId: string | number, action: 'accept' | 'reject' | 'cancel', body?: object): Promise<void> {
  await apiClient.post(`/api/invoices/${invoiceId}/${action}`, body ?? {});
}

export const DesktopInvoicesPage: React.FC<InvoiceManagementPageProps> = ({
  className = ''
}) => {
  const { t } = useTranslation('invoices');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [showBanner, setShowBanner] = useState(() => {
    try { return !localStorage.getItem(ONBOARDING_OUTGOING_INVOICES_DISMISSED ?? 'outgoing_invoices_dismissed'); } catch { return true; }
  });
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('invoiceDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pdfModal, setPdfModal] = useState<{ open: boolean; blobUrl: string; title: string; fileName: string } | null>(null);
  const [statusModal, setStatusModal] = useState<OutgoingInvoiceResponse | null>(null);
  const [statusLogs, setStatusLogs] = useState<InvoiceLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatusData | null>(null);
  const [providerStatusLoading, setProviderStatusLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMobileSelectionMode, setIsMobileSelectionMode] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Clear selection on page/filter change
  useEffect(() => { setSelectedIds(new Set()); }, [currentPage, statusFilter]);

  // Fetch GİB document logs and live provider status when status modal opens
  useEffect(() => {
    if (!statusModal) {
      setStatusLogs([]);
      setProviderStatus(null);
      return;
    }
    setLogsLoading(true);
    setProviderStatusLoading(true);
    apiClient.get(`/api/invoices/${statusModal.invoiceId}/logs`)
      .then((res) => {
        const data = res.data?.data ?? [];
        setStatusLogs(Array.isArray(data) ? data : []);
      })
      .catch(() => setStatusLogs([]))
      .finally(() => setLogsLoading(false));
    apiClient.get(`/api/invoices/${statusModal.invoiceId}/status`)
      .then((res) => {
        setProviderStatus((res.data?.data ?? null) as ProviderStatusData | null);
      })
      .catch(() => setProviderStatus(null))
      .finally(() => setProviderStatusLoading(false));
  }, [statusModal]);

  const { data, isLoading, refetch } = useListOutgoingInvoices({
    page: currentPage,
    per_page: perPage,
    status: statusFilter !== 'all' ? statusFilter as SchemasInvoicesNewInvoiceStatus : undefined,
    party_name: debouncedSearch || undefined,
    date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : undefined,
    date_to: dateTo ? dateTo.toISOString().split('T')[0] : undefined,
    sort_field: sortField || undefined,
    sort_dir: sortField ? sortDir : undefined,
  });

  const invoiceList = useMemo(() => data?.data?.invoices ?? [], [data?.data?.invoices]);
  const totalAmount = Number(data?.data?.totalAmount ?? 0);
  const paidAmount = Number(data?.data?.paidAmount ?? 0);
  const pagination = data?.data?.pagination;
  const totalCount = pagination?.total ?? invoiceList.length;
  const filteredInvoices = invoiceList;

  const renderDocumentBadges = (inv: OutgoingInvoiceResponse) => {
    const invoice = inv as InvoiceDocumentInfo;
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${invoice.documentKind === 'despatch' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' : 'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-300'}`}>
          {invoice.documentKindLabel || (invoice.documentKind === 'despatch' ? 'E-İrsaliye' : 'E-Fatura')}
        </span>
        {invoice.profileId && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-foreground">
            {invoice.profileId}
          </span>
        )}
        {invoice.invoiceTypeCode && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            {invoice.invoiceTypeCode}
          </span>
        )}
      </div>
    );
  };

  const getStatusBadge = (status: string, invoice?: OutgoingInvoiceResponse) => {
    const s = (status || '').toUpperCase();
    const edoc = invoice?.edocumentStatus;
    let style = '';
    let label = '';
    let icon = <AlertCircle className="w-3 h-3 mr-1" />;

    // Use edocumentStatus (GİB real status) when available
    if (edoc) {
      if (edoc === 'approved') {
        style = 'bg-success/10 text-success';
        label = t('status.approved');
        icon = <CheckCircle className="w-3 h-3 mr-1" />;
      } else if (edoc === 'delivered') {
        style = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
        label = t('status.delivered_to_gib');
        icon = <Send className="w-3 h-3 mr-1" />;
      } else if (edoc === 'waiting') {
        style = 'bg-primary/10 text-blue-800 dark:text-blue-400';
        label = t('status.waiting_approval');
        icon = <Clock className="w-3 h-3 mr-1" />;
      } else if (edoc === 'queued' || edoc === 'processing' || edoc === 'packaging') {
        style = 'bg-warning/10 text-yellow-800 dark:text-yellow-400';
        label = edoc === 'queued' ? t('status.queued') : edoc === 'packaging' ? t('status.packaging') : t('status.processing');
        icon = <Clock className="w-3 h-3 mr-1" />;
      } else if (edoc === 'rejected') {
        style = 'bg-destructive/10 text-red-800 dark:text-red-400';
        label = t('status.rejected');
        icon = <XCircle className="w-3 h-3 mr-1" />;
      } else if (edoc === 'returned') {
        style = 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
        label = t('status.returned');
        icon = <AlertCircle className="w-3 h-3 mr-1" />;
      } else if (edoc === 'draft') {
        style = 'bg-muted text-foreground';
        label = t('status.draft');
        icon = <Clock className="w-3 h-3 mr-1" />;
      } else {
        style = 'bg-warning/10 text-yellow-800 dark:text-yellow-400';
        label = edoc;
        icon = <Clock className="w-3 h-3 mr-1" />;
      }
    } else if (s === 'SENT' || s === 'DELIVERED') {
      style = 'bg-success/10 text-success';
      label = s === 'DELIVERED' ? t('status.delivered') : t('status.sent');
      icon = <Send className="w-3 h-3 mr-1" />;
    } else if (s === 'PAID') {
      style = 'bg-primary/10 text-blue-800 dark:text-blue-400';
      label = t('status.paid');
      icon = <CreditCard className="w-3 h-3 mr-1" />;
    } else if (s === 'PROCESSED') {
      style = 'bg-success/10 text-success';
      label = t('status.processed');
      icon = <CheckCircle className="w-3 h-3 mr-1" />;
    } else if (s === 'CANCELLED' || s === 'CANCELED') {
      style = 'bg-destructive/10 text-red-800 dark:text-red-400';
      label = t('status.cancelled');
      icon = <Ban className="w-3 h-3 mr-1" />;
    } else if (s === 'REJECTED') {
      style = 'bg-destructive/10 text-red-800 dark:text-red-400';
      label = t('status.rejected');
      icon = <XCircle className="w-3 h-3 mr-1" />;
    } else if (s === 'OVERDUE') {
      style = 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      label = t('status.overdue');
      icon = <AlertCircle className="w-3 h-3 mr-1" />;
    } else if (s === 'DRAFT') {
      style = 'bg-muted text-foreground';
      label = t('status.draft');
      icon = <Clock className="w-3 h-3 mr-1" />;
    } else {
      style = 'bg-warning/10 text-yellow-800 dark:text-yellow-400';
      label = status || t('common.unknown');
      icon = <Clock className="w-3 h-3 mr-1" />;
    }
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${style} ${invoice ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={invoice ? (e) => { e.stopPropagation(); setStatusModal(invoice); } : undefined}
        title={invoice ? t('status.click_for_details') : undefined}
      >
        {icon}{label}
      </span>
    );
  };

  const handleViewPdf = async (invoice: OutgoingInvoiceResponse) => {
    setActiveMenu(null);
    const toastId = toast.loading(t('common.loading_invoice'));
    try {
      const { data: buf, contentType } = await fetchInvoiceDocument(invoice.invoiceId, 'pdf');
      const isPdf = contentType.includes('application/pdf');
      const mimeType = isPdf ? 'application/pdf' : 'text/html';
      const blob = new Blob([buf], { type: mimeType });
      const baseUrl = URL.createObjectURL(blob);
      const url = isPdf ? `${baseUrl}#pagemode=none&toolbar=1` : baseUrl;
      if (pdfModal?.blobUrl) URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]);
      toast.dismiss(toastId);
      const fileName = `${invoice.invoiceNumber || invoice.invoiceId}${isPdf ? '.pdf' : '.html'}`;
      setPdfModal({ open: true, blobUrl: url, title: `${invoice.invoiceNumber} — ${invoice.partyFirstName} ${invoice.partyLastName}`, fileName });
    } catch {
      toast.error(t('common.invoice_load_failed'), { id: toastId });
    }
  };

  const handleDownloadPdf = async (invoice: OutgoingInvoiceResponse) => {
    setActiveMenu(null);
    const toastId = toast.loading(t('outgoing.messages.downloading'));
    try {
      const { data: buf, contentType } = await fetchInvoiceDocument(invoice.invoiceId, 'pdf');
      const isPdf = contentType.includes('application/pdf');
      const blob = new Blob([buf], { type: isPdf ? 'application/pdf' : 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber || invoice.invoiceId}${isPdf ? '.pdf' : '.html'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(isPdf ? t('outgoing.messages.pdf_downloaded') : t('outgoing.messages.invoice_downloaded'), { id: toastId });
    } catch {
      // Fallback to XML download
      try {
        const { data: buf } = await fetchInvoiceDocument(invoice.invoiceId, 'xml');
        const blob = new Blob([buf], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoice.invoiceNumber || invoice.invoiceId}.xml`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(t('outgoing.messages.xml_downloaded'), { id: toastId });
      } catch {
        toast.error(t('outgoing.messages.document_download_failed'), { id: toastId });
      }
    }
  };

  // handleViewHtml removed as it was unused

  const handleRefreshProviderStatus = async () => {
    if (!statusModal) return;
    setProviderStatusLoading(true);
    try {
      const res = await apiClient.get(`/api/invoices/${statusModal.invoiceId}/status`);
      setProviderStatus((res.data?.data ?? null) as ProviderStatusData | null);
      toast.success(t('outgoing.messages.provider_status_refreshed'));
    } catch {
      toast.error(t('outgoing.messages.provider_status_failed'));
    } finally {
      setProviderStatusLoading(false);
    }
  };

  const handleRetryProviderSend = async () => {
    if (!statusModal) return;
    setActionLoading(`retry-${statusModal.invoiceId}`);
    try {
      await apiClient.post(`/api/invoices/${statusModal.invoiceId}/retry-send`);
      toast.success(t('outgoing.messages.retry_queued'));
      await Promise.allSettled([
        apiClient.get(`/api/invoices/${statusModal.invoiceId}/logs`).then((res) => {
          const data = res.data?.data ?? [];
          setStatusLogs(Array.isArray(data) ? data : []);
        }),
        apiClient.get(`/api/invoices/${statusModal.invoiceId}/status`).then((res) => {
          setProviderStatus((res.data?.data ?? null) as ProviderStatusData | null);
        }),
      ]);
      refetch();
    } catch {
      toast.error(t('outgoing.messages.retry_failed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenRemoteHtml = async (invoice: OutgoingInvoiceResponse) => {
    setActiveMenu(null);
    const toastId = toast.loading(t('outgoing.messages.html_preparing'));
    try {
      const { data: buf } = await fetchInvoiceDocument(invoice.invoiceId, 'html', 'remote');
      const blob = new Blob([buf], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success(t('outgoing.messages.html_opened'), { id: toastId });
    } catch {
      toast.error(t('outgoing.messages.html_failed'), { id: toastId });
    }
  };

  const handleCancel = async (invoice: OutgoingInvoiceResponse) => {
    setActiveMenu(null);
    setActionLoading(`cancel-${invoice.invoiceId}`);
    try {
      if ((invoice.status || '').toUpperCase() === 'DRAFT') {
        await apiClient.delete(`/api/invoices/draft/${invoice.invoiceId}`);
        toast.success(t('outgoing.messages.draft_deleted'));
      } else {
        await postInvoiceAction(invoice.invoiceId, 'cancel', { reason: 'İptal edildi' });
        toast.success(t('outgoing.messages.invoice_cancelled'));
      }
      refetch();
    } catch {
      toast.error((invoice.status || '').toUpperCase() === 'DRAFT' ? t('outgoing.messages.draft_delete_failed') : t('outgoing.messages.cancel_failed'));
    } finally {
      setActionLoading(null);
    }
  };

  // Copy invoice content as a new draft via API — add to table directly
  const handleCopy = async (invoice: OutgoingInvoiceResponse) => {
    setActiveMenu(null);
    const toastId = toast.loading(t('outgoing.messages.copying'));
    try {
      await apiClient.post(`/api/invoices/${invoice.invoiceId}/copy`);
      toast.success(t('outgoing.messages.copy_success'), { id: toastId });
      refetch();
    } catch {
      toast.error(t('outgoing.messages.copy_failed'), { id: toastId });
    }
  };

  // Copy invoice as draft AND cancel the current invoice
  const handleCopyAndCancel = async (invoice: OutgoingInvoiceResponse) => {
    setActiveMenu(null);
    setActionLoading(`cancel-${invoice.invoiceId}`);
    try {
      await apiClient.post(`/api/invoices/${invoice.invoiceId}/copy`);
      await postInvoiceAction(invoice.invoiceId, 'cancel', { reason: 'Kopyalanarak iptal edildi' });
      toast.success(t('outgoing.messages.copy_cancel_success'));
      refetch();
    } catch {
      toast.error(t('outgoing.messages.operation_failed'));
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredInvoices.map((inv: OutgoingInvoiceResponse) => inv.invoiceId)));
  };
  const handleBulkCancel = async () => {
    const count = selectedIds.size;
    const toastId = toast.loading(t('outgoing.messages.bulk_cancel_loading', { count }));
    try {
      await Promise.all(Array.from(selectedIds).map(id => postInvoiceAction(id, 'cancel', { reason: 'Toplu iptal' })));
      toast.success(t('outgoing.messages.bulk_cancel_success', { count }), { id: toastId });
      setSelectedIds(new Set()); refetch();
    } catch { toast.error(t('outgoing.messages.bulk_cancel_failed'), { id: toastId }); }
  };
  const outgoingExportHeaders = useMemo(() => [t('outgoing.export_headers.invoice_no'), t('outgoing.export_headers.recipient'), t('outgoing.export_headers.amount'), t('outgoing.export_headers.date'), t('outgoing.export_headers.status')], [t]);

  const getOutgoingExportRows = useCallback(() => {
    const selected = selectedIds.size > 0
      ? filteredInvoices.filter((inv: OutgoingInvoiceResponse) => selectedIds.has(inv.invoiceId))
      : filteredInvoices;
    return selected.map((inv: OutgoingInvoiceResponse) => [
      inv.invoiceNumber || '', `${inv.partyFirstName || ''} ${inv.partyLastName || ''}`.trim(),
      String(inv.totalAmount || 0), inv.invoiceDate || '', inv.status || '',
    ]);
  }, [selectedIds, filteredInvoices]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-muted-foreground">{ t('outgoing.loading') }</span>
      </div>
    );
  }

  const outgoingInvoiceColumns: Column<OutgoingInvoiceResponse>[] = [
    {
      key: 'invoiceNumber',
      title: t('outgoing.columns.invoice_number'),
      sortable: true,
      render: (_, invoice) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</span>
      ),
    },
    {
      key: 'party',
      title: t('outgoing.columns.party'),
      sortable: true,
      render: (_, invoice) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-white">{invoice.partyFirstName} {invoice.partyLastName}</div>
          {renderDocumentBadges(invoice)}
        </div>
      ),
    },
    {
      key: 'totalAmount',
      title: t('outgoing.columns.amount'),
      sortable: true,
      render: (_, invoice) => (
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(Number(invoice.totalAmount), 'TRY')}
        </span>
      ),
    },
    {
      key: 'invoiceDate',
      title: t('outgoing.columns.date'),
      sortable: true,
      render: (_, invoice) => (
        <span className="text-sm text-muted-foreground">{formatDate(invoice.invoiceDate)}</span>
      ),
    },
    {
      key: 'status',
      title: t('outgoing.columns.status'),
      sortable: true,
      render: (_, invoice) => getStatusBadge(invoice.status, invoice),
    },
    {
      key: '_actions',
      title: t('outgoing.columns.actions'),
      render: (_, invoice) => (
        <div className="relative" ref={activeMenu === invoice.invoiceId ? menuRef : null}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === invoice.invoiceId ? null : invoice.invoiceId); }}
            className="p-1.5"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          {activeMenu === invoice.invoiceId && (
            <div className="absolute right-0 z-50 mt-1 w-52 bg-white dark:bg-gray-800 border border-border rounded-2xl shadow-lg" onClick={(e) => e.stopPropagation()}>
              {(invoice.status || '').toUpperCase() === 'DRAFT' ? (
                <>
                  <Button variant="ghost" fullWidth onClick={() => { setActiveMenu(null); navigate({ to: '/invoices/new', search: { draftId: Number(invoice.invoiceId) } as { type?: string; draftId?: number } }); }} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 justify-start h-auto">
                    <FileText className="w-4 h-4" /> {t('outgoing.actions.edit_draft')}
                  </Button>
                  <div className="border-t border-border" />
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => handleCancel(invoice)}
                    disabled={actionLoading === `cancel-${invoice.invoiceId}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 dark:hover:bg-red-900/20 disabled:opacity-50 justify-start h-auto"
                  >
                    <XCircle className="w-4 h-4" />
                    {actionLoading === `cancel-${invoice.invoiceId}` ? t('common.processing') : t('outgoing.actions.delete_draft')}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" fullWidth onClick={() => handleViewPdf(invoice)} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 justify-start h-auto">
                    <Eye className="w-4 h-4" /> {t('outgoing.actions.view_invoice')}
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => handleDownloadPdf(invoice)} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 justify-start h-auto">
                    <Download className="w-4 h-4" /> {t('outgoing.actions.download_pdf')}
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => handleOpenRemoteHtml(invoice)} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 justify-start h-auto">
                    <FileText className="w-4 h-4" /> {t('outgoing.actions.open_html')}
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => handleCopy(invoice)} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 justify-start h-auto">
                    <Copy className="w-4 h-4" /> {t('outgoing.actions.copy_invoice')}
                  </Button>
                  <div className="border-t border-border" />
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => handleCopyAndCancel(invoice)}
                    disabled={!!actionLoading}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50 justify-start h-auto"
                  >
                    <Copy className="w-4 h-4" />
                    {actionLoading?.startsWith(`cancel-`) ? t('common.processing') : t('outgoing.actions.copy_and_cancel')}
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    onClick={() => handleCancel(invoice)}
                    disabled={actionLoading === `cancel-${invoice.invoiceId}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 dark:hover:bg-red-900/20 disabled:opacity-50 justify-start h-auto"
                  >
                    <XCircle className="w-4 h-4" />
                    {actionLoading === `cancel-${invoice.invoiceId}` ? t('common.processing') : t('outgoing.actions.cancel')}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <DesktopPageHeader
        title={t('outgoing.title')}
        description={t('outgoing.description')}
        icon={<FileText className="h-6 w-6" />}
        eyebrow={{ tr: t('outgoing.eyebrow'), en: 'E-Invoicing' }}
        actions={(
          <>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => refetch()}>
              <Download size={16} />
              <span className="hidden sm:inline">{ t('common.refresh') }</span>
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate({ to: '/invoices/new', search: { type: 'proforma' } as { type?: string; draftId?: number } })}>
              <FileText size={16} />
              <span className="hidden sm:inline">{ t('common.proforma') }</span>
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate({ to: '/invoices', search: { tab: 'proformas' } as { tab?: string } })}>
              <Receipt size={16} />
              <span className="hidden sm:inline">{ t('common.proformas') }</span>
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate({ to: '/invoices/new', search: { documentKind: 'despatch' } as { type?: string; draftId?: number; documentKind?: 'invoice' | 'despatch' } })}>
              <Send size={16} />
              <span className="hidden sm:inline">{ t('common.new_e_despatch') }</span>
            </Button>
            <Button className="flex items-center gap-2 premium-gradient tactile-press text-white" onClick={() => navigate({ to: '/invoices/new' })}>
              <Plus size={16} />
              <span className="hidden sm:inline">{ t('outgoing.actions.new_invoice') }</span>
            </Button>
          </>
        )}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{ t('common.total_invoices') }</p>
              <p className="text-lg md:text-2xl font-bold text-primary mt-1">{totalCount}</p>
            </div>
            <div className="p-2 md:p-3 bg-primary/10 rounded-2xl">
              <FileText className="text-primary w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{ t('common.total_amount') }</p>
              <p className="text-lg md:text-2xl font-bold text-success mt-1">
                {formatCurrency(totalAmount, 'TRY')}
              </p>
            </div>
            <div className="p-2 md:p-3 bg-success/10 rounded-2xl">
              <Send className="text-success w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{ t('common.paid_amount') }</p>
              <p className="text-lg md:text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {formatCurrency(paidAmount, 'TRY')}
              </p>
            </div>
            <div className="p-2 md:p-3 bg-purple-100 dark:bg-purple-900/20 rounded-2xl">
              <CheckCircle className="text-purple-600 dark:text-purple-400 w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Info Banner */}
      {showBanner && (
        <div className="bg-primary/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-center gap-3">
          <Send className="text-primary flex-shrink-0" size={20} />
          <p className="text-sm text-blue-800 dark:text-blue-300 flex-1">
            Bu sayfada GİB üzerinden gönderilmiş e-fatura ve e-irsaliyeleriniz listelenmektedir.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowBanner(false);
              try { localStorage.setItem(ONBOARDING_OUTGOING_INVOICES_DISMISSED ?? 'outgoing_invoices_dismissed', '1'); } catch (err) { console.error(err); }
            }}
            className="text-blue-400 hover:text-primary dark:hover:text-blue-200 flex-shrink-0"
          >
            <X size={18} />
          </Button>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              type="text"
              placeholder={t('outgoing.search_placeholder')}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); }}
              className="w-full pl-10 pr-4"
              fullWidth
            />
          </div>
          <div className="flex gap-2 items-end">
            <DatePicker
              placeholder={t('outgoing.filters.start_date')}
              value={dateFrom}
              onChange={(date) => { setDateFrom(date); setCurrentPage(1); }}
              className="w-[140px]"
            />
            <DatePicker
              placeholder={t('outgoing.filters.end_date')}
              value={dateTo}
              onChange={(date) => { setDateTo(date); setCurrentPage(1); }}
              className="w-[140px]"
            />
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2"
              options={[
                { value: 'all', label: t('outgoing.filters.all_statuses') },
                { value: 'SENT', label: t('outgoing.filters.sent') },
                { value: 'PAID', label: t('outgoing.filters.paid') },
                { value: 'draft', label: t('outgoing.filters.draft') }
              ]}
            />
            <Button onClick={() => refetch()} className="flex items-center gap-2">
              <Filter size={18} />
              Ara
            </Button>
          </div>
        </div>
      </Card>

      {/* Mobile Card View (< md) */}
      <div className="md:hidden flex items-center justify-between mt-4">
        {isMobileSelectionMode ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => { setIsMobileSelectionMode(false); setSelectedIds(new Set()); }} className="text-muted-foreground">
              <X className="w-4 h-4 mr-1" /> {t('common.close')}
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-primary font-medium">
              {selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0 ? t('common.select_none') : t('common.select_all')}
            </Button>
          </>
        ) : (
          <div className="flex-1" />
        )}
        {!isMobileSelectionMode && (
          <Button variant="ghost" size="sm" onClick={() => setIsMobileSelectionMode(true)} className="text-primary font-medium ml-auto">
            <CheckSquare className="w-4 h-4 mr-1" /> {t('common.select')}
          </Button>
        )}
      </div>

      <div className="block md:hidden space-y-3 mt-3">
        {filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4">
              <FileText className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{ t('outgoing.not_found') }</h3>
            <p className="text-muted-foreground text-sm mt-1">{ t('outgoing.not_found_description') }</p>
          </div>
        ) : filteredInvoices.map((invoice: OutgoingInvoiceResponse) => (
          <InvoiceMobileCard
            key={invoice.invoiceId}
            invoice={invoice}
            onView={() => {
              if ((invoice.status || '').toUpperCase() === 'DRAFT') {
                navigate({ to: '/invoices/new', search: { draftId: Number(invoice.invoiceId) } as { type?: string; draftId?: number } });
              } else {
                handleViewPdf(invoice);
              }
            }}
            onDownload={() => handleDownloadPdf(invoice)}
            onCopy={() => handleCopy(invoice)}
            onCopyAndCancel={() => handleCopyAndCancel(invoice)}
            onCancel={() => handleCancel(invoice)}
            getStatusBadge={getStatusBadge}
            renderDocumentBadges={renderDocumentBadges}
            actionLoading={actionLoading}
            isSelectionMode={isMobileSelectionMode}
            isSelected={selectedIds.has(invoice.invoiceId)}
            onToggleSelect={() => toggleSelect(invoice.invoiceId)}
          />
        ))}
      </div>

      {/* Desktop Table View (>= md) */}
      <Card className="hidden md:block">
        <DataTable<OutgoingInvoiceResponse>
          data={filteredInvoices}
          columns={outgoingInvoiceColumns}
          loading={isLoading}
          rowKey={(inv) => inv.invoiceId}
          onRowClick={(invoice) => {
            if ((invoice.status || '').toUpperCase() === 'DRAFT') {
              navigate({ to: '/invoices/new', search: { draftId: Number(invoice.invoiceId) } as { type?: string; draftId?: number } });
            } else {
              handleViewPdf(invoice);
            }
          }}
          rowSelection={{
            selectedRowKeys: Array.from(selectedIds),
            onChange: (keys) => setSelectedIds(new Set(keys.map(String))),
          }}
          sortable
          onSort={(key, dir) => { if (dir) { setSortField(key); setSortDir(dir); } else { setSortField(''); } }}
          pagination={{
            current: currentPage,
            pageSize: perPage,
            total: totalCount,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            onChange: (p, ps) => { setCurrentPage(p); setPerPage(ps); },
          }}
        />
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-gray-800 border border-border rounded-xl shadow-2xl px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4 w-[90%] md:w-auto overflow-x-auto whitespace-nowrap">
          <span className="text-sm font-medium text-foreground">{t('common.n_invoices_selected', { count: selectedIds.size })}</span>
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <Button variant="ghost" onClick={handleBulkCancel} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 dark:hover:bg-red-900/20 rounded-2xl transition-colors h-auto">
            <Ban className="w-4 h-4" /> {t('outgoing.actions.bulk_cancel')}
          </Button>
          <PermissionGate permission="invoices.documents.download.view">
            <ExportDropdown
              headers={outgoingExportHeaders}
              getRows={getOutgoingExportRows}
              filename="giden_faturalar"
              variant="ghost"
              label={t('outgoing.actions.export')}
              compact
              iconClassName="text-success"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-success hover:bg-success/10 dark:hover:bg-green-900/20 rounded-2xl transition-colors h-auto"
            />
          </PermissionGate>
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
          <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted dark:hover:bg-gray-700 rounded-2xl transition-colors h-auto">
            <X className="w-4 h-4" /> {t('common.remove_selection')}
          </Button>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {pdfModal?.open && (
        <div
          data-testid="invoice-pdf-modal"
          className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4"
          onClick={() => { URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]); setPdfModal(null); }}
        >
          <div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl flex flex-col"
            style={{ height: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate pr-4">{pdfModal.title}</h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={pdfModal.blobUrl.split('#')[0]}
                  download={pdfModal.fileName}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white premium-gradient tactile-press rounded-xl"
                >
                  <Download size={15} />
                  İndir
                </a>
                <Button
                  variant="ghost"
                  onClick={() => { URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]); setPdfModal(null); }}
                  className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-200"
                >
                  <X size={24} />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe src={pdfModal.blobUrl} className="w-full h-full border-0" title={t('common.invoice_pdf_title')} />
            </div>
          </div>
        </div>
      )}

      {/* Status Modal with GİB Log History */}
      {statusModal && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={() => setStatusModal(null)}
        >
          <div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{ t('status_modal.title') }</h2>
              <Button
                variant="ghost"
                onClick={() => setStatusModal(null)}
                className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-200"
              >
                <X size={24} />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">{ t('status_modal.invoice_no') }</p><p className="text-sm font-medium text-gray-900 dark:text-white">{statusModal.invoiceNumber}</p></div>
                <div><p className="text-xs text-muted-foreground">{ t('status_modal.recipient') }</p><p className="text-sm font-medium text-gray-900 dark:text-white">{statusModal.partyFirstName} {statusModal.partyLastName}</p></div>
                <div><p className="text-xs text-muted-foreground">{ t('status_modal.date') }</p><p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(statusModal.invoiceDate)}</p></div>
                <div><p className="text-xs text-muted-foreground">{ t('status_modal.amount') }</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(statusModal.totalAmount), 'TRY')}</p></div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">{ t('status_modal.current_status') }</p>
                  {getStatusBadge(statusModal.status)}
                </div>
              </div>

              <div className="rounded-2xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    {t('status_modal.gib_status')}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleRefreshProviderStatus} disabled={providerStatusLoading} className="text-xs">
                      {providerStatusLoading ? t('status_modal.refreshing') : t('status_modal.live_status_btn')}
                    </Button>
                    {providerStatus?.retryable && (
                      <Button onClick={handleRetryProviderSend} disabled={actionLoading === `retry-${statusModal.invoiceId}`} className="text-xs">
                        {actionLoading === `retry-${statusModal.invoiceId}` ? t('status_modal.sending') : t('status_modal.retry_send')}
                      </Button>
                    )}
                  </div>
                </div>
                {providerStatusLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                    { t('status_modal.querying') }
                  </div>
                ) : providerStatus ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">{ t('status_modal.live_status') }</p>
                      <p className="font-medium text-gray-900 dark:text-white">{providerStatus.currentStatus}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{ t('status_modal.status_code') }</p>
                      <p className="font-medium text-gray-900 dark:text-white">{providerStatus.providerStatusCode || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">{ t('status_modal.provider_message') }</p>
                      <p className="font-medium text-gray-900 dark:text-white break-words">{providerStatus.providerMessage || '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">{ t('status_modal.envelope_uuid') }</p>
                      <p className="font-mono text-xs text-foreground break-all">{providerStatus.envelopeId}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{ t('status_modal.provider_status_unavailable') }</p>
                )}
              </div>

              {/* GİB Log History */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  {t('status_modal.history_title')}
                </h3>
                {logsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                    Yükleniyor...
                  </div>
                ) : statusLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{ t('status_modal.history_empty') }</p>
                ) : (
                  <div className="relative pl-4">
                    <div className="absolute left-2 top-0 bottom-0 w-px bg-accent" />
                    <div className="space-y-4">
                      {statusLogs.map((log, idx) => (
                        <div key={log.id ?? idx} className="relative pl-4">
                          <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-gray-800" />
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">{log.description || log.status || t('status_modal.step')}</p>
                          {(log.createDate || log.createTime) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {log.createDate ? `${log.createDate} ` : ''}{log.createTime ? log.createTime.split('.')[0] : ''}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-border flex-shrink-0">
              <Button variant="outline" onClick={() => setStatusModal(null)}>{ t('common.close') }</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Mobile Card Component ───────────────────────────────────────────────────
interface InvoiceMobileCardProps {
  invoice: OutgoingInvoiceResponse;
  onView: () => void;
  onDownload: () => void;
  onCopy: () => void;
  onCopyAndCancel: () => void;
  onCancel: () => void;
  getStatusBadge: (status: string, invoice?: OutgoingInvoiceResponse) => React.ReactNode;
  renderDocumentBadges: (invoice: OutgoingInvoiceResponse) => React.ReactNode;
  actionLoading: string | null;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

function InvoiceMobileCard({ invoice, onView, onDownload, onCopy, onCopyAndCancel, onCancel, getStatusBadge, renderDocumentBadges, actionLoading, isSelectionMode, isSelected, onToggleSelect }: InvoiceMobileCardProps) {
  const { t } = useTranslation('invoices');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className={`rounded-xl border shadow-sm overflow-visible relative transition-all ${isSelected ? 'border-blue-500 bg-primary/10/50 dark:border-blue-500' : 'bg-white dark:bg-gray-900 border-border'}`}>
      {isSelectionMode && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          {isSelected ? (
            <CheckSquare className="w-6 h-6 text-primary" />
          ) : (
            <Square className="w-6 h-6 text-gray-300" />
          )}
        </div>
      )}
      {/* Tappable card body */}
      <div
        className={`p-4 cursor-pointer active:bg-muted dark:active:bg-gray-800 transition-colors ${isSelectionMode ? 'pr-12' : ''}`}
        onClick={() => {
          if (isSelectionMode && onToggleSelect) onToggleSelect();
          else onView();
        }}
      >
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{invoice.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {invoice.partyFirstName} {invoice.partyLastName}
            </p>
            <div className="mt-1">{renderDocumentBadges(invoice)}</div>
          </div>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            {getStatusBadge(invoice.status, invoice)}
            {/* Actions ⋮ button */}
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="sm"
                className="p-1.5 text-muted-foreground"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-50 w-48 bg-white dark:bg-gray-800 border border-border rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" fullWidth onClick={() => { setMenuOpen(false); onView(); }} className="flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 justify-start h-auto">
                    <Eye className="w-4 h-4" /> {t('outgoing.actions.view')}
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => { setMenuOpen(false); onDownload(); }} className="flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 justify-start h-auto">
                    <Download className="w-4 h-4" /> {t('outgoing.actions.download_pdf')}
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => { setMenuOpen(false); onCopy(); }} className="flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 justify-start h-auto">
                    <Copy className="w-4 h-4" /> {t('outgoing.actions.copy_draft')}
                  </Button>
                  <div className="border-t border-border" />
                  <Button variant="ghost" fullWidth onClick={() => { setMenuOpen(false); onCopyAndCancel(); }} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-3 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50 justify-start h-auto">
                    <Copy className="w-4 h-4" /> {t('outgoing.actions.copy_and_cancel')}
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => { setMenuOpen(false); onCancel(); }} disabled={actionLoading === `cancel-${invoice.invoiceId}`} className="flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 dark:hover:bg-red-900/20 disabled:opacity-50 justify-start h-auto">
                    <XCircle className="w-4 h-4" /> {t('outgoing.actions.cancel')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{ t('status_modal.date') }</p>
              <p className="text-sm font-medium text-foreground">
                {formatDate(invoice.invoiceDate)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{ t('status_modal.amount') }</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(Number(invoice.totalAmount), 'TRY')}
              </p>
            </div>
          </div>
          {(invoice.status || '').toUpperCase() === 'DRAFT' && (
            <div className="mt-3 inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              {t('outgoing.draft_hint')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
