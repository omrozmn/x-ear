import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@x-ear/ui-web';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { InvoicePreviewModal } from '../../components/modals/InvoicePreviewModal';
import { InvoiceModal } from '../../components/modals/InvoiceModal';
import { invoiceService } from '../../services/invoice.service';
import { useToastHelpers } from '@x-ear/ui-web';
import { CheckCircle } from 'lucide-react';
import { ProductSearchInput } from '../cashflow/ProductSearchInput';
import { PartyDevice } from '../../types/party';
import { unwrapArray } from '../../utils/response-unwrap';
import { Invoice } from '../../types/invoice';

// Orval Hooks
// Generated hooks
import {
  useCreateReplacementInvoice,
  useCreateReturnInvoiceSendToGib
} from '@/api/client/replacements.client';
import { ReplacementCreate } from '@/api/generated/schemas';
import { usePartiesGetPartyReplacements, Replacement } from '@/api/custom-hooks/usePartyReplacements';

interface InventoryItem {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  availableInventory?: number;
  availableSerials?: string[];
  category?: string;
  supplier?: string | null;
  barcode?: string;
  sku?: string;
}

// Extended replacement type handling parsed fields
interface FrontendReplacement extends Replacement {
  old_device_info_parsed?: Record<string, unknown> | null;
  new_device_info_parsed?: Record<string, unknown> | null;
  oldDeviceId?: string; // Aliases for consistency
  newDeviceId?: string;
  supplier?: string;
  price_difference?: number;
}

interface DeviceReplaceModalProps {
  device: PartyDevice;
  partyId: string;
  isOpen: boolean;
  onClose: () => void;
  // newInventoryId and newDeviceInfo are optional
  onReplace: (deviceId: string, reason: string, notes: string, newInventoryId?: string, newDeviceInfo?: unknown, selectedSerial?: string) => Promise<void>;
}

export const DeviceReplaceModal: React.FC<DeviceReplaceModalProps> = ({
  device,
  partyId,
  isOpen,
  onClose,
  onReplace
}) => {
  const [reason, setReason] = useState('defective');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorError, setError] = useState<string | null>(null); // renamed to avoid conflict with query error
  const [selectedInventory, setSelectedInventory] = useState<InventoryItem | null>(null);
  const [selectedSerial, setSelectedSerial] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceInitialData, setInvoiceInitialData] = useState<Partial<Invoice> | undefined>(undefined);
  const [invoiceModalMode, setInvoiceModalMode] = useState<'create' | 'edit' | 'quick'>('create');
  const [currentReplacementForInvoice, setCurrentReplacementForInvoice] = useState<string | null>(null);
  const [invoiceDeviceId, setInvoiceDeviceId] = useState<string | null>(null);
  const [sendLoadingMap, setSendLoadingMap] = useState<Record<string, boolean>>({});
  const { success: showSuccess, error: showError } = useToastHelpers();

  // Queries & Mutations
  const { data: replacementsResponse, refetch: refetchReplacements, isLoading: loadingReplacements } = usePartiesGetPartyReplacements(partyId, {
    query: {
      enabled: isOpen,
      staleTime: 0
    }
  });

  const replacementsList = unwrapArray<Replacement>(replacementsResponse).map((rep) => {
    // Normalization logic
    const normalize = (field: unknown) => {
      if (!field) return null;
      if (typeof field === 'string') {
        try { return JSON.parse(field); } catch (e) { return field; }
      }
      return field;
    };
    return {
      ...rep,
      old_device_info_parsed: normalize(rep.old_device_info),
      new_device_info_parsed: normalize(rep.new_device_info),
      // Ensure these exist for safe access
      oldDeviceId: rep.old_device_id,
      newDeviceId: rep.new_device_id
    } as FrontendReplacement;
  });

  const sendToGibMutation = useCreateReturnInvoiceSendToGib();
  const linkInvoiceMutation = useCreateReplacementInvoice();

  useEffect(() => {
    if (!isOpen) {
      setSelectedInventory(null);
      setError(null);
      setIsSubmitting(false);
    }
    // Refetch when opening to ensure fresh data
    if (isOpen) {
      refetchReplacements();
    }
  }, [isOpen, refetchReplacements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      setError('Değişim sebebi seçiniz');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onReplace(device.id, reason, notes, selectedInventory?.id, selectedInventory ? { id: selectedInventory.id, brand: selectedInventory.brand, model: selectedInventory.model, category: selectedInventory.category, availableInventory: selectedInventory.availableInventory } : undefined, selectedSerial || undefined);
      setActionMessage('Cihaz değişimi kaydedildi');
      showSuccess('Cihaz değişimi kaydedildi');
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Cihaz değiştirilemedi';
      setError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateReturnInvoice = async (replacementId: string) => {
    try {
      setActionMessage(null);
      const rep = replacementsList.find((r) => r.id === replacementId);
      if (!rep) throw new Error('Replacement not found');

      const supplierName = rep.supplier || (rep.new_device_info_parsed as Record<string, unknown>)?.supplier || (rep.new_device_info_parsed as Record<string, unknown>)?.supplier_name || null;
      const initial = {
        invoiceType: '50', // İade
        invoice_details: {
          invoice_date: new Date().toISOString().split('T')[0],
          supplierInvoiceNumber: ''
        },
        customerName: supplierName || undefined,
        items: [
          {
            description: (rep.old_device_info_parsed as Record<string, unknown>)?.brand ? `${(rep.old_device_info_parsed as Record<string, unknown>).brand} ${(rep.old_device_info_parsed as Record<string, unknown>).model || ''}`.trim() : (JSON.stringify(rep.old_device_info_parsed) || rep.old_device_info || 'Cihaz'),
            quantity: 1,
            unitPrice: rep.price_difference || 0,
            taxRate: 18
          }
        ],
        notes: `Değişim: ${(rep.new_device_info_parsed as Record<string, unknown>)?.brand || JSON.stringify(rep.new_device_info_parsed) || ''}`
      };

      setInvoiceInitialData(initial as unknown as Partial<Invoice>);
      setCurrentReplacementForInvoice(replacementId);
      setInvoiceDeviceId(rep.old_device_id || rep.oldDeviceId || (rep as any).deviceId || device.id || null);
      setInvoiceModalMode('quick');
      setTimeout(() => setShowInvoiceModal(true), 0);
      setActionMessage(`Yeni iade faturası için form açıldı (replacement ${replacementId})`);
    } catch (e: unknown) {
      const msg = (e as Error).message || 'Fatura oluşturma modalı açılamadı';
      setActionMessage(msg);
      showError(msg);
    }
  };

  const handleInvoiceCreatedAndLinked = async (createdInvoice: Invoice, replacementId?: string) => {
    try {
      // link with provided invoice id to server replacement
      if (!replacementId) throw new Error('Replacement ID missing');

      const body = {
        invoiceId: createdInvoice.id,
        invoiceNumber: createdInvoice.invoiceNumber || createdInvoice.id,
        supplierInvoiceNumber: (createdInvoice as any).supplierInvoiceNumber || createdInvoice.invoiceNumber
      };

      // Use mutation
      await linkInvoiceMutation.mutateAsync({
        replacementId,
        data: body as unknown as ReplacementCreate
      });

      showSuccess('İade faturası oluşturuldu ve kayda bağlandı');
      await refetchReplacements();
      showSuccess('İade faturası oluşturuldu ve kayda bağlandı');
      await refetchReplacements();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error).message || 'Fatura sunucuya bağlanamadı';
      showError(msg);
    } finally {
      setShowInvoiceModal(false);
      setInvoiceInitialData(undefined);
    }
  };

  const handleSendToGib = async (invoiceId: string) => {
    try {
      setActionMessage(null);

      await sendToGibMutation.mutateAsync({
        invoiceId
      });

      setActionMessage('Fatura GİB outbox içine yazıldı ve işlem tamamlandı');
      showSuccess("Fatura GİB'e gönderildi");
      await refetchReplacements();
      showSuccess("Fatura GİB'e gönderildi");
      await refetchReplacements();
    } catch (e: unknown) {
      const msg = (e as any)?.response?.data?.message || (e as Error).message || 'GİB gönderimi başarısız';
      setActionMessage(msg);
      showError(msg);
    }
  };

  const renderInvoiceActions = (rep: FrontendReplacement) => {
    const invoiceId = rep.return_invoice_id || (rep as any).returnInvoiceId || (rep.return_invoice as any)?.id || rep.return_invoice_id;
    const invoiceStatus = (rep.return_invoice as any)?.status || (rep as any).returnInvoiceStatus || (rep as any).return_invoice_status || (rep as any).returnInvoice?.status || (rep.gib_sent ? 'gib_sent' : undefined);

    if (invoiceId && invoiceStatus === 'gib_sent') {
      return (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="px-3 py-1 text-sm bg-green-50 text-green-800 border border-green-100">
            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
            GİB'e gönderildi
          </Button>
        </div>
      );
    }

    if (invoiceId) {
      const isLoading = !!sendLoadingMap[invoiceId];

      return (
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" className="px-3 py-1 text-sm" onClick={async () => {
            try {
              const inv = await invoiceService.getInvoice(invoiceId);
              if (!inv) throw new Error('Fatura bulunamadı');
              setPreviewInvoice(inv);
              setPreviewOpen(true);
              if (!inv) throw new Error('Fatura bulunamadı');
              setPreviewInvoice(inv);
              setPreviewOpen(true);
            } catch (err: unknown) {
              const msg = (err as Error).message || 'Fatura yüklenemedi';
              setActionMessage(msg);
              showError(msg);
            }
          }}>
            Fatura Önizle
          </Button>

          <Button type="button" size="sm" variant="ghost" className="px-3 py-1 text-sm" onClick={async () => {
            try {
              const inv = await invoiceService.getInvoice(invoiceId);
              if (!inv) throw new Error('Fatura bulunamadı');
              const mapped = {
                invoiceType: inv.type || 'corporate',
                invoice_details: {
                  invoice_date: inv.issueDate || new Date().toISOString().split('T')[0],
                  invoice_number: inv.invoiceNumber || inv.id,
                  notes: inv.notes || ''
                },
                items: (inv.items || []).map((it) => ({ description: it.description || it.name || '', quantity: it.quantity || 1, unitPrice: it.unitPrice || it.totalPrice || 0, taxRate: it.taxRate || 18 })),
                notes: inv.notes || '',
                id: inv.id
              };
              setInvoiceInitialData(mapped as any);
              setInvoiceModalMode('edit');
              setTimeout(() => setShowInvoiceModal(true), 0);
              setInvoiceModalMode('edit');
              setTimeout(() => setShowInvoiceModal(true), 0);
            } catch (err: unknown) {
              showError((err as Error)?.message || 'Fatura yüklenemedi');
            }
          }}>
            Fatura Düzenle
          </Button>

          <Button type="button" size="sm" variant="secondary" className="px-3 py-1 text-sm" onClick={async () => {
            try {
              setSendLoadingMap(prev => ({ ...prev, [invoiceId]: true }));
              await handleSendToGib(invoiceId);
            } finally {
              setSendLoadingMap(prev => ({ ...prev, [invoiceId]: false }));
            }
          }} disabled={isLoading}>
            {sendLoadingMap[invoiceId] ? "Gönderiliyor..." : "GİB'e Gönder"}
          </Button>
        </div>
      );
    }

    return (
      <Button type="button" size="sm" variant="secondary" className="px-3 py-1 text-sm" onClick={async () => {
        try {
          await handleCreateReturnInvoice(rep.id);
        } catch (err: unknown) {
          showError((err as Error)?.message || 'Fatura oluşturulamadı');
        }
      }}>
        İade Faturası Oluştur
      </Button>
    );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Cihaz Değiştir"
        size="lg"
        showFooter={false}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Mevcut Cihaz</h4>
            <p className="text-sm text-gray-700">
              <strong>{device.brand} {device.model}</strong>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Seri No: {device.serialNumber || '-'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Değişim Sebebi *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="defective">Arızalı</option>
              <option value="upgrade">Yükseltme</option>
              <option value="warranty">Garanti</option>
              <option value="lost">Kayıp</option>
              <option value="damaged">Hasarlı</option>
              <option value="other">Diğer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notlar
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Değişim ile ilgili notlar..."
            />
          </div>

          {errorError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorError}</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Talep Edilen Yeni Cihaz (Tedarikten alınacak)</h4>
            <p className="text-xs text-gray-600 mb-2">Tedarikten temin etmek istediğiniz modeli seçin. Seri takip edilen ürünler için seri seçimi yapın.</p>
            <div className="mt-3">
              <ProductSearchInput
                className="w-full"
                selectedProduct={selectedInventory as InventoryItem}
                onSelectProduct={(p) => { setSelectedInventory(p as InventoryItem | null); }}
                showReplaceButton={true}
                onReplaceClick={async (item: InventoryItem) => {
                  try {
                    setIsSubmitting(true);
                    setError(null);
                    await onReplace(device.id, reason, notes, item.id, item ? { id: item.id, brand: item.brand, model: item.model, supplier: item.supplier ?? null, category: item.category } : undefined);
                    showSuccess('Cihaz değişimi kaydedildi');
                    await refetchReplacements();
                    await refetchReplacements();
                  } catch (err: unknown) {
                    const msg = (err as Error)?.message || 'Cihaz değiştirilemedi';
                    setError(msg);
                    showError(msg);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              />
            </div>

            {selectedInventory && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                <div className="text-sm text-gray-700">Barkod: <strong>{selectedInventory.barcode || selectedInventory.sku || '-'}</strong></div>
                {(selectedInventory.availableSerials && selectedInventory.availableSerials.length > 0) && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Seri No Seçimi (mevcut)</label>
                    <select value={selectedSerial || ''} onChange={(e) => setSelectedSerial(e.target.value)} className="w-full px-3 py-2 border rounded">
                      <option value="">-- Seri seçin --</option>
                      {(selectedInventory.availableSerials || []).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg p-4 border">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Önceki Değişim Kayıtları</h4>
            {actionMessage && (
              <div className="mb-2 text-sm text-blue-700">{actionMessage}</div>
            )}

            {loadingReplacements ? (
              <div className="text-sm text-gray-500">Yükleniyor...</div>
            ) : replacementsList.length === 0 ? (
              <div className="text-sm text-gray-500">Bu hasta için değişim kaydı yok.</div>
            ) : (
              <ul className="space-y-3">
                {replacementsList.map((rep) => (
                  <li key={rep.id} className="p-2 border rounded">
                    <div className="flex items-start justify-between">
                      <div className="text-sm">
                        <div className="font-medium">{(rep.replacementReason || 'Değişim') as React.ReactNode}</div>
                        <div className="text-xs text-muted-foreground">
                          Eski: {(rep.old_device_info_parsed as any)?.brand || (rep.old_device_info as any)?.brand || rep.old_device_info as any} {(rep.old_device_info_parsed as any)?.model || (rep.old_device_info as any)?.model || ''}
                          {' '}• Yeni: {(rep.new_device_info_parsed as any)?.brand || (rep.new_device_info as any)?.brand || rep.new_device_info as any} {(rep.new_device_info_parsed as any)?.model || (rep.new_device_info as any)?.model || ''}
                        </div>
                        <div className="text-xs text-muted-foreground">Durum: {rep.status}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {renderInvoiceActions(rep)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              {isSubmitting ? 'Değiştiriliyor...' : 'Değiştir'}
            </Button>
          </div>
        </form>
      </Modal>

      <InvoicePreviewModal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} invoice={previewInvoice} onError={(err) => setActionMessage(err)} />
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => { setShowInvoiceModal(false); setInvoiceInitialData(undefined); setCurrentReplacementForInvoice(null); }}
        initialData={invoiceInitialData}
        mode={invoiceModalMode}
        enableIncomingSelection={true}
        partyId={partyId}
        deviceId={invoiceDeviceId || undefined}
        onSuccess={(inv) => {
          if (invoiceModalMode === 'create' || invoiceModalMode === 'quick') {
            handleInvoiceCreatedAndLinked(inv, currentReplacementForInvoice || undefined);
          } else {
            showSuccess('Fatura güncellendi');
            refetchReplacements();
            setShowInvoiceModal(false);
            setInvoiceInitialData(undefined);
            setCurrentReplacementForInvoice(null);
          }
        }}
        onError={(err) => { setActionMessage(typeof err === 'string' ? err : 'Bir hata oluştu'); showError(typeof err === 'string' ? err : 'Bir hata oluştu'); }}
      />

    </>
  );
};
