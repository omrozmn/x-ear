import React, { useState, useEffect } from 'react';
import {
  Button,
  Textarea,
  Alert,
  Spinner
} from '@x-ear/ui-web';
import { X, FileText, Edit, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { Party, Sale } from '../../../types/party';

interface SaleNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party;
  sale: Sale;
  onNoteSave: (saleId: string, note: string) => void;
  loading?: boolean;
}

export const SaleNoteModal: React.FC<SaleNoteModalProps> = ({
  isOpen,
  onClose,
  party,
  sale,
  // onNoteSave, // Not used - internal simulated save
  // loading = false  // Using internal isLoading state
}) => {
  const [noteText, setNoteText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sale) {
      setNoteText(sale.notes || '');
      setHasChanges(false);
      setErrors({});
    }
  }, [isOpen, sale]);

  // Early return after all hooks to prevent hooks order change
  if (!isOpen || !sale) return null;

  const handleNoteChange = (value: string) => {
    setNoteText(value);
    setHasChanges(value !== (sale.notes || ''));

    // Clear errors when user starts typing
    if (errors.note) {
      setErrors(prev => ({ ...prev, note: '' }));
    }
  };

  /* validateNote function not called directly - inline validation in handleSubmit
  const validateNote = () => {
    const newErrors: Record<string, string> = {};

    if (noteText.length > 1000) {
      newErrors.note = 'Not 1000 karakterden uzun olamaz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;

    setError(null);
    setSuccess(null);

    // Validation
    if (noteText.trim().length > 1000) {
      setError('Not 1000 karakterden uzun olamaz');
      return;
    }

    if (noteText.trim() === (sale.notes || '').trim()) {
      setError('Herhangi bir değişiklik yapılmadı');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      const updatedSale = {
        ...sale,
        notes: noteText.trim(),
        updatedAt: new Date().toISOString()
      };

      console.log('Sale note updated:', updatedSale);

      setSuccess('Satış notu başarıyla güncellendi');

      // Close modal after successful update
      setTimeout(() => {
        setError(null);
        setSuccess(null);
        onClose();
      }, 2000);

    } catch (err) {
      setError('Not güncellenirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-700 bg-gray-100';
      case 'confirmed': return 'text-blue-700 bg-blue-100';
      case 'paid': return 'text-green-700 bg-green-100';
      case 'cancelled': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Taslak';
      case 'confirmed': return 'Onaylandı';
      case 'paid': return 'Ödenmiş';
      case 'cancelled': return 'İptal Edilmiş';
      default: return status;
    }
  };

  // Quick note templates
  const quickNotes = [
    'Müşteri memnun kaldı',
    'Garanti süresi açıklandı',
    'Kullanım talimatları verildi',
    'Kontrol randevusu planlandı',
    'Ek aksesuar önerildi',
    'Özel indirim uygulandı',
    'Taksit planı açıklandı',
    'SGK işlemleri tamamlandı'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Edit className="w-5 h-5 mr-2" />
            Satış Notu Düzenle
          </h3>
          <Button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Success Alert */}
        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div className="text-green-800">{success}</div>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <div className="text-red-800">{error}</div>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Sale Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Müşteri Bilgileri</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Ad Soyad:</span> {party?.firstName || 'Belirtilmemiş'} {party?.lastName || 'Belirtilmemiş'}</div>
                  <div><span className="font-medium">TC No:</span> {party?.tcNumber || 'Belirtilmemiş'}</div>
                  <div><span className="font-medium">Telefon:</span> {party?.phone || 'Belirtilmemiş'}</div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Satış Bilgileri</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Satış ID:</span> {sale.id}</div>
                  <div><span className="font-medium">Tutar:</span> {formatCurrency(sale.totalAmount)}</div>
                  <div><span className="font-medium">Tarih:</span> {sale.saleDate ? formatDate(sale.saleDate) : 'Belirtilmemiş'}</div>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">Durum:</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sale.status || '')}`}>
                      {getStatusLabel(sale.status || '')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note Editor */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Satış Notu
              </h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Not İçeriği
                </label>
                <Textarea
                  value={noteText}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  placeholder="Satış ile ilgili notlar, özel durumlar, müşteri talepleri..."
                  rows={6}
                  className={`resize-none ${errors.note ? 'border-red-500' : ''}`}
                />

                <div className="flex justify-between items-center mt-1">
                  <div className="text-xs text-gray-500">
                    {noteText.length}/1000 karakter
                  </div>
                  {errors.note && (
                    <div className="flex items-center text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.note}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Notes */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-3">Hızlı Notlar</h5>
                <div className="grid grid-cols-2 gap-2">
                  {quickNotes.map((quickNote) => (
                    <button data-allow-raw="true"
                      key={quickNote}
                      type="button"
                      onClick={() => {
                        const currentNote = noteText.trim();
                        const newNote = currentNote
                          ? `${currentNote}\n• ${quickNote}`
                          : `• ${quickNote}`;
                        handleNoteChange(newNote);
                      }}
                      className="text-left p-2 text-sm border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                    >
                      + {quickNote}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note History */}
              {sale.notes && sale.notes !== noteText && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">Mevcut Not</h5>
                  <div className="text-sm text-gray-700 bg-white p-3 rounded border">
                    {sale.notes}
                  </div>
                </div>
              )}

              {/* Change Indicator */}
              {hasChanges && (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                  <div className="flex items-center text-orange-800">
                    <Save className="w-4 h-4 mr-2" />
                    <span className="font-medium">Kaydedilmemiş değişiklikler var</span>
                  </div>
                  <p className="text-sm text-orange-700 mt-1">
                    Değişikliklerinizi kaydetmek için "Notu Kaydet" butonuna tıklayın.
                  </p>
                </div>
              )}
            </div>

            {/* Metadata */}
            {(sale.createdAt || sale.updatedAt) && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">Kayıt Bilgileri</h5>
                <div className="text-sm text-gray-600 space-y-1">
                  {sale.createdAt && (
                    <div>
                      <span className="font-medium">Oluşturulma:</span> {new Date(sale.createdAt).toLocaleString('tr-TR')}
                    </div>
                  )}
                  {sale.updatedAt && (
                    <div>
                      <span className="font-medium">Son Güncelleme:</span> {new Date(sale.updatedAt).toLocaleString('tr-TR')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <Button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              disabled={isLoading}
            >
              İptal
            </Button>
            <Button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
              disabled={isLoading || noteText.trim().length === 0 || noteText.trim() === (sale?.notes || '').trim()}
            >
              {isLoading ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Notu Kaydet
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaleNoteModal;