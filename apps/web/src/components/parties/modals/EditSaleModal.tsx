import React, { useState } from 'react';
import {
  Button,
  Alert,
  Loading,
  Modal,
  Select,
  Textarea
} from '@x-ear/ui-web';
import { CheckCircle, AlertCircle, FileText, CreditCard, FileSignature } from 'lucide-react';
import { useEditSale } from './edit-sale-modal/hooks/useEditSale';
import { SaleFormFields, type InventoryItem } from './edit-sale-modal/components/SaleFormFields';
import { PromissoryNotesTab } from '../../payments/PromissoryNotesTab';
import PaymentTrackingModal from '../../payments/PaymentTrackingModal';
import { useListSalePromissoryNotes } from '@/api/client/payments.client';
import type { EditSaleModalProps } from './edit-sale-modal/types';

type TabType = 'details' | 'payments' | 'notes';

export const EditSaleModal: React.FC<EditSaleModalProps> = ({
  isOpen,
  onClose,
  sale,
  onSaleUpdate,
  loading = false,
  initialTab = 'details' // Add initialTab prop with default value
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  const {
    formData,
    state,
    availableDevices,
    updateFormData,
    updateState,
    submitForm,
    resetForm
  } = useEditSale(sale, isOpen);

  // Fetch promissory notes for the notes tab
  const { data: promissoryNotesData, isLoading: notesLoading } = useListSalePromissoryNotes(
    sale.id || '',
    {
      query: {
        enabled: isOpen && !!sale.id && activeTab === 'notes'
      }
    }
  );

  if (!isOpen) return null;

  const handleDeviceSelect = (device: InventoryItem) => {
    updateFormData({
      deviceId: device.id || '',
      productName: device.name,
      brand: device.brand,
      model: device.model || '',
      listPrice: device.price,
      salePrice: device.price
    });
    updateState({ showDeviceSelector: false });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await submitForm(onSaleUpdate);
  };

  const handleClose = () => {
    resetForm();
    setActiveTab('details');
    onClose();
  };

  // Get assignment UID - prefer from devices array
  // Note: For bilateral sales, there may be multiple assignments
  const assignmentUids = sale.devices?.map(d => d.assignmentUid).filter(Boolean) || [];
  const displayAssignmentId = assignmentUids.length > 0 
    ? assignmentUids.join(', ')
    : '';

  const promissoryNotes = promissoryNotesData?.data || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Satış Düzenle - Satış ID: ${sale.id}${displayAssignmentId ? ` | Atama ID: ${displayAssignmentId}` : ''}`}
      size="xl"
      showFooter={false}
      className="z-[100]"
    >
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loading />
        </div>
      )}

      {state.error && (
        <Alert variant="error" className="mb-4">
          <AlertCircle className="w-4 h-4" />
          <span>{state.error}</span>
        </Alert>
      )}

      {state.success && (
        <Alert variant="success" className="mb-4">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-green-800">Satış başarıyla güncellendi!</span>
        </Alert>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <FileText className="w-4 h-4" />
            Satış Detayları
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'payments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <CreditCard className="w-4 h-4" />
            Ödeme Takibi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'notes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <FileSignature className="w-4 h-4" />
            Senetler
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form Fields */}
            <div className="lg:col-span-2">
              <SaleFormFields
                formData={formData}
                state={state}
                availableDevices={availableDevices}
                onFormDataChange={updateFormData}
                onStateChange={updateState}
                onDeviceSelect={handleDeviceSelect}
              />
            </div>

            {/* Right Column - Payment Summary with Price Info */}
            <div className="space-y-6">
              {/* Combined Payment & Price Summary Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200 shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center text-lg">
                  <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                  Fiyat ve Ödeme Özeti
                </h4>

                {/* Price Information */}
                <div className="space-y-3 mb-4 pb-4 border-b border-blue-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Liste Fiyatı</label>
                      <input
                        type="number"
                        value={formData.listPrice === 0 ? '' : formData.listPrice}
                        onChange={(e) => updateFormData({ listPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">İndirim</label>
                      <input
                        type="number"
                        value={formData.discountAmount === 0 ? '' : formData.discountAmount}
                        onChange={(e) => updateFormData({ discountAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Satış Fiyatı</label>
                      <input
                        type="number"
                        value={formData.salePrice === 0 ? '' : formData.salePrice}
                        onChange={(e) => updateFormData({ salePrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">SGK Destek Türü</label>
                      <select data-allow-raw="true"
                        value={formData.sgkScheme || ''}
                        onChange={(e) => {
                          const scheme = e.target.value;
                          updateFormData({ sgkScheme: scheme });
                          // Auto-calculate SGK coverage based on scheme (from settings/fallback)
                          const sgkAmounts: Record<string, number> = {
                            'no_coverage': 0,
                            'under4_parent_working': 6104.44,
                            'under4_parent_retired': 7630.56,
                            'age5_12_parent_working': 5426.17,
                            'age5_12_parent_retired': 6782.72,
                            'age13_18_parent_working': 5087.04,
                            'age13_18_parent_retired': 6358.88,
                            'over18_working': 3391.36,
                            'over18_retired': 4239.20,
                            'under18': 5000,
                            'standard': 0
                          };
                          const amount = sgkAmounts[scheme] || 0;
                          updateFormData({ sgkCoverage: amount });
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">SGK Desteği Yok</option>
                        <option value="under4_parent_working">4 Yaş Altı (Veli Çalışan)</option>
                        <option value="under4_parent_retired">4 Yaş Altı (Veli Emekli)</option>
                        <option value="age5_12_parent_working">5-12 Yaş (Veli Çalışan)</option>
                        <option value="age5_12_parent_retired">5-12 Yaş (Veli Emekli)</option>
                        <option value="age13_18_parent_working">13-18 Yaş (Veli Çalışan)</option>
                        <option value="age13_18_parent_retired">13-18 Yaş (Veli Emekli)</option>
                        <option value="over18_working">18+ Yaş (Çalışan)</option>
                        <option value="over18_retired">18+ Yaş (Emekli)</option>
                        <option value="under18">Genel (18 Yaş Altı)</option>
                        <option value="standard">Standart</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">SGK Desteği (₺)</label>
                      <input
                        type="number"
                        value={formData.sgkCoverage === 0 ? '' : formData.sgkCoverage}
                        onChange={(e) => updateFormData({ sgkCoverage: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                        placeholder="0.00"
                        step="0.01"
                        readOnly
                      />
                    </div>
                    <div className="invisible"></div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Peşin Ödeme</label>
                    <input
                      type="number"
                      value={formData.downPayment === 0 ? '' : formData.downPayment}
                      onChange={(e) => updateFormData({ downPayment: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Toplam Tutar (KDV Dahil %{sale.kdvRate || 20})</label>
                    <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50 font-semibold text-gray-900">
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(sale.totalAmount || 0)}
                    </div>
                    {sale.kdvAmount != null && sale.kdvAmount > 0 && (
                      <div className="text-[10px] text-gray-500 mt-0.5 px-2">
                        KDV Tutarı: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(sale.kdvAmount || 0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 font-medium">Toplam Tutar:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(sale.totalAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 font-medium">Ödenen:</span>
                    <span className="text-lg font-bold text-green-600">
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(sale.paidAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                    <span className="text-sm text-gray-700 font-medium">Kalan:</span>
                    <span className={`text-lg font-bold ${(sale.totalAmount || 0) - (sale.paidAmount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format((sale.totalAmount || 0) - (sale.paidAmount || 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes Field - Below Price Summary */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label className="text-sm font-medium text-gray-700 block mb-2">Notlar</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => updateFormData({ notes: e.target.value })}
                  placeholder="Satış ile ilgili notlar..."
                  rows={4}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Durum:</span>
              <Select
                value={state.saleStatus}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateState({ saleStatus: e.target.value })}
                options={[
                  { value: 'ordered', label: 'Sipariş Edildi' },
                  { value: 'waiting_report', label: 'Rapor Bekleniyor' },
                  { value: 'delivered', label: 'Teslim Edildi' },
                  { value: 'completed', label: 'Tamamlandı' },
                  { value: 'cancelled', label: 'İptal' }
                ]}
                className="w-40"
              />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                İptal
              </Button>
              <Button
                type="submit"
                disabled={state.isSubmitting}
                className="min-w-[120px]"
              >
                {state.isSubmitting ? <Loading /> : 'Güncelle'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'payments' && (
        <div className="w-full">
          {/* Override modal styles to make it full width and hide close button */}
          <style>{`
            .payment-tracking-wrapper .fixed {
              position: relative !important;
            }
            .payment-tracking-wrapper .inset-0 {
              inset: unset !important;
            }
            .payment-tracking-wrapper .bg-black {
              background: transparent !important;
            }
            .payment-tracking-wrapper .bg-opacity-50 {
              background: transparent !important;
            }
            .payment-tracking-wrapper .max-w-4xl {
              max-width: 100% !important;
            }
            .payment-tracking-wrapper .z-50 {
              z-index: 0 !important;
            }
            .payment-tracking-wrapper .z-\\[9999\\] {
              z-index: 0 !important;
            }
            /* Hide all close buttons */
            .payment-tracking-wrapper button[aria-label="Close"],
            .payment-tracking-wrapper button[aria-label="close"],
            .payment-tracking-wrapper .absolute.right-4.top-4,
            .payment-tracking-wrapper .absolute.top-4.right-4,
            .payment-tracking-wrapper button.absolute.right-4,
            .payment-tracking-wrapper button.absolute.top-4 {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              pointer-events: none !important;
            }
            /* Hide X icon specifically */
            .payment-tracking-wrapper svg[class*="lucide-x"],
            .payment-tracking-wrapper svg[class*="X"] {
              display: none !important;
            }
            /* Remove any backdrop */
            .payment-tracking-wrapper > div:first-child {
              background: transparent !important;
            }
            /* Hide internal tabs (Ödemeler, Senetler) */
            .payment-tracking-wrapper [role="tablist"],
            .payment-tracking-wrapper .flex.border-b,
            .payment-tracking-wrapper .flex.gap-4.border-b {
              display: none !important;
            }
            /* Show only payment history content */
            .payment-tracking-wrapper [role="tabpanel"] {
              display: block !important;
            }
          `}</style>
          <div className="payment-tracking-wrapper">
            <PaymentTrackingModal
              isOpen={true}
              onClose={() => {}}
              sale={sale}
              onPaymentUpdate={() => {}}
            />
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div onClick={(e) => e.stopPropagation()}>
          <PromissoryNotesTab
            sale={sale}
            promissoryNotes={promissoryNotes}
            isLoading={notesLoading}
          />
        </div>
      )}
    </Modal>
  );
};

export default EditSaleModal;