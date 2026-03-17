import { useMemo, useState } from 'react';
import { Loader2, Search, SendHorizontal } from 'lucide-react';

import { Button, useToastHelpers } from '@x-ear/ui-web';

import { extractErrorMessage } from '@/utils/error-utils';
import { utsService, type UtsTekilUrunRecord } from '@/services/uts/uts.service';

type QueryState = {
  loading: boolean;
  resultMessage: string;
  items: UtsTekilUrunRecord[];
  queriedProductNumbers: string[];
  rawResponse?: Record<string, unknown> | null;
};

const initialQueryState: QueryState = {
  loading: false,
  resultMessage: '',
  items: [],
  queriedProductNumbers: [],
  rawResponse: null,
};

export function UtsOperationsPanel() {
  const { success: showSuccessToast, error: showErrorToast } = useToastHelpers();
  const [productNumber, setProductNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [lotBatchNumber, setLotBatchNumber] = useState('');
  const [queryState, setQueryState] = useState<QueryState>(initialQueryState);
  const [selectedItem, setSelectedItem] = useState<UtsTekilUrunRecord | null>(null);
  const [recipientInstitutionNumber, setRecipientInstitutionNumber] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [draftPayload, setDraftPayload] = useState<Record<string, unknown> | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResponse, setSendResponse] = useState<string>('');
  const manualSelectedItem = useMemo<UtsTekilUrunRecord | null>(() => {
    if (!productNumber.trim() || (!serialNumber.trim() && !lotBatchNumber.trim())) {
      return null;
    }

    return {
      productNumber: productNumber.trim(),
      serialNumber: serialNumber.trim() || null,
      lotBatchNumber: lotBatchNumber.trim() || null,
      quantity: Math.max(1, Number(quantity) || 1),
      availableQuantity: null,
      productName: null,
      manufactureDate: null,
      importDate: null,
      expiryDate: null,
      ownerInstitutionNumber: null,
      manufacturerInstitutionNumber: null,
      raw: {},
    };
  }, [lotBatchNumber, productNumber, quantity, serialNumber]);
  const activeItem = selectedItem ?? manualSelectedItem;

  const canSearch = productNumber.trim().length > 0 && (serialNumber.trim().length > 0 || lotBatchNumber.trim().length > 0);
  const canDraft = Boolean(activeItem) && recipientInstitutionNumber.trim() && documentNumber.trim();

  const summaryText = useMemo(() => {
    if (!queryState.items.length) return '';
    return `${queryState.items.length} kayit bulundu`;
  }, [queryState.items.length]);

  const handleSearch = async () => {
    if (!canSearch) return;
    setQueryState((current) => ({ ...current, loading: true, resultMessage: '', items: [] }));
    setSelectedItem(null);
    setDraftPayload(null);
    setSendResponse('');

    try {
      const response = await utsService.queryTekilUrun({
        productNumber,
        serialNumber: serialNumber || undefined,
        lotBatchNumber: lotBatchNumber || undefined,
      });
      setQueryState({
        loading: false,
        resultMessage: response.message || '',
        items: response.items || [],
        queriedProductNumbers: response.queriedProductNumbers || [],
        rawResponse: response.rawResponse,
      });
      if (response.items?.length) {
        const first = response.items[0];
        setSelectedItem(first);
        setQuantity(String(first.quantity || 1));
        showSuccessToast(`UTS sorgusunda ${response.items.length} kayit bulundu`);
      } else {
        showErrorToast(response.message || 'Kayit bulunamadi');
      }
    } catch (error) {
      setQueryState((current) => ({ ...current, loading: false }));
      showErrorToast(extractErrorMessage(error, 'UTS tekil urun sorgusu basarisiz'));
    }
  };

  const handleCreateDraft = async () => {
    if (!activeItem) return;
    setDraftLoading(true);
    setSendResponse('');
    try {
      const draft = await utsService.createVermeDraft({
        productNumber: activeItem.productNumber,
        serialNumber: activeItem.serialNumber || undefined,
        lotBatchNumber: activeItem.lotBatchNumber || undefined,
        quantity: Math.max(1, Number(quantity) || 1),
        recipientInstitutionNumber,
        documentNumber,
      });
      setDraftPayload(draft.payload);
      showSuccessToast(draft.message || 'Verme payload hazirlandi');
    } catch (error) {
      showErrorToast(extractErrorMessage(error, 'Verme payload hazirlanamadi'));
    } finally {
      setDraftLoading(false);
    }
  };

  const handleSend = async () => {
    if (!activeItem) return;
    setSendLoading(true);
    try {
      const result = await utsService.sendVerme({
        productNumber: activeItem.productNumber,
        serialNumber: activeItem.serialNumber || undefined,
        lotBatchNumber: activeItem.lotBatchNumber || undefined,
        quantity: Math.max(1, Number(quantity) || 1),
        recipientInstitutionNumber,
        documentNumber,
      });
      setSendResponse(result.rawResponse || result.message || '');
      if (result.ok) {
        showSuccessToast('UTS verme bildirimi yaniti alindi');
      } else {
        showErrorToast(result.message || 'UTS verme bildirimi basarisiz');
      }
    } catch (error) {
      showErrorToast(extractErrorMessage(error, 'UTS verme bildirimi gonderilemedi'));
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,1fr)]">
      <section className="rounded-3xl border border-slate-200 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900">
          <Search className="h-5 w-5 text-sky-600" />
          <h2 className="text-lg font-semibold">Tekil Urun Sorgulama</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Resmi UTS tekil urun sorgusuna gore barkod/urun no ve seri veya lot bilgisi ile sorgu yapar.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Urun Numarasi</span>
            <input
              data-allow-raw="true"
              value={productNumber}
              onChange={(event) => setProductNumber(event.target.value)}
              placeholder="8682549130640"
              className="w-full rounded-2xl border border-slate-300 bg-card px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Seri / Sira No</span>
            <input
              data-allow-raw="true"
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value)}
              placeholder="25LD8494"
              className="w-full rounded-2xl border border-slate-300 bg-card px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Lot / Batch No</span>
            <input
              data-allow-raw="true"
              value={lotBatchNumber}
              onChange={(event) => setLotBatchNumber(event.target.value)}
              placeholder="Lot bazli urunlerde zorunlu"
              className="w-full rounded-2xl border border-slate-300 bg-card px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={handleSearch} disabled={!canSearch || queryState.loading}>
            {queryState.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Sorgula
          </Button>
          {summaryText && <span className="text-sm text-slate-600">{summaryText}</span>}
          {queryState.queriedProductNumbers.length > 0 && (
            <span className="text-xs text-slate-500">
              Denenen urun no: {queryState.queriedProductNumbers.join(', ')}
            </span>
          )}
        </div>

        <div className="mt-5 space-y-3">
          {queryState.resultMessage && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {queryState.resultMessage}
            </div>
          )}

          {queryState.items.map((item, index) => {
            const isSelected = selectedItem?.productNumber === item.productNumber
              && selectedItem?.serialNumber === item.serialNumber
              && selectedItem?.lotBatchNumber === item.lotBatchNumber;

            return (
              <Button
                key={`${item.productNumber}-${item.serialNumber || item.lotBatchNumber || index}`}
                type="button"
                variant="ghost"
                onClick={() => setSelectedItem(item)}
                className={`h-auto w-full rounded-3xl border p-4 text-left transition ${
                  isSelected ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-card hover:border-sky-300'
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.productName || item.productNumber}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      UNO: {item.productNumber} {item.serialNumber ? `| Seri: ${item.serialNumber}` : ''} {item.lotBatchNumber ? `| Lot: ${item.lotBatchNumber}` : ''}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.ownerInstitutionNumber ? `Sahip Kurum: ${item.ownerInstitutionNumber}` : 'Sahip kurum bilgisi donmedi'}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-4">
                  <div>Uretim: {item.manufactureDate || '-'}</div>
                  <div>Ithalat: {item.importDate || '-'}</div>
                  <div>SKT: {item.expiryDate || '-'}</div>
                  <div>Kullanilabilir: {item.availableQuantity ?? item.quantity ?? '-'}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900">
          <SendHorizontal className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold">Verme Bildirimi</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Sorguda bulunan kaydi sec, hedef kurum ve belge numarasini gir, payload'i goster veya UTS'ye gonder.
        </p>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {activeItem ? (
            <>
              <div className="font-medium text-slate-900">{activeItem.productName || activeItem.productNumber}</div>
              <div className="mt-1 text-xs text-slate-500">
                UNO: {activeItem.productNumber}
                {activeItem.serialNumber ? ` | Seri: ${activeItem.serialNumber}` : ''}
                {activeItem.lotBatchNumber ? ` | Lot: ${activeItem.lotBatchNumber}` : ''}
              </div>
              {!selectedItem && (
                <div className="mt-2 text-xs text-amber-700">
                  Sorgu sonucu secilmedi. Verme bildirimi manuel girilen urun bilgisi ile hazirlanacak.
                </div>
              )}
            </>
          ) : (
            <span>Once soldaki sorgudan bir kayit sec veya urun no ve seri bilgisini doldur.</span>
          )}
        </div>

        <div className="mt-5 grid gap-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Hedef kurum no</span>
            <input
              data-allow-raw="true"
              value={recipientInstitutionNumber}
              onChange={(event) => setRecipientInstitutionNumber(event.target.value)}
              placeholder="2667269055837"
              className="w-full rounded-2xl border border-slate-300 bg-card px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Belge no</span>
            <input
              data-allow-raw="true"
              value={documentNumber}
              onChange={(event) => setDocumentNumber(event.target.value)}
              placeholder="UTS-VERME-001"
              className="w-full rounded-2xl border border-slate-300 bg-card px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Adet</span>
            <input
              data-allow-raw="true"
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-card px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleCreateDraft} disabled={!canDraft || draftLoading}>
            {draftLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Payload Hazirla
          </Button>
          <Button onClick={handleSend} disabled={!canDraft || sendLoading}>
            {sendLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendHorizontal className="mr-2 h-4 w-4" />}
            Verme Bildirimi Gonder
          </Button>
        </div>

        {draftPayload && (
          <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
            <div className="mb-2 font-medium text-white">Payload</div>
            <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(draftPayload, null, 2)}</pre>
          </div>
        )}

        {sendResponse && (
          <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
            <div className="mb-2 font-medium text-white">UTS Yaniti</div>
            <pre className="overflow-x-auto whitespace-pre-wrap">{sendResponse}</pre>
          </div>
        )}
      </section>
    </div>
  );
}

export default UtsOperationsPanel;
