import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { Banknote, Calendar, DollarSign, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react';
import {listSalePromissoryNotes} from '@/api/client/sales.client';

interface PromissoryNote {
  id: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
  referenceNumber?: string;
  notes?: string;
}

interface PromissoryNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
  onCollectNote?: (noteId: string, amount: number, paymentMethod: string) => Promise<void>;
  onCreateNote?: (noteData: any) => Promise<void>;
}

export const PromissoryNotesModal: React.FC<PromissoryNotesModalProps> = ({
  isOpen,
  onClose,
  sale,
  onCollectNote,
  onCreateNote
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<PromissoryNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [collectingNoteId, setCollectingNoteId] = useState<string | null>(null);
  const [collectionData, setCollectionData] = useState({
    amount: 0,
    paymentMethod: 'cash'
  });

  useEffect(() => {
    if (isOpen && sale?.id) {
      fetchPromissoryNotes();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sale?.id]);

  const fetchPromissoryNotes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listSalePromissoryNotes(sale.id);
      // API response type is void, so we'll handle the actual data structure
      // Normalize response to always be an array of notes
      const payload = (response as any) ?? {};
      let notesArray: PromissoryNote[] = [];

      if (Array.isArray(payload)) {
        notesArray = payload as PromissoryNote[];
      } else if (Array.isArray(payload.data)) {
        notesArray = payload.data as PromissoryNote[];
      } else if (payload.success && Array.isArray(payload.result)) {
        // some backends return { success: true, result: [...] }
        notesArray = payload.result as PromissoryNote[];
      } else if (sale?.paymentRecords && Array.isArray(sale.paymentRecords)) {
        // fallback: use sale.paymentRecords if API didn't return promissory notes
        notesArray = sale.paymentRecords as PromissoryNote[];
      } else {
        notesArray = [];
      }

      setNotes(notesArray);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
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
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Ödendi';
      case 'partial': return 'Kısmi';
      case 'overdue': return 'Gecikmiş';
      default: return 'Bekliyor';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleCollectNote = async (noteId: string) => {
    if (collectionData.amount <= 0) {
      setError('Geçerli bir tutar giriniz');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onCollectNote?.(noteId, collectionData.amount, collectionData.paymentMethod);
      setCollectingNoteId(null);
      setCollectionData({ amount: 0, paymentMethod: 'cash' });
      await fetchPromissoryNotes(); // Refresh notes
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ödeme kaydedilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const startCollection = (note: PromissoryNote) => {
    setCollectingNoteId(note.id);
    setCollectionData({
      amount: note.amount - note.paidAmount,
      paymentMethod: 'cash'
    });
    setError(null);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Senet Yönetimi"
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Sale Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Satış Bilgileri</h3>
          <div className="space-y-1 text-sm text-blue-800">
            <p><strong>Satış ID:</strong> {sale?.id}</p>
            <p><strong>Toplam Tutar:</strong> {formatCurrency(sale?.totalAmount || 0)}</p>
            <p><strong>Kalan Tutar:</strong> {formatCurrency(sale?.remainingAmount || 0)}</p>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-900">Senetler</h3>
            <Button
              variant="secondary"
              onClick={() => setShowCreateForm(true)}
              className="text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Yeni Senet
            </Button>
          </div>

          {isLoading ? (
            <LoadingSkeleton lines={3} />
          ) : (!notes || !Array.isArray(notes) || notes.length === 0) ? (
            <div className="text-center py-8">
              <Banknote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Henüz senet bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      {getStatusIcon(note.status)}
                      <span className="ml-2 font-medium">
                        Senet #{note.referenceNumber || note.id.slice(-6)}
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(note.status)}`}>
                      {getStatusText(note.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Tutar:</span>
                      <span className="ml-2 font-medium">{formatCurrency(note.amount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Vade:</span>
                      <span className="ml-2">{formatDate(note.dueDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Ödenen:</span>
                      <span className="ml-2 text-green-600">{formatCurrency(note.paidAmount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Kalan:</span>
                      <span className="ml-2 text-red-600">{formatCurrency(note.amount - note.paidAmount)}</span>
                    </div>
                  </div>

                  {note.status !== 'paid' && (
                    <div className="border-t pt-3">
                      {collectingNoteId === note.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Tahsilat Tutarı
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={note.amount - note.paidAmount}
                                value={collectionData.amount}
                                onChange={(e) => setCollectionData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Ödeme Yöntemi
                              </label>
                              <select
                                value={collectionData.paymentMethod}
                                onChange={(e) => setCollectionData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="cash">Nakit</option>
                                <option value="card">Kart</option>
                                <option value="transfer">Havale</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleCollectNote(note.id)}
                              disabled={isLoading || collectionData.amount <= 0}
                              className="text-sm px-3 py-1"
                            >
                              {isLoading ? 'Kaydediliyor...' : 'Tahsil Et'}
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => setCollectingNoteId(null)}
                              className="text-sm px-3 py-1"
                            >
                              İptal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => startCollection(note)}
                          className="text-sm"
                        >
                          <DollarSign className="w-3 h-3 mr-1" />
                          Tahsil Et
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </Modal>
  );
};