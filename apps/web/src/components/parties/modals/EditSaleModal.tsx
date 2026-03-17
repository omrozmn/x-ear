import React, { useState } from 'react';
import {
  Button,
  Alert,
  Loading,
  Modal,
  Select,
  Textarea,
  Input
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
    calculatedPricing,
    batterySgkSettings,
    batteryReportQuantity,
    updateFormData,
    updateState,
    submitForm,
    resetForm,
    setBatteryReportQuantity,
  } = useEditSale(sale, isOpen);

  const isSgkBattery = formData.category === 'hearing_aid_battery' || formData.category === 'implant_battery';

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
    console.log('[EditSaleModal] handleSubmit called');
    e.preventDefault();
    e.stopPropagation();
    console.log('[EditSaleModal] Calling submitForm...');
    await submitForm(onSaleUpdate);
    console.log('[EditSaleModal] submitForm completed');
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
          <span>{typeof state.error === 'string' ? state.error : JSON.stringify(state.error)}</span>
        </Alert>
      )}

      {state.success && (
        <Alert variant="success" className="mb-4">
          <CheckCircle className="w-4 h-4 text-success" />
          <span className="text-success">Satış başarıyla güncellendi!</span>
        </Alert>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-border mb-6">
        <nav className="-mb-px flex space-x-8">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('details')}
            className={`
              !py-4 !px-1 border-b-2 font-medium text-sm flex items-center gap-2 rounded-none !bg-transparent h-auto
              ${activeTab === 'details'
                ? 'border-blue-500 text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }
            `}
          >
            <FileText className="w-4 h-4" />
            Satış Detayları
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('payments')}
            className={`
              !py-4 !px-1 border-b-2 font-medium text-sm flex items-center gap-2 rounded-none !bg-transparent h-auto
              ${activeTab === 'payments'
                ? 'border-blue-500 text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }
            `}
          >
            <CreditCard className="w-4 h-4" />
            Ödeme Takibi
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('notes')}
            className={`
              !py-4 !px-1 border-b-2 font-medium text-sm flex items-center gap-2 rounded-none !bg-transparent h-auto
              ${activeTab === 'notes'
                ? 'border-blue-500 text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }
            `}
          >
            <FileSignature className="w-4 h-4" />
            Senetler
          </Button>
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
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200 shadow-sm">
                <h4 className="font-semibold text-foreground mb-4 flex items-center text-lg">
                  <CreditCard className="w-5 h-5 mr-2 text-primary" />
                  Fiyat ve Ödeme Özeti
                </h4>

                {/* Price Information */}
                <div className="space-y-3 mb-4 pb-4 border-b border-blue-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Liste Fiyatı (birim)</label>
                      <Input
                        type="number"
                        value={formData.listPrice === 0 ? '' : formData.listPrice}
                        onChange={(e) => updateFormData({ listPrice: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        step="0.01"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">İndirim Türü</label>
                      <Select
                        value={formData.discountType || 'amount'}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateFormData({ discountType: e.target.value as 'none' | 'percentage' | 'amount' })}
                        options={[
                          { value: 'none', label: 'İndirim Yok' },
                          { value: 'percentage', label: 'Yüzde (%)' },
                          { value: 'amount', label: 'Tutar (₺)' }
                        ]}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Toplam Liste Fiyatı</label>
                      <div className="w-full px-2 py-1.5 text-sm border border-border rounded bg-muted text-foreground">
                        {formData.listPrice > 0 ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
                          formData.ear === 'both' ? formData.listPrice * 2 : formData.listPrice
                        ) : '₺0,00'}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">İndirim Değeri</label>
                      <Input
                        type="number"
                        value={formData.discountValue === 0 ? '' : formData.discountValue}
                        onChange={(e) => updateFormData({ discountValue: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        step="0.01"
                        disabled={formData.discountType === 'none'}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">SGK Destek Türü</label>
                      <Select
                        value={formData.sgkScheme || ''}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
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
                        options={[
                          { value: '', label: 'SGK Desteği Yok' },
                          { value: 'under4_parent_working', label: '4 Yaş Altı (Veli Çalışan)' },
                          { value: 'under4_parent_retired', label: '4 Yaş Altı (Veli Emekli)' },
                          { value: 'age5_12_parent_working', label: '5-12 Yaş (Veli Çalışan)' },
                          { value: 'age5_12_parent_retired', label: '5-12 Yaş (Veli Emekli)' },
                          { value: 'age13_18_parent_working', label: '13-18 Yaş (Veli Çalışan)' },
                          { value: 'age13_18_parent_retired', label: '13-18 Yaş (Veli Emekli)' },
                          { value: 'over18_working', label: '18+ Yaş (Çalışan)' },
                          { value: 'over18_retired', label: '18+ Yaş (Emekli)' },
                          { value: 'under18', label: 'Genel (18 Yaş Altı)' },
                          { value: 'standard', label: 'Standart' }
                        ]}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Ön Ödeme</label>
                      <Input
                        type="number"
                        value={formData.downPayment === 0 ? '' : formData.downPayment}
                        onChange={(e) => updateFormData({ downPayment: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        step="0.01"
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Battery SGK Report Quantity Selection */}
                  {isSgkBattery && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Rapor Adet Kapsamı</label>
                        <Select
                          value={batteryReportQuantity}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBatteryReportQuantity(e.target.value as 'per_ear' | 'bilateral')}
                          options={(() => {
                            const schemeKey = formData.category === 'hearing_aid_battery' ? 'hearing_aid_battery' : 'implant_battery';
                            const scheme = batterySgkSettings[schemeKey];
                            const qtyPerEar = scheme?.quantity_per_ear || (formData.category === 'hearing_aid_battery' ? 104 : 360);
                            return [
                              { value: 'per_ear', label: `Tek Kulak (${qtyPerEar} adet)` },
                              { value: 'bilateral', label: `Bilateral (${qtyPerEar * 2} adet)` },
                            ];
                          })()}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">SGK Pil Tutarı</label>
                        <div className="w-full px-2 py-1.5 text-sm border border-border rounded bg-success/10 text-success">
                          {(() => {
                            const schemeKey = formData.category === 'hearing_aid_battery' ? 'hearing_aid_battery' : 'implant_battery';
                            const scheme = batterySgkSettings[schemeKey];
                            if (!scheme) return '₺0';
                            const amtWithKdv = scheme.coverage_amount * (1 + scheme.kdv_rate / 100);
                            const mul = batteryReportQuantity === 'bilateral' ? 2 : 1;
                            return `₺${(amtWithKdv * mul).toFixed(2)}`;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SGK Desteği field removed - will be shown in calculation breakdown */}
                </div>

                {/* Payment Summary */}
                <div className="space-y-2">
                  {/* Price Calculation Breakdown */}
                  <div className="mb-3 px-2 py-2 bg-primary/10 rounded text-[11px] space-y-0.5">
                    {/* List Price */}
                    {formData.listPrice > 0 && (
                      <div className="flex justify-between text-foreground">
                        <span>
                          Liste Fiyatı (birim)
                          {(sale as any).kdvRate != null && <span className="text-muted-foreground ml-1">(KDV %{(sale as any).kdvRate})</span>}
                          :
                        </span>
                        <span className="font-medium">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(formData.listPrice)}
                          {formData.ear === 'both' && <span className="text-primary ml-1">x2</span>}
                        </span>
                      </div>
                    )}

                    {/* SGK Deduction (shown before discount per correct calculation order) */}
                    {calculatedPricing.sgkReduction > 0 && !isSgkBattery && (
                      <div className="flex justify-between text-foreground">
                        <span>SGK Desteği:</span>
                        <span className="font-medium text-success">
                          -{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(calculatedPricing.sgkReduction)}
                        </span>
                      </div>
                    )}
                    {/* Battery SGK Deduction */}
                    {(calculatedPricing.batterySgkAmount ?? 0) > 0 && (
                      <div className="flex justify-between text-foreground">
                        <span>SGK Pil Rapor Düşümü:</span>
                        <span className="font-medium text-success">
                          -{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(calculatedPricing.batterySgkAmount ?? 0)}
                        </span>
                      </div>
                    )}

                    {/* Discount */}
                    {formData.discountValue > 0 && formData.discountType !== 'none' && (
                      <div className="flex justify-between text-foreground">
                        <span>İndirim {formData.discountType === 'percentage' ? `(%${formData.discountValue})` : ''}:</span>
                        <span className="font-medium text-destructive">
                          -{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
                            formData.discountType === 'percentage'
                              ? (formData.listPrice - (calculatedPricing.sgkReduction / (formData.ear === 'both' ? 2 : 1))) * (formData.ear === 'both' ? 2 : 1) * (formData.discountValue / 100)
                              : formData.discountValue
                          )}
                        </span>
                      </div>
                    )}

                    {/* KDV Amount (only shown when there's a KDV amount) */}
                    {(sale as any).kdvAmount != null && (sale as any).kdvAmount > 0 && (
                      <div className="flex justify-between text-muted-foreground pt-1 border-t border-blue-200">
                        <span>KDV (%{(sale as any).kdvRate || 20}):</span>
                        <span className="font-medium">
                          +{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format((sale as any).kdvAmount || 0)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-foreground font-medium">Toplam Tutar:</span>
                    <span className="text-lg font-bold text-foreground">
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(calculatedPricing.totalAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-foreground font-medium">Ödenen:</span>
                    <span className="text-lg font-bold text-success">
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(sale.paidAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                    <span className="text-sm text-foreground font-medium">Kalan:</span>
                    <span className={`text-lg font-bold ${calculatedPricing.totalAmount - (sale.paidAmount || 0) > 0 ? 'text-destructive' : 'text-success'}`}>
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Math.max(0, calculatedPricing.totalAmount - (sale.paidAmount || 0)))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes Field - Below Price Summary */}
              <div className="bg-card p-4 rounded-2xl border border-border">
                <label className="text-sm font-medium text-foreground block mb-2">Notlar</label>
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
              <span className="text-sm text-muted-foreground">Durum:</span>
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
        <PaymentTrackingModal
          isOpen={true}
          onClose={() => { }}
          sale={sale}
          onPaymentUpdate={() => { }}
          embedded
        />
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