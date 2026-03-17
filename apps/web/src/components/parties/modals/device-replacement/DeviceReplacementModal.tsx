import React, { useState } from 'react';
import { Button, Modal } from '@x-ear/ui-web';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useDeviceReplacement } from './hooks/useDeviceReplacement';
import { ReplacementSummary } from './components/ReplacementSummary';
import { InvoiceSearchStep } from './components/InvoiceSearchStep';
import type { SelectedReturnSource } from './components/InvoiceSearchStep';
import { InvoiceModal } from '@/components/modals/InvoiceModal';
import { useCreatePatientReplacements as useCreatePartyReplacements } from '@/api/client/replacements.client';
import type { InvoiceDraftPayload } from '@/utils/invoiceDraft';
import type { DeviceReplacementModalProps } from './types';

/** Step 1: Değişim Nedeni + İade fatura arama | Step 2: Özet */
type ModalStep = 1 | 2;

export const DeviceReplacementModal: React.FC<DeviceReplacementModalProps> = ({
  isOpen,
  onClose,
  party,
  device,
  onReplacementCreate
}) => {
  const {
    formData,
    state,
    filteredInventory,
    updateFormData,
    updateState,
    resetForm
  } = useDeviceReplacement(isOpen);

  const [step, setStep] = useState<ModalStep>(1);
  const isBilateral = device?.ear === 'both';
  const [invoiceQuantity, setInvoiceQuantity] = useState<number>(isBilateral ? 2 : 1);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceDraft, setInvoiceDraft] = useState<InvoiceDraftPayload | null>(null);
  const [pendingReplacementResult, setPendingReplacementResult] = useState<Record<string, unknown> | null>(null);

  const createReplacementMutation = useCreatePartyReplacements();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

  const buildDefaultNotes = () => {
    if (!device) return '';
    const qty = isBilateral ? 2 : 1;
    return `${qty} Adet ${device.brand} ${device.model} değişim`;
  };

  const buildReturnInvoiceDraft = (source: SelectedReturnSource | null, qty: number): InvoiceDraftPayload => {
    // Satışı yapılan cihaz adı (açıklama için kullanılır)
    const soldDeviceName = `${device?.brand ?? ''} ${device?.model ?? ''}`.trim() || 'Cihaz';

    // Ürün bilgileri kaynağa göre doldurulur
    let productName = '';
    let unitPrice = 0;
    let supplierName = '';
    let returnInvoiceNumber = '';
    let returnInvoiceDate = '';

    let supplierTaxNumber = '';
    let supplierAddress = '';
    let supplierCity = '';
    let supplierDistrict = '';

    if (source?.type === 'invoice') {
      const item = source.matchedItem;
      productName = item.productName || soldDeviceName;
      unitPrice = item.unitPrice ?? 0;
      supplierName = source.invoice.senderName ?? '';
      supplierTaxNumber = source.invoice.senderTaxNumber ?? '';
      supplierAddress = source.invoice.senderAddress ?? '';
      supplierCity = source.invoice.senderCity ?? '';
      supplierDistrict = source.invoice.senderDistrict ?? '';
      returnInvoiceNumber = source.invoice.invoiceNumber ?? '';
      returnInvoiceDate = source.invoice.invoiceDate ?? '';
    } else if (source?.type === 'inventory') {
      const inv = source.item;
      productName = inv.name || `${inv.brand} ${inv.model}`.trim() || soldDeviceName;
      unitPrice = inv.price ?? device?.price ?? 0;
    } else {
      productName = soldDeviceName;
      unitPrice = device?.price ?? 0;
    }

    // İade faturası: KDV %0
    const taxRate = 0;
    const taxBase = Number((unitPrice * qty).toFixed(2));
    const total = taxBase; // KDV %0 olduğu için toplam = matrah

    return {
      invoiceType: '50', // İade faturası
      scenario: 'other',
      currency: 'TRY',
      customerId: '',
      customerFirstName: supplierName,
      customerLastName: '',
      customerName: supplierName,
      customerTcNumber: '',
      customerTaxId: supplierTaxNumber,
      customerAddress: supplierAddress,
      customerCity: supplierCity,
      customerDistrict: supplierDistrict,
      items: [{
        id: `return-${Date.now()}`,
        name: productName,
        quantity: qty,
        unit: 'Adet',
        unitPrice: Number(unitPrice.toFixed(2)),
        discount: 0,
        discountType: 'amount' as const,
        taxRate,
        taxAmount: 0,
        total,
      }],
      totalAmount: total,
      notes: `${qty} Adet ${soldDeviceName} değişim`,
      returnInvoiceDetails: returnInvoiceNumber ? {
        returnInvoiceNumber,
        returnInvoiceDate: returnInvoiceDate ? returnInvoiceDate.split('T')[0] : '',
        returnReason: `${qty} Adet ${soldDeviceName} değişim`,
      } : undefined,
    };
  };

  const advanceToSummary = (source: SelectedReturnSource | null) => {
    if (!formData.replacementReason) {
      updateState({ error: 'Lütfen değişim nedenini seçiniz.' });
      return;
    }
    updateState({ error: '' });
    if (!formData.notes) updateFormData({ notes: buildDefaultNotes() });
    updateFormData({ returnSource: source, createReturnInvoice: source !== null });
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!formData.replacementReason) {
      updateState({ error: 'Lütfen değişim nedenini seçiniz.' });
      return;
    }

    updateState({ isLoading: true, error: '' });

    try {
      const replacementData = {
        oldDeviceId: device?.id,
        oldDeviceInfo: {
          id: device?.id,
          brand: device?.brand,
          model: device?.model,
          serialNumber: device?.serialNumber,
          price: device?.price
        },
        replacementReason: formData.replacementReason,
        notes: formData.notes
      };

      await createReplacementMutation.mutateAsync({ partyId: party.id, data: replacementData });

      updateState({ success: true, isLoading: false });

      const replacementResult = {
        ...replacementData,
        createReturnInvoice: formData.createReturnInvoice,
        invoiceType: formData.invoiceType,
        timestamp: new Date().toISOString(),
        returnSource: formData.returnSource ?? undefined,
      };

      if (formData.returnSource !== null) {
        // Build draft and open InvoiceModal right away.
        // IMPORTANT: Do NOT call onReplacementCreate yet — it causes the parent
        // to unmount this component (sets isOpen=false). We defer it until
        // the InvoiceModal closes (handleInvoiceModalClose).
        setPendingReplacementResult(replacementResult);
        const draft = buildReturnInvoiceDraft(formData.returnSource, invoiceQuantity);
        setInvoiceDraft(draft);
        setShowInvoiceModal(true);
      } else {
        onReplacementCreate(replacementResult);
        setTimeout(() => {
          onClose();
          resetForm();
          setStep(1);
          setInvoiceQuantity(isBilateral ? 2 : 1);
        }, 1500);
      }

    } catch (error: unknown) {
      console.error('Replacement error:', error);
      const err = error as { response?: { data?: { detail?: string } }; message?: string };
      updateState({
        isLoading: false,
        error: err?.response?.data?.detail || err?.message || 'Değişim işlemi sırasında hata oluştu. Lütfen tekrar deneyin.'
      });
    }
  };

  const handleInvoiceModalClose = () => {
    setShowInvoiceModal(false);
    setInvoiceDraft(null);
    // Fire the deferred replacement callback now that InvoiceModal is done
    if (pendingReplacementResult) {
      onReplacementCreate(pendingReplacementResult as unknown as Parameters<typeof onReplacementCreate>[0]);
      setPendingReplacementResult(null);
    }
    resetForm();
    setStep(1);
    setInvoiceQuantity(isBilateral ? 2 : 1);
    onClose();
  };

  const handleClose = () => {
    onClose();
    resetForm();
    setStep(1);
    setInvoiceQuantity(isBilateral ? 2 : 1);
    setShowInvoiceModal(false);
    setInvoiceDraft(null);
    setPendingReplacementResult(null);
  };

  if (!device) return null;

  // Leave search empty — user will type what they're looking for
  const invoiceSearchDefaultQuery = '';

  return (
    <>
      <Modal isOpen={isOpen && !showInvoiceModal} onClose={handleClose} size="xl">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Cihaz Değişimi
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {party.name} - {device.brand} {device.model}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Step indicator */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {(['1', '2'] as const).map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && <span className="mx-0.5">›</span>}
                  <span
                    className={`w-5 h-5 flex items-center justify-center rounded-full font-medium ${
                      Number(s) === step
                        ? 'bg-blue-600 text-white'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {s}
                  </span>
                </React.Fragment>
              ))}
            </div>
            {/* Close button */}
            <button
              data-allow-raw="true"
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {state.error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-red-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-destructive">{state.error}</span>
          </div>
        )}

        {state.success && (
          <div className="mb-4 p-4 bg-success/10 border border-green-200 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span className="text-success">Cihaz değişimi başarıyla tamamlandı!</span>
          </div>
        )}

        {/* ── STEP 1: Reason + Invoice search ─────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Değişim Nedeni *
              </label>
              <select data-allow-raw="true"
                value={formData.replacementReason}
                onChange={(e) => updateFormData({ replacementReason: e.target.value })}
                className="block w-full px-3 py-2 border border-border rounded-xl shadow-sm focus:outline-none focus:ring-ring focus:border-blue-500 sm:text-sm"
              >
                <option value="">Seçiniz</option>
                <option value="malfunction">Arıza</option>
                <option value="upgrade">Yükseltme</option>
                <option value="comfort">Konfor</option>
                <option value="medical">Tıbbi Gereklilik</option>
                <option value="warranty">Garanti</option>
                <option value="stock">Stok</option>
                <option value="other">Diğer</option>
              </select>
            </div>

            <InvoiceSearchStep
              defaultQuery={invoiceSearchDefaultQuery}
              inventoryItems={filteredInventory}
              onSelect={(source) => advanceToSummary(source)}
              formatCurrency={formatCurrency}
            />
          </div>
        )}

        {/* ── STEP 2: Summary ──────────────────────────────────────────────── */}
        {step === 2 && (
          <ReplacementSummary
            device={device}
            isBilateral={isBilateral}
            invoiceQuantity={invoiceQuantity}
            onInvoiceQuantityChange={setInvoiceQuantity}
            createReturnInvoice={formData.createReturnInvoice}
            onCreateReturnInvoiceChange={(value) => updateFormData({ createReturnInvoice: value })}
            invoiceType={formData.invoiceType}
            onInvoiceTypeChange={(value) => updateFormData({ invoiceType: value })}
            notes={formData.notes}
            onNotesChange={(value) => updateFormData({ notes: value })}
            returnSource={formData.returnSource}
            formatCurrency={formatCurrency}
          />
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => { if (step === 1) handleClose(); else setStep(1); }}
            disabled={state.isLoading}
          >
            {step === 1 ? 'İptal' : '← Geri'}
          </Button>

          <div className="flex gap-2">
            {step === 1 && (
              <Button variant="outline" onClick={() => advanceToSummary(null)}>
                Faturasız devam et →
              </Button>
            )}

            {step === 2 && (
              <Button onClick={handleSubmit} disabled={state.isLoading}>
                {state.isLoading
                  ? 'İşleniyor...'
                  : formData.returnSource
                  ? 'Tamamla ve Fatura Kes →'
                  : 'Değişimi Tamamla'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>

    {/* İade faturası modalı — değişim tamamlandıktan sonra açılır */}
    <InvoiceModal
      isOpen={showInvoiceModal}
      onClose={handleInvoiceModalClose}
      initialData={invoiceDraft as never}
      partyId={party.id}
      mode="create"
      title="İade Faturası Kes"
    />
    </>
  );
};

export default DeviceReplacementModal;