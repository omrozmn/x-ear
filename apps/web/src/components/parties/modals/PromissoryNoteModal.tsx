import React, { useState, useEffect } from 'react';
import { Button, Input, Textarea, Alert, AlertDescription, Loading } from '@x-ear/ui-web';
import { X, FileText, User, Building, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { Party } from '../../../types/party';
// import { Sale } from '../../../types/party/party-communication.types';
import { SaleRead } from '@/api/generated/schemas';

interface PromissoryNote {
  id?: string;
  saleId: string;
  partyId: string;
  noteNumber: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  interestRate?: number;
  guarantorName?: string;
  guarantorTcNumber?: string;
  guarantorPhone?: string;
  guarantorAddress?: string;
  notes?: string;
  status: 'active' | 'paid' | 'overdue' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
}

interface PromissoryNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party;
  sale?: SaleRead;
  promissoryNote?: PromissoryNote; // For editing existing notes
  onSave: (noteData: any) => void;
  loading?: boolean;
  mode?: 'create' | 'edit' | 'view';
}

export const PromissoryNoteModal: React.FC<PromissoryNoteModalProps> = ({
  isOpen,
  onClose,
  party,
  sale,
  promissoryNote,
  onSave: _onSave,
  loading = false,
  mode = 'create'
}) => {
  const [formData, setFormData] = useState<Partial<PromissoryNote>>({
    saleId: sale?.id || '',
    partyId: party.id,
    noteNumber: '',
    amount: sale?.totalAmount || 0,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    interestRate: 0,
    guarantorName: '',
    guarantorTcNumber: '',
    guarantorPhone: '',
    guarantorAddress: '',
    notes: '',
    status: 'active'
  });

  const [hasGuarantor, setHasGuarantor] = useState(false);
  const [calculateInterest, setCalculateInterest] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (promissoryNote && mode !== 'create') {
      setFormData(promissoryNote);
      setHasGuarantor(!!promissoryNote.guarantorName);
      setCalculateInterest(!!promissoryNote.interestRate && promissoryNote.interestRate > 0);
    } else if (mode === 'create') {
      // Generate note number
      const noteNumber = `SN-${Date.now().toString().slice(-6)}`;
      setFormData(prev => ({ ...prev, noteNumber }));
    }
  }, [promissoryNote, mode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.noteNumber?.trim()) {
      setError('Senet numarası gereklidir');
      return;
    }

    if (!formData.issueDate) {
      setError('Düzenleme tarihi gereklidir');
      return;
    }

    if (!formData.dueDate) {
      setError('Vade tarihi gereklidir');
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      setError('Geçerli bir tutar giriniz');
      return;
    }

    if (new Date(formData.dueDate) <= new Date(formData.issueDate)) {
      setError('Vade tarihi düzenleme tarihinden sonra olmalıdır');
      return;
    }

    if (calculateInterest && (!formData.interestRate || formData.interestRate < 0)) {
      setError('Geçerli bir faiz oranı giriniz');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      const noteData = {
        ...formData,
        noteNumber: formData.noteNumber?.trim(),
        interestRate: calculateInterest ? formData.interestRate : 0,
        guarantorName: hasGuarantor ? formData.guarantorName : '',
        guarantorTcNumber: hasGuarantor ? formData.guarantorTcNumber : '',
        guarantorPhone: hasGuarantor ? formData.guarantorPhone : '',
        guarantorAddress: hasGuarantor ? formData.guarantorAddress : '',
        notes: formData.notes?.trim(),
        ...(mode === 'create' && { createdAt: new Date().toISOString() }),
        ...(mode === 'edit' && { updatedAt: new Date().toISOString() })
      };

      console.log('Promissory note saved:', noteData);

      setSuccess(mode === 'edit' ? 'Senet başarıyla güncellendi' : 'Senet başarıyla oluşturuldu');

      // Reset form after successful submission
      setTimeout(() => {
        if (mode === 'create') {
          // Only reset if creating new note
          setFormData({
            saleId: sale?.id || '',
            partyId: party.id,
            noteNumber: '',
            amount: sale?.totalAmount || 0,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: '',
            interestRate: 0,
            guarantorName: '',
            guarantorTcNumber: '',
            guarantorPhone: '',
            guarantorAddress: '',
            notes: '',
            status: 'active'
          });
          setHasGuarantor(false);
          setCalculateInterest(false);
        }
        setError(null);
        setSuccess(null);
        onClose();
      }, 2000);

    } catch (err) {
      setError('Senet kaydedilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof PromissoryNote, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateDaysUntilDue = () => {
    if (!formData.dueDate) return 0;
    const today = new Date();
    const dueDate = new Date(formData.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateTotalWithInterest = () => {
    if (!calculateInterest || !formData.interestRate || !formData.amount) return formData.amount || 0;

    const daysUntilDue = calculateDaysUntilDue();
    if (daysUntilDue <= 0) return formData.amount;

    const dailyRate = (formData.interestRate / 100) / 365;
    const interestAmount = formData.amount * dailyRate * daysUntilDue;
    return formData.amount + interestAmount;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const isOverdue = formData.dueDate && new Date(formData.dueDate) < new Date();
  const daysUntilDue = calculateDaysUntilDue();
  const totalWithInterest = calculateTotalWithInterest();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            {mode === 'create' ? 'Yeni Senet Oluştur' : mode === 'edit' ? 'Senet Düzenle' : 'Senet Detayları'}
          </h3>
          <Button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {error && (
          <Alert className="mb-4 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Customer & Sale Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Müşteri Bilgileri
                </h4>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Ad Soyad:</span> {party.firstName} {party.lastName}</div>
                  <div><span className="font-medium">TC No:</span> {party.tcNumber}</div>
                  <div><span className="font-medium">Telefon:</span> {party.phone}</div>
                  <div><span className="font-medium">Adres:</span> {(() => {
                    const address = party.address;
                    if (typeof address === 'object' && address !== null) {
                      interface AddressObj { fullAddress?: string; district?: string; city?: string; }
                      const addressObj = address as AddressObj;
                      return addressObj.fullAddress ||
                        `${addressObj.district || ''} ${addressObj.city || ''}`.trim() ||
                        'Adres bilgisi yok';
                    }
                    return party.addressFull || (typeof address === 'string' ? address : '') || 'Adres bilgisi yok';
                  })()}</div>
                </div>
              </div>

              {sale && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <Building className="w-4 h-4 mr-2" />
                    Satış Bilgileri
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Satış ID:</span> {sale.id}</div>
                    <div><span className="font-medium">Satış Tarihi:</span> {sale.saleDate ? formatDate(sale.saleDate) : '-'}</div>
                    <div><span className="font-medium">Toplam Tutar:</span> {formatCurrency(sale.totalAmount || 0)}</div>
                    <div><span className="font-medium">Ödeme Yöntemi:</span> {sale.paymentMethod || '-'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Warning */}
            {mode !== 'create' && formData.status === 'overdue' && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-center text-red-800">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Bu senet vadesi geçmiştir!</span>
                </div>
              </div>
            )}

            {/* Note Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Senet Bilgileri
              </h4>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senet No *</label>
                  <Input
                    name="noteNumber"
                    value={formData.noteNumber}
                    onChange={(e) => handleInputChange('noteNumber', e.target.value)}
                    placeholder="SN-XXXXXX"
                    required
                    disabled={mode === 'view'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Düzenleme Tarihi *</label>
                  <Input
                    name="issueDate"
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => handleInputChange('issueDate', e.target.value)}
                    required
                    disabled={mode === 'view'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vade Tarihi *</label>
                  <Input
                    name="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    required
                    disabled={mode === 'view'}
                  />
                  {daysUntilDue > 0 && (
                    <p className="text-xs text-gray-600 mt-1">{daysUntilDue} gün kaldı</p>
                  )}
                  {isOverdue && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{Math.abs(daysUntilDue)} gün gecikmiş</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senet Tutarı *</label>
                  <Input
                    name="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                    className="text-right font-medium"
                    required
                    disabled={mode === 'view'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                  {mode === 'view' ? (
                    <div className="px-3 py-2 bg-gray-100 rounded-md">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${formData.status === 'active' ? 'bg-green-100 text-green-800' :
                        formData.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                          formData.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {formData.status === 'active' ? 'Aktif' :
                          formData.status === 'paid' ? 'Ödenmiş' :
                            formData.status === 'overdue' ? 'Vadesi Geçmiş' :
                              'İptal Edilmiş'}
                      </span>
                    </div>
                  ) : (
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={mode === 'create'}
                    >
                      <option value="active">Aktif</option>
                      <option value="paid">Ödenmiş</option>
                      <option value="overdue">Vadesi Geçmiş</option>
                      <option value="cancelled">İptal Edilmiş</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Interest Calculation */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="calculateInterest"
                  checked={calculateInterest}
                  onChange={(e) => setCalculateInterest(e.target.checked)}
                  className="mr-3"
                  disabled={mode === 'view'}
                />
                <label htmlFor="calculateInterest" className="text-sm font-medium text-gray-700">
                  Faiz hesaplama uygula
                </label>
              </div>

              {calculateInterest && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yıllık Faiz Oranı (%)</label>
                    <Input
                      name="interestRate"
                      type="number"
                      step="0.01"
                      value={formData.interestRate}
                      onChange={(e) => handleInputChange('interestRate', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      disabled={mode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Faiz Tutarı</label>
                    <div className="px-3 py-2 bg-gray-100 rounded-md text-right font-medium">
                      {formatCurrency(totalWithInterest - (formData.amount || 0))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Toplam Tutar</label>
                    <div className="px-3 py-2 bg-blue-100 rounded-md text-right font-bold text-blue-800">
                      {formatCurrency(totalWithInterest)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Guarantor Information */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="hasGuarantor"
                  checked={hasGuarantor}
                  onChange={(e) => setHasGuarantor(e.target.checked)}
                  className="mr-3"
                  disabled={mode === 'view'}
                />
                <label htmlFor="hasGuarantor" className="text-sm font-medium text-gray-700">
                  Kefil bilgileri ekle
                </label>
              </div>

              {hasGuarantor && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kefil Adı Soyadı</label>
                      <Input
                        name="guarantorName"
                        value={formData.guarantorName}
                        onChange={(e) => handleInputChange('guarantorName', e.target.value)}
                        placeholder="Kefil adı soyadı"
                        disabled={mode === 'view'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kefil TC No</label>
                      <Input
                        name="guarantorTcNumber"
                        value={formData.guarantorTcNumber}
                        onChange={(e) => handleInputChange('guarantorTcNumber', e.target.value)}
                        placeholder="TC Kimlik No"
                        maxLength={11}
                        disabled={mode === 'view'}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kefil Telefon</label>
                      <Input
                        name="guarantorPhone"
                        value={formData.guarantorPhone}
                        onChange={(e) => handleInputChange('guarantorPhone', e.target.value)}
                        placeholder="Telefon numarası"
                        disabled={mode === 'view'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kefil Adresi</label>
                      <Input
                        name="guarantorAddress"
                        value={formData.guarantorAddress}
                        onChange={(e) => handleInputChange('guarantorAddress', e.target.value)}
                        placeholder="Adres bilgisi"
                        disabled={mode === 'view'}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Senet ile ilgili notlar..."
                rows={3}
                disabled={mode === 'view'}
              />
            </div>

            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Özet</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Ana Para:</span> {formatCurrency(formData.amount || 0)}
                </div>
                {calculateInterest && (
                  <div>
                    <span className="font-medium">Faiz Tutarı:</span> {formatCurrency(totalWithInterest - (formData.amount || 0))}
                  </div>
                )}
                <div className="col-span-2 pt-2 border-t">
                  <span className="font-bold text-lg">Toplam Ödenecek Tutar: {formatCurrency(totalWithInterest)}</span>
                </div>
              </div>
            </div>
          </div>

          {mode !== 'view' && (
            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
              <Button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
                disabled={loading || isLoading}
              >
                {(loading || isLoading) && <Loading className="w-4 h-4 mr-2" />}
                {(loading || isLoading) ? 'Kaydediliyor...' : mode === 'create' ? 'Senet Oluştur' : 'Değişiklikleri Kaydet'}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default PromissoryNoteModal;