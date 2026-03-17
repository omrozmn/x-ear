import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, DataTable, Input, Select } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { Download, Eye, FileText, Receipt, RefreshCw, Search, ShoppingCart, UserRound } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import { listPatientDocuments } from '@/api/client/documents.client';
import { listInventory } from '@/api/client/inventory.client';
import { createSales } from '@/api/client/sales.client';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { DesktopPageHeader } from '@/components/layout/DesktopPageHeader';
import { buildInvoiceDraftFromProforma, storeInvoiceDraft } from '@/utils/invoiceDraft';
import { buildSalesPayloadsFromProforma } from '@/utils/proforma';
import { unwrapArray } from '@/utils/response-unwrap';
import { formatCurrency, formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import { partyApiService } from '@/services/party/party-api.service';
import { useTranslation } from 'react-i18next';

interface PartySummary {
  id: string;
  name?: string;
  phone?: string;
}

interface ProformaDocumentRow {
  id: string;
  partyId: string;
  partyName: string;
  phone?: string;
  fileName: string;
  uploadDate: string;
  grandTotal: number;
  status: string;
  proformaNumber: string;
  validUntil?: string;
  itemCount: number;
  metadata: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getPartyName = (party: PartySummary, fallback = 'Bilinmeyen Hasta') => party.name?.trim() || fallback;

const getDocuments = (response: unknown): Array<Record<string, unknown>> => {
  if (!isRecord(response)) return [];
  if (Array.isArray(response.data)) return response.data.filter(isRecord);
  if (isRecord(response.data) && Array.isArray(response.data.documents)) {
    return response.data.documents.filter(isRecord);
  }
  return [];
};

export function ProformasPage() {
  const { t } = useTranslation('invoices');
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState<ProformaDocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadProformas = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedRows: ProformaDocumentRow[] = [];
      const parties = (await partyApiService.fetchAllParties()).map((party) => ({
        id: String(party.id || ''),
        name: [party.firstName, party.lastName].filter(Boolean).join(' ').trim(),
        phone: typeof party.phone === 'string' ? party.phone : undefined,
      }));

      const documentResponses = await Promise.all(
        parties.map(async (party) => ({
          party,
          documents: getDocuments(await listPatientDocuments(party.id)),
        })),
      );

      documentResponses.forEach(({ party, documents }) => {
        documents.forEach((document) => {
          if (document.type !== 'proforma') return;
          const metadata = isRecord(document.metadata) ? document.metadata : {};
          const items = Array.isArray(metadata.items) ? metadata.items : [];
          loadedRows.push({
            id: String(document.id || ''),
            partyId: party.id,
            partyName: getPartyName(party),
            phone: party.phone,
            fileName: String(document.fileName || document.originalName || 'Proforma'),
            uploadDate: String(document.uploadedAt || document.createdAt || new Date().toISOString()),
            grandTotal: Number(metadata.grandTotal || 0),
            status: String(document.status || 'completed'),
            proformaNumber: String(metadata.proformaNumber || document.fileName || ''),
            validUntil: typeof metadata.validUntil === 'string' ? metadata.validUntil : undefined,
            itemCount: items.length,
            metadata,
          });
        });
      });

      setRows(loadedRows);
    } catch (loadError) {
      console.error('Failed to load proformas:', loadError);
      toast.error(t('proformas.load_failed'));
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProformas();
  }, [loadProformas]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        !searchTerm ||
        row.partyName.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR')) ||
        row.proformaNumber.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR')) ||
        row.fileName.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'));
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchTerm, statusFilter]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [currentPage, filteredRows, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handleCreateInvoice = (row: ProformaDocumentRow) => {
    const invoiceDraft = buildInvoiceDraftFromProforma({
      document: { metadata: row.metadata },
      partyId: row.partyId,
    });
    storeInvoiceDraft(invoiceDraft);
    navigate({ to: '/invoices/new' });
  };

  const handleConvertToSale = async (row: ProformaDocumentRow) => {
    const items = Array.isArray(row.metadata.items) ? row.metadata.items : [];
    if (items.length === 0) {
      toast.error(t('proformas.messages.item_not_found'));
      return;
    }

    try {
      const inventoryResponse = await listInventory();
      const inventoryItems = unwrapArray<Record<string, unknown>>(inventoryResponse);
      const { payloads, missingItems } = buildSalesPayloadsFromProforma({
        partyId: row.partyId,
        items: items as Array<Record<string, unknown>>,
        inventory: inventoryItems,
        notes: `Proforma: ${row.proformaNumber}`,
      });

      if (payloads.length === 0) {
        toast.error(t('proformas.messages.product_not_matched', { items: missingItems.join(', ') }));
        return;
      }

      for (const payload of payloads) {
        await createSales(payload);
      }

      window.dispatchEvent(new CustomEvent('xEar:dataChanged'));
      toast.success(
        missingItems.length > 0
          ? t('proformas.messages.items_converted_with_missing', { count: payloads.length, items: missingItems.join(', ') })
          : t('proformas.messages.items_converted', { count: payloads.length }),
      );
    } catch (conversionError) {
      console.error('Failed to convert proforma to sale:', conversionError);
      toast.error(t('proformas.messages.conversion_failed'));
    }
  };

  const handleOpenParty = (row: ProformaDocumentRow) => {
    navigate({ to: '/parties/$partyId', params: { partyId: row.partyId } });
  };

  const columns: Column<ProformaDocumentRow>[] = [
    {
      key: 'partyName',
      title: t('proformas.columns.patient'),
      render: (_, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{row.partyName}</div>
          <div className="text-xs text-muted-foreground">{row.phone || row.partyId}</div>
        </div>
      ),
    },
    {
      key: 'proformaNumber',
      title: t('proformas.columns.proforma'),
      render: (_, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{row.proformaNumber || '-'}</div>
          <div className="text-xs text-muted-foreground">{row.fileName}</div>
        </div>
      ),
    },
    {
      key: 'uploadDate',
      title: t('proformas.columns.date'),
      render: (_, row) => (
        <div className="text-sm text-foreground">{formatDate(row.uploadDate)}</div>
      ),
    },
    {
      key: 'grandTotal',
      title: t('proformas.columns.amount'),
      align: 'right',
      render: (_, row) => (
        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(row.grandTotal, 'TRY')}</span>
      ),
    },
    {
      key: 'itemCount',
      title: t('proformas.columns.items'),
      align: 'center',
      render: (_, row) => <span>{row.itemCount}</span>,
    },
    {
      key: 'actions',
      title: t('proformas.columns.actions'),
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleOpenParty(row)} title={t('proformas.actions.go_to_patient')}>
            <UserRound className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleConvertToSale(row)} title={t('proformas.actions.convert_to_sale')}>
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleCreateInvoice(row)} title={t('proformas.actions.create_invoice')}>
            <Receipt className="h-4 w-4 text-primary" />
          </Button>
        </div>
      ),
    },
  ];

  const renderMobileCards = () => (
    <div className="space-y-3 md:hidden">
      {paginatedRows.map((row) => (
        <div key={row.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:bg-gray-900">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-semibold text-gray-900 dark:text-white">{row.partyName}</div>
              <div className="mt-1 text-xs text-muted-foreground">{row.proformaNumber || row.fileName}</div>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {t('proformas.n_items', { count: row.itemCount })}
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-3">
            <div>
              <div className="text-xs text-muted-foreground">{t('proformas.columns.date')}</div>
              <div className="text-sm font-medium text-foreground">{formatDate(row.uploadDate)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">{t('proformas.columns.amount')}</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(row.grandTotal, 'TRY')}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenParty(row)}>
              <Eye className="mr-1 h-4 w-4" />
              {t('proformas.actions.go_to_patient')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleConvertToSale(row)}>
              <ShoppingCart className="mr-1 h-4 w-4" />
              {t('proformas.actions.convert_to_sale')}
            </Button>
            <Button size="sm" onClick={() => handleCreateInvoice(row)} className="premium-gradient tactile-press text-white">
              <Receipt className="mr-1 h-4 w-4" />
              {t('proformas.actions.create_invoice')}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      {isMobile ? (
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t('proformas.title')}</h1>
          <Button variant="outline" size="sm" onClick={() => void loadProformas()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <DesktopPageHeader
          title={t('proformas.title')}
          description={t('proformas.description')}
          icon={<FileText className="h-6 w-6" />}
          eyebrow={{ tr: t('proformas.eyebrow'), en: 'Invoice Management' }}
          actions={(
            <>
              <Button variant="outline" className="flex items-center gap-2" onClick={() => void loadProformas()}>
                <RefreshCw className="h-4 w-4" />
                {t('proformas.actions.refresh')}
              </Button>
              <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate({ to: '/invoices' })}>
                <Download className="h-4 w-4" />
                {t('proformas.actions.outgoing_invoices')}
              </Button>
            </>
          )}
        />
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="p-3 md:p-4">
          <div className="text-sm text-muted-foreground">{t('proformas.stats.total_proformas')}</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">{t('proformas.stats.total_amount')}</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(rows.reduce((sum, row) => sum + row.grandTotal, 0), 'TRY')}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">{t('proformas.stats.avg_items')}</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {rows.length > 0 ? (rows.reduce((sum, row) => sum + row.itemCount, 0) / rows.length).toFixed(1) : '0'}
          </div>
        </Card>
      </div>

      <Card className="p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('proformas.search_placeholder')}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full md:w-56"
            options={[
              { value: 'all', label: t('proformas.filters.all_statuses') },
              { value: 'completed', label: t('proformas.filters.completed') },
              { value: 'processing', label: t('proformas.filters.processing') },
              { value: 'error', label: t('proformas.filters.error') },
            ]}
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white py-16 text-center dark:bg-gray-900">
          <FileText className="mb-4 h-10 w-10 text-gray-300" />
          <div className="text-lg font-medium text-gray-900 dark:text-white">{t(‘proformas.not_found’)}</div>
          <div className="mt-1 text-sm text-muted-foreground">{t(‘proformas.not_found_description’)}</div>
        </div>
      ) : (
        <>
          {isMobile ? (
            renderMobileCards()
          ) : (
            <Card className="p-2 md:p-4">
              <DataTable<ProformaDocumentRow>
                data={paginatedRows}
                columns={columns}
                rowKey={(row) => row.id}
                onRowClick={(row) => handleOpenParty(row)}
                pagination={{
                  current: currentPage,
                  pageSize,
                  total: filteredRows.length,
                  showSizeChanger: true,
                  pageSizeOptions: [10, 25, 50, 100],
                  onChange: (page, nextPageSize) => {
                    setCurrentPage(page);
                    setPageSize(nextPageSize);
                  },
                }}
              />
            </Card>
          )}

          {isMobile && (
            <div className={cn('flex justify-center', filteredRows.length <= pageSize && 'hidden')}>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={currentPage * pageSize >= filteredRows.length}
              >
                {t('proformas.actions.load_more')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProformasPage;
