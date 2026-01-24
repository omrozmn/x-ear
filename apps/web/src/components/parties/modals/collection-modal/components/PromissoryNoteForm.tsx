import React from 'react';
import { Input, Textarea, Button, Spinner, Badge } from '@x-ear/ui-web';
import { FileText, Calendar, DollarSign } from 'lucide-react';
import type { CollectionState, PromissoryNote } from '../types';

interface PromissoryNoteFormProps {
  state: CollectionState;
  promissoryNotes: PromissoryNote[];
  onStateUpdate: (updates: Partial<CollectionState>) => void;
  onSubmitPromissoryNote: (formData: FormData) => void;
  onPromissoryPayment: (noteId: string, amount: number) => void;
  formatCurrency: (amount: number) => string;
}

export const PromissoryNoteForm: React.FC<PromissoryNoteFormProps> = ({
  state,
  promissoryNotes,
  onStateUpdate,
  onSubmitPromissoryNote,
  onPromissoryPayment,
  formatCurrency
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    onSubmitPromissoryNote(formData);
  };

  const handlePromissoryPayment = (noteId: string) => {
    const note = promissoryNotes.find(n => n.id === noteId);
    if (note && state.promissoryPaymentAmount > 0) {
      onPromissoryPayment(noteId, state.promissoryPaymentAmount);
    }
  };

  return (
    <div className="space-y-6">
      {/* Existing Promissory Notes */}
      {promissoryNotes.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Mevcut Senetler
          </h4>
          <div className="space-y-3">
            {promissoryNotes.map((note) => (
              <div key={note.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-medium">Senet #{note.noteNumber}</div>
                    <div className="text-sm text-gray-600">
                      Vade: {new Date(note.dueDate).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                  <Badge 
                    variant={
                      note.status === 'paid' ? 'success' : 
                      note.status === 'overdue' ? 'danger' : 
                      note.status === 'partial' ? 'warning' : 'secondary'
                    }
                  >
                    {note.status === 'paid' ? 'Ödendi' : 
                     note.status === 'overdue' ? 'Vadesi Geçti' : 
                     note.status === 'partial' ? 'Kısmi Ödendi' : 'Aktif'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Toplam:</span>
                    <div className="font-medium">{formatCurrency(note.amount)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Ödenen:</span>
                    <div className="font-medium text-green-600">{formatCurrency(note.paidAmount)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Kalan:</span>
                    <div className="font-medium text-red-600">{formatCurrency(note.remainingAmount)}</div>
                  </div>
                </div>

                {note.remainingAmount > 0 && (
                  <div className="flex items-center gap-2 pt-3 border-t">
                    <div className="flex-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={note.remainingAmount}
                        value={state.promissoryPaymentAmount || ''}
                        onChange={(e) => onStateUpdate({ promissoryPaymentAmount: parseFloat(e.target.value) || 0 })}
                        placeholder="Ödeme tutarı"
                        className="text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handlePromissoryPayment(note.id)}
                      disabled={!state.promissoryPaymentAmount || state.promissoryPaymentAmount <= 0 || state.isLoading}
                    >
                      {state.isLoading ? (
                        <Spinner className="w-3 h-3" />
                      ) : (
                        'Öde'
                      )}
                    </Button>
                  </div>
                )}

                {note.notes && (
                  <div className="mt-3 text-sm text-gray-600">
                    <strong>Not:</strong> {note.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create New Promissory Note */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Yeni Senet Oluştur
        </h4>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senet Numarası
              </label>
              <Input
                name="noteNumber"
                placeholder="Senet numarası"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tutar
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vade Tarihi
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                name="dueDate"
                type="date"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notlar (İsteğe Bağlı)
            </label>
            <Textarea
              name="notes"
              placeholder="Senet ile ilgili notlar..."
              rows={3}
            />
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              type="submit"
              disabled={state.isLoading}
              className="min-w-[120px]"
            >
              {state.isLoading ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Oluşturuluyor...
                </>
              ) : (
                'Senet Oluştur'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};