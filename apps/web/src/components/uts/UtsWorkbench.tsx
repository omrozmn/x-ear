import { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Download, Package, RefreshCw, Search, Send, ShieldCheck, ShieldQuestion, Square, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Button, Card, DataTable, Input, useToastHelpers } from '@x-ear/ui-web';

import { useIsMobile } from '@/hooks/useBreakpoint';
import { useAddUtsSerialToInventory, useUtsConfig, useUtsSerialStates } from '@/hooks/uts/useUts';
import { useSyncUtsAlmaBekleyenler } from '@/api/client/uts.client';
import type { UtsSerialState } from '@/services/uts/uts.service';
import { DesktopPageHeader } from '@/components/layout/DesktopPageHeader';

import { UtsSerialStatusBadge } from './UtsSerialStatusBadge';
import { UtsSerialStatusModal } from './UtsSerialStatusModal';

type TabKey = 'owned' | 'pending_receipt';

const UTS_VERIFIED_MOVEMENT_TYPES = ['query', 'alma', 'verme', 'sync'];

const KNOWN_BRANDS = [
  'Phonak', 'Signia', 'Oticon', 'ReSound', 'Resound', 'Widex', 'Starkey',
  'Unitron', 'Bernafon', 'Sonic', 'Hansaton', 'Rexton', 'Audio Service',
  'Audifon', 'Beltone', 'Interton', 'Philips', 'Siemens', 'GN',
  'Ear Teknik', 'Rayovac', 'Duracell', 'PowerOne', 'Power One',
  'Sonova', 'WS Audiology', 'Demant', 'GN Hearing',
];

function parseBrandModel(productName: string): { brand: string; model: string } {
  const trimmed = productName.trim();
  const lowerName = trimmed.toLowerCase();
  const sorted = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length);
  for (const brand of sorted) {
    if (lowerName.startsWith(brand.toLowerCase())) {
      const rest = trimmed.slice(brand.length).trim();
      const model = rest.replace(/^[-:]\s*/, '').trim();
      return { brand, model: model || trimmed };
    }
  }
  const parts = trimmed.split(/\s+/);
  return {
    brand: parts[0] || trimmed,
    model: parts.length > 1 ? parts.slice(1).join(' ') : trimmed,
  };
}

export function UtsWorkbench() {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { data: utsConfig } = useUtsConfig();
  const { success: showSuccessToast, error: showErrorToast } = useToastHelpers();
  const addToInventoryMutation = useAddUtsSerialToInventory();
  const [activeTab, setActiveTab] = useState<TabKey>('owned');
  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [selectedState, setSelectedState] = useState<UtsSerialState | null>(null);
  const [selectedStates, setSelectedStates] = useState<UtsSerialState[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inventoryConfirm, setInventoryConfirm] = useState<{
    serialKey: string;
    productName: string;
    brand: string;
    model: string;
  } | null>(null);

  const query = useUtsSerialStates({
    status: activeTab,
    search: search.trim() || undefined,
  });

  const syncAlmaBekleyenler = useSyncUtsAlmaBekleyenler({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: ['uts', 'serial-states'] }),
    },
  });

  const rawItems = useMemo(() => query.data?.items || [], [query.data?.items]);
  const items = rawItems;
  const total = items.length;
  const ownedAllItems = useUtsSerialStates({ status: 'owned' }).data?.items || [];
  const ownedCount = ownedAllItems.length;
  const unverifiedCount = ownedAllItems.filter((item) => !UTS_VERIFIED_MOVEMENT_TYPES.includes(item.lastMovementType || '')).length;
  const pendingCount = useUtsSerialStates({ status: 'pending_receipt' }).data?.total || 0;

  useEffect(() => {
    setSelectedKeys(new Set());
  }, [activeTab, search]);

  const handleOpen = (item: UtsSerialState) => {
    setSelectedStates([]);
    setSelectedState(item);
    setIsModalOpen(true);
  };

  const handleOpenAddToInventory = (record: UtsSerialState) => {
    const name = record.productName || record.inventoryName || '';
    const { brand, model } = parseBrandModel(name);
    setInventoryConfirm({
      serialKey: record.serialKey,
      productName: name,
      brand,
      model,
    });
  };

  const handleConfirmAddToInventory = async () => {
    if (!inventoryConfirm) return;
    try {
      const result = await addToInventoryMutation.mutateAsync({
        serialKey: inventoryConfirm.serialKey,
        brand: inventoryConfirm.brand || undefined,
        model: inventoryConfirm.model || undefined,
      });
      showSuccessToast(result.message || 'Envantere eklendi');
      setInventoryConfirm(null);
    } catch (error) {
      showErrorToast((error as Error)?.message || 'Envantere eklenemedi');
    }
  };

  const selectedItems = useMemo(
    () => items.filter((item) => selectedKeys.has(item.serialKey)),
    [items, selectedKeys],
  );

  const handleOpenBulkMovement = () => {
    if (!selectedItems.length) return;
    setSelectedState(null);
    setSelectedStates(selectedItems);
    setIsModalOpen(true);
  };

  const columns = useMemo(() => [
    {
      key: 'select',
      title: (
        <button
          data-allow-raw="true"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (selectedKeys.size === items.length) {
              setSelectedKeys(new Set());
            } else {
              setSelectedKeys(new Set(items.map((item) => item.serialKey)));
            }
          }}
        >
          {selectedKeys.size === items.length && items.length > 0 ? <CheckSquare className="h-4 w-4 text-sky-600" /> : <Square className="h-4 w-4 text-slate-400" />}
        </button>
      ),
      render: (_value: unknown, record: UtsSerialState) => (
        <button
          data-allow-raw="true"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedKeys((previous) => {
              const next = new Set(previous);
              if (next.has(record.serialKey)) next.delete(record.serialKey);
              else next.add(record.serialKey);
              return next;
            });
          }}
        >
          {selectedKeys.has(record.serialKey) ? <CheckSquare className="h-4 w-4 text-sky-600" /> : <Square className="h-4 w-4 text-slate-400" />}
        </button>
      ),
    },
    {
      key: 'productName',
      title: 'Cihaz',
      sortable: true,
      render: (_value: unknown, record: UtsSerialState) => (
        <div className="flex flex-col">
          <button
            data-allow-raw="true"
            type="button"
            onClick={() => handleOpen(record)}
            className="text-left text-sm font-semibold text-sky-700 hover:text-sky-800"
          >
            {record.productName || record.inventoryName || '-'}
          </button>
          <span className="text-xs text-slate-500">{record.serialNumber || '-'} • {record.productNumber || '-'}</span>
        </div>
      ),
    },
    {
      key: 'supplierName',
      title: 'Tedarikci',
      render: (_value: unknown, record: UtsSerialState) => (
        <span className="text-sm text-slate-700">{record.supplierName || '-'}</span>
      ),
    },
    {
      key: 'institutionNumber',
      title: 'Kurum No',
      render: (_value: unknown, record: UtsSerialState) => (
        <span className="text-sm text-slate-700">{record.institutionNumber || '-'}</span>
      ),
    },
    {
      key: 'status',
      title: 'UTS Durumu',
      render: (_value: unknown, record: UtsSerialState) => (
        <UtsSerialStatusBadge status={record.status} onClick={() => handleOpen(record)} />
      ),
    },
    {
      key: 'inventory',
      title: 'Envanter',
      render: (_value: unknown, record: UtsSerialState) => (
        record.inventoryId ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <Package className="h-3 w-3" />
            Envanterde
          </span>
        ) : null
      ),
    },
    {
      key: 'actions',
      title: 'Islem',
      render: (_value: unknown, record: UtsSerialState) => (
        <div className="flex items-center gap-2">
          {!record.inventoryId && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={addToInventoryMutation.isPending}
              onClick={(event) => {
                event.stopPropagation();
                handleOpenAddToInventory(record);
              }}
            >
              <Package className="mr-1 h-3.5 w-3.5" />
              Envantere Ekle
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedState(record);
              setSelectedStates([]);
              setIsModalOpen(true);
            }}
          >
            <Send className="mr-1 h-3.5 w-3.5" />
            {activeTab === 'owned' ? 'Verme Bildir' : 'Alma Bildir'}
          </Button>
        </div>
      ),
    },
  ], [activeTab, addToInventoryMutation.isPending, items, selectedKeys]);

  const renderMobileCards = () => (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.serialKey}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <button
                data-allow-raw="true"
                type="button"
                onClick={() => handleOpen(item)}
                className="truncate text-left text-sm font-semibold text-slate-900"
              >
                {item.productName || item.inventoryName || '-'}
              </button>
              <p className="mt-1 text-xs text-slate-500">{item.serialNumber || '-'} • {item.productNumber || '-'}</p>
            </div>
            <UtsSerialStatusBadge status={item.status} onClick={() => handleOpen(item)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Tedarikci</p>
              <p className="font-medium text-slate-700">{item.supplierName || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Kurum No</p>
              <p className="font-medium text-slate-700">{item.institutionNumber || '-'}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
            {item.inventoryId && (
              <span className="mr-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                <Package className="h-3 w-3" />
                Envanterde
              </span>
            )}
            {!item.inventoryId && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={addToInventoryMutation.isPending}
                onClick={() => handleOpenAddToInventory(item)}
              >
                <Package className="mr-1 h-3.5 w-3.5" />
                Envantere Ekle
              </Button>
            )}
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => handleOpen(item)}>
              <Send className="mr-1 h-3.5 w-3.5" />
              {activeTab === 'owned' ? 'Verme Bildir' : 'Alma Bildir'}
            </Button>
          </div>
        </div>
      ))}
      {!items.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Bu sekmede kayit yok.
        </div>
      ) : null}
    </div>
  );

  if (!utsConfig?.enabled || !utsConfig?.tokenConfigured) {
    return (
      <Card className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" />
          <div>
            <h3 className="text-base font-semibold text-amber-900">UTS entegrasyonu aktif degil</h3>
            <p className="mt-1 text-sm text-amber-800">
              Seri bazli UTS is listeleri icin once Entegrasyonlar altindan tokeni kaydedip UTS’yi aktiflestir.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <DesktopPageHeader
        title="UTS"
        description="Seri bazli UTS sahiplik ve alma bekleyen cihaz akislari"
        icon={<ShieldCheck className="h-6 w-6" />}
        eyebrow={{ tr: 'Takip', en: 'Traceability' }}
        actions={(
          <div className="flex items-center gap-2">
            {activeTab === 'pending_receipt' && (
              <Button
                variant="primary"
                className="flex items-center gap-2"
                onClick={() => syncAlmaBekleyenler.mutate()}
                disabled={syncAlmaBekleyenler.isPending}
              >
                <Download className={`h-4 w-4 ${syncAlmaBekleyenler.isPending ? 'animate-spin' : ''}`} />
                {syncAlmaBekleyenler.isPending ? 'Senkronize ediliyor...' : 'UTS\'den Çek'}
              </Button>
            )}
            <Button variant="outline" className="flex items-center gap-2" onClick={() => query.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Yenile
            </Button>
          </div>
        )}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Ustümdeki Cihazlar (Dogrulanmis)</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">{ownedCount}</p>
        </Card>
        <Card className="rounded-3xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Alma Bekleyenler</p>
          <p className="mt-2 text-3xl font-semibold text-slate-700">{pendingCount}</p>
        </Card>
        {unverifiedCount > 0 ? (
          <Card className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2">
              <ShieldQuestion className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-700">Dogrulanmamis Kayitlar</p>
            </div>
            <p className="mt-2 text-3xl font-semibold text-amber-600">{unverifiedCount}</p>
            <p className="mt-1 text-xs text-amber-600">UTS sorgusu yapilmamis seri no'lar</p>
          </Card>
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              data-allow-raw="true"
              type="button"
              onClick={() => setActiveTab('owned')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${activeTab === 'owned' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Ustümdeki Cihazlar ({ownedCount})
            </button>
            <button
              data-allow-raw="true"
              type="button"
              onClick={() => setActiveTab('pending_receipt')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${activeTab === 'pending_receipt' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Alma Bekleyenler ({pendingCount})
            </button>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Seri, urun veya barkod ara" className="pl-10" />
          </div>
        </div>

        <div className="mt-4">
          {selectedItems.length ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
              <p className="text-sm font-medium text-sky-900">{selectedItems.length} seri secildi</p>
              <Button variant="primary" className="rounded-full" onClick={handleOpenBulkMovement}>
                <Send className="mr-2 h-4 w-4" />
                {activeTab === 'owned' ? 'Toplu Verme Bildir' : 'Toplu Alma Bildir'}
              </Button>
            </div>
          ) : null}
          {isMobile ? (
            renderMobileCards()
          ) : (
            <DataTable
              data={items}
              columns={columns}
              rowKey="serialKey"
              loading={query.isLoading}
              emptyText="Kayit bulunamadi"
              onRowClick={(row) => handleOpen(row)}
            />
          )}
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Bu sekmede {total} kayit listeleniyor.
        </div>
      </div>

      {/* Envantere Ekle Onay Modalı */}
      {inventoryConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setInventoryConfirm(null); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Envantere Ekle</h3>
            <p className="text-sm text-gray-500 mb-4">Ürün bilgilerini kontrol edin ve gerekirse düzenleyin.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ürün Adı (UTS)</label>
                <Input type="text" value={inventoryConfirm.productName} disabled className="bg-gray-50 text-gray-700 w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Marka</label>
                <Input
                  type="text"
                  value={inventoryConfirm.brand}
                  onChange={(e) => setInventoryConfirm({ ...inventoryConfirm, brand: e.target.value })}
                  placeholder="Marka adı"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Model</label>
                <Input
                  type="text"
                  value={inventoryConfirm.model}
                  onChange={(e) => setInventoryConfirm({ ...inventoryConfirm, model: e.target.value })}
                  placeholder="Model adı"
                  className="w-full"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInventoryConfirm(null)}>İptal</Button>
              <Button
                onClick={() => void handleConfirmAddToInventory()}
                disabled={addToInventoryMutation.isPending}
              >
                <Check className="mr-1 h-4 w-4" />
                {addToInventoryMutation.isPending ? 'Ekleniyor...' : 'Onayla ve Ekle'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <UtsSerialStatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        serialState={selectedState}
        serialStates={selectedStates}
        forcedMovementType={activeTab === 'owned' ? 'verme' : 'alma'}
        onCompleted={() => {
          query.refetch();
          setSelectedKeys(new Set());
        }}
      />
    </div>
  );
}

export default UtsWorkbench;
