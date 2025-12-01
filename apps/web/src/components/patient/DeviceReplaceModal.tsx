import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@x-ear/ui-web';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { InvoicePreviewModal } from '../../components/modals/InvoicePreviewModal';
import { InvoiceModal } from '../../components/modals/InvoiceModal';
import { invoiceService } from '../../services/invoice.service';
import { useToastHelpers } from '@x-ear/ui-web';
import { CheckCircle } from 'lucide-react';
import { ProductSearchInput } from '../cashflow/ProductSearchInput';
import { apiClient } from '../../api/client';
import { PatientDevice } from '../../types/patient';

interface InventoryItem {
  id: string;
  name?: string;
  brand?: string;
  model?: string;
  availableInventory?: number;
  availableSerials?: string[];
  category?: string;
  supplier?: string | null;
}

interface DeviceReplaceModalProps {
  device: PatientDevice;
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
  // newInventoryId and newDeviceInfo are optional; when provided backend will link replacement to requested new device
  onReplace: (deviceId: string, reason: string, notes: string, newInventoryId?: string, newDeviceInfo?: any, selectedSerial?: string) => Promise<void>;
}

export const DeviceReplaceModal: React.FC<DeviceReplaceModalProps> = ({
  device,
  patientId,
  isOpen,
  onClose,
  onReplace
}) => {
  const [reason, setReason] = useState('defective');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedInventory, setSelectedInventory] = useState<InventoryItem | null>(null);
  const [selectedSerial, setSelectedSerial] = useState<string | null>(null);
  const [replacements, setReplacements] = useState<any[]>([]);
  const [loadingReplacements, setLoadingReplacements] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceInitialData, setInvoiceInitialData] = useState<any | undefined>(undefined);
  const [invoiceModalMode, setInvoiceModalMode] = useState<'create' | 'edit' | 'quick'>('create');
  const [currentReplacementForInvoice, setCurrentReplacementForInvoice] = useState<string | null>(null);
  const [invoiceDeviceId, setInvoiceDeviceId] = useState<string | null>(null);
  const [sendLoadingMap, setSendLoadingMap] = useState<Record<string, boolean>>({});
  const { success: showSuccess, error: showError } = useToastHelpers();

  useEffect(() => {
    // Reset selection when modal opens
    if (!isOpen) {
      setResults([]);
      setSelectedInventory(null);
      setError(null);
      setIsSubmitting(false);
    }
    // When modal opens, load existing replacements for this patient
    if (isOpen) {
      (async () => {
        try {
          await refreshReplacements();
        } catch (e) {
          console.warn('Could not load replacements', e);
        }
      })();
    }
  }, [isOpen]);

  // Inventory search is handled by shared ProductSearchInput component

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
      // Keep the modal open after successful replace per UX requirement
      setActionMessage('Cihaz değişimi kaydedildi');
      showSuccess('Cihaz değişimi kaydedildi');
    } catch (err: any) {
      const msg = err.message || 'Cihaz değiştirilemedi';
      setError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshReplacements = async () => {
    try {
      setLoadingReplacements(true);
      try {
        const { status, data: j } = await apiClient.request<any>(`/patients/${patientId}/replacements`);
        if (status < 400) {
          const items = (j.data || []).map((rep: any) => {
            const normalize = (field: any) => {
              if (!field) return null;
              if (typeof field === 'string') {
                try { return JSON.parse(field); } catch (e) { return field; }
              }
              return field;
            };
            return {
              ...rep,
              old_device_info_parsed: normalize(rep.old_device_info || rep.oldDeviceInfo),
              new_device_info_parsed: normalize(rep.new_device_info || rep.newDeviceInfo),
            };
          });
          setReplacements(items);
        }
      } catch (e) {
        console.warn('Could not refresh replacements', e);
      }
    } catch (e) {
      console.warn('Could not refresh replacements', e);
    } finally {
      setLoadingReplacements(false);
    }
  };

  const handleCreateReturnInvoice = async (replacementId: string) => {
    // Instead of auto-creating on server, open invoice creation modal prefilled
    try {
      setActionMessage(null);
      // Prepare initial data for invoice modal
      const rep = replacements.find(r => r.id === replacementId) || {};
      const supplierName = rep.supplier || rep.new_device_info_parsed?.supplier || rep.new_device_info_parsed?.supplier_name || null;
      const initial: any = {
        invoiceType: '50', // İade
        invoice_details: {
          invoice_date: new Date().toISOString().split('T')[0],
          supplierInvoiceNumber: ''
        },
        customerName: supplierName || undefined,
        items: [
          {
            description: rep.old_device_info_parsed?.brand ? `${rep.old_device_info_parsed.brand} ${rep.old_device_info_parsed.model || ''}`.trim() : (rep.old_device_info_parsed || rep.old_device_info || 'Cihaz'),
            quantity: 1,
            unitPrice: rep.price_difference || 0,
            taxRate: 18
          }
        ],
        notes: `Değişim: ${rep.new_device_info_parsed?.brand || rep.new_device_info_parsed || ''}`
      };

      setInvoiceInitialData(initial);
      setCurrentReplacementForInvoice(replacementId);
      // try to infer device id from replacement if present
      setInvoiceDeviceId(rep.old_device_id || rep.oldDeviceId || rep.deviceId || device.id || null);
      // open quick invoice modal so user can edit all fields (pre-filled)
      setInvoiceModalMode('quick');
      // open modal on next tick to avoid the originating click event
      setTimeout(() => setShowInvoiceModal(true), 0);
      // keep replacementId in actionMessage so we can reference when invoice is created
      setActionMessage(`Yeni iade faturası için form açıldı (replacement ${replacementId})`);
    } catch (e: any) {
      const msg = e.message || 'Fatura oluşturma modalı açılamadı';
      setActionMessage(msg);
      showError(msg);
    }
  };

  const handleInvoiceCreatedAndLinked = async (createdInvoice: any, replacementId?: string) => {
    // After invoice is created client-side, link it to replacement on server
    try {
      // link with provided invoice id to server replacement
      const body = {
        invoiceId: createdInvoice.id,
        invoiceNumber: createdInvoice.invoiceNumber || createdInvoice.id,
        supplierInvoiceNumber: createdInvoice.supplierInvoiceNumber || createdInvoice.invoiceNumber
      };
      try {
        const { status, data: j } = await apiClient.request<any>(`/replacements/${replacementId}/invoice`, {
          method: 'POST',
          body: JSON.stringify(body)
        });
        if (status >= 400 || !j?.success) throw new Error(j?.error || 'Linkleme başarısız');
      } catch (e: any) {
        throw e;
      }
      showSuccess('İade faturası oluşturuldu ve kayda bağlandı');
      // refresh replacement list
      await refreshReplacements();
    } catch (err: any) {
      showError(err?.message || 'Fatura sunucuya bağlanamadı');
    } finally {
      setShowInvoiceModal(false);
      setInvoiceInitialData(undefined);
    }
  };

  const handleSendToGib = async (invoiceId: string) => {
    try {
      setActionMessage(null);
      try {
        const { status, data: j } = await apiClient.request<any>(`/return-invoices/${invoiceId}/send-to-gib`, {
          method: 'POST'
        });
        if (status >= 400 || !j?.success) throw new Error(j?.error || 'GİB gönderimi başarısız');
      } catch (e) {
        throw e;
      }
      setActionMessage('Fatura GİB outbox içine yazıldı ve işlem tamamlandı');
      showSuccess("Fatura GİB'e gönderildi");
      await refreshReplacements();
    } catch (e: any) {
      setActionMessage(e.message || 'GİB gönderimi başarısız');
      showError(e.message || 'GİB gönderimi başarısız');
    }
  };

  const renderInvoiceActions = (rep: any) => {
    const invoiceId = rep.return_invoice_id || rep.returnInvoiceId || rep.return_invoice?.id || rep.return_invoice_id;
    // determine status (gib_sent or similar)
    const invoiceStatus = rep.return_invoice?.status || rep.returnInvoiceStatus || rep.return_invoice_status || rep.returnInvoice?.status || (rep.gib_sent ? 'gib_sent' : undefined);

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
            } catch (err: any) {
              setActionMessage(err.message || 'Fatura yüklenemedi');
              showError(err.message || 'Fatura yüklenemedi');
            }
          }}>
            Fatura Önizle
          </Button>

          <Button type="button" size="sm" variant="ghost" className="px-3 py-1 text-sm" onClick={async () => {
            try {
              const inv = await invoiceService.getInvoice(invoiceId);
              if (!inv) throw new Error('Fatura bulunamadı');
              // Map invoice object to form initial data shape
              const mapped = {
                invoiceType: inv.type || 'corporate',
                invoice_details: {
                  invoice_date: inv.issueDate || new Date().toISOString().split('T')[0],
                  invoice_number: inv.invoiceNumber || inv.id,
                  notes: inv.notes || ''
                },
                items: (inv.items || []).map((it: any) => ({ description: it.description || it.name || '', quantity: it.quantity || 1, unitPrice: it.unitPrice || it.total || 0, taxRate: it.taxRate || 18 })),
                notes: inv.notes || '',
                id: inv.id
              };
              setInvoiceInitialData(mapped);
              setInvoiceModalMode('edit');
              // open on next tick to avoid click fallout
              setTimeout(() => setShowInvoiceModal(true), 0);
            } catch (err: any) {
              showError(err?.message || 'Fatura yüklenemedi');
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
        } catch (err: any) {
          showError(err?.message || 'Fatura oluşturulamadı');
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
          {/* Current Device Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Mevcut Cihaz</h4>
            <p className="text-sm text-gray-700">
              <strong>{device.brand} {device.model}</strong>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Seri No: {device.serialNumber || '-'}
            </p>
          </div>

          {/* Replacement Reason */}
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

          {/* Notes */}
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

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* New device selection */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Talep Edilen Yeni Cihaz (Tedarikten alınacak)</h4>
            <p className="text-xs text-gray-600 mb-2">Tedarikten temin etmek istediğiniz modeli seçin. Seri takip edilen ürünler için seri seçimi yapın.</p>
            <div className="mt-3">
              <ProductSearchInput
                className="w-full"
                selectedProduct={selectedInventory}
                onSelectProduct={(p) => { setSelectedInventory(p); }}
                showReplaceButton={true}
                onReplaceClick={async (item) => {
                  try {
                    setIsSubmitting(true);
                    setError(null);
                    await onReplace(device.id, reason, notes, item.id, item ? { id: item.id, brand: item.brand, model: item.model, supplier: item.supplier, category: item.category } : undefined);
                    showSuccess('Cihaz değişimi kaydedildi');
                    await refreshReplacements();
                  } catch (err: any) {
                    const msg = err?.message || 'Cihaz değiştirilemedi';
                    setError(msg);
                    showError(msg);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              />
            </div>

            {/* Show barcode and serial selector if available */}
            {selectedInventory && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                <div className="text-sm text-gray-700">Barkod: <strong>{(selectedInventory as any).barcode || (selectedInventory as any).sku || '-'}</strong></div>
                {((selectedInventory as any).availableSerials && (selectedInventory as any).availableSerials.length > 0) && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Seri No Seçimi (mevcut)</label>
                    <select value={selectedSerial || ''} onChange={(e) => setSelectedSerial(e.target.value)} className="w-full px-3 py-2 border rounded">
                      <option value="">-- Seri seçin --</option>
                      {((selectedInventory as any).availableSerials || []).map((s: string) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Removed serial selection — serial number is not known before procurement */}
          </div>

          {/* Previous replacements for this patient (allow invoice / GİB actions inline) */}
          <div className="bg-white rounded-lg p-4 border">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Önceki Değişim Kayıtları</h4>
            {actionMessage && (
              <div className="mb-2 text-sm text-blue-700">{actionMessage}</div>
            )}

            {loadingReplacements ? (
              <div className="text-sm text-gray-500">Yükleniyor...</div>
            ) : replacements.length === 0 ? (
              <div className="text-sm text-gray-500">Bu hasta için değişim kaydı yok.</div>
            ) : (
              <ul className="space-y-3">
                {replacements.map((rep) => (
                  <li key={rep.id} className="p-2 border rounded">
                    <div className="flex items-start justify-between">
                      <div className="text-sm">
                        <div className="font-medium">{rep.replacementReason || 'Değişim'}</div>
                        <div className="text-xs text-muted-foreground">
                          Eski: {rep.old_device_info_parsed?.brand || rep.old_device_info?.brand || rep.old_device_info} {rep.old_device_info_parsed?.model || rep.old_device_info?.model || ''}
                          {' '}• Yeni: {rep.new_device_info_parsed?.brand || rep.new_device_info?.brand || rep.new_device_info} {rep.new_device_info_parsed?.model || rep.new_device_info?.model || ''}
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

          {/* Actions */}
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

      {/* Invoice preview modal */}
      <InvoicePreviewModal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} invoice={previewInvoice} onError={(err) => setActionMessage(err)} />
      {/* Invoice creation modal (used to create full invoice and then link to replacement) */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => { setShowInvoiceModal(false); setInvoiceInitialData(undefined); setCurrentReplacementForInvoice(null); }}
        initialData={invoiceInitialData}
        mode={invoiceModalMode}
        enableIncomingSelection={true}
        patientId={patientId}
        deviceId={invoiceDeviceId || undefined}
        onSuccess={(inv) => {
            if (invoiceModalMode === 'create' || invoiceModalMode === 'quick') {
              handleInvoiceCreatedAndLinked(inv, currentReplacementForInvoice || undefined);
            } else {
            // edit: refresh replacements and close modal
            showSuccess('Fatura güncellendi');
            refreshReplacements();
            setShowInvoiceModal(false);
            setInvoiceInitialData(undefined);
            setCurrentReplacementForInvoice(null);
          }
        }}
        onError={(err) => { setActionMessage(err); showError(err); }}
      />
      
    </>
  );
};
