import React, { useState } from 'react';
import { Modal, Button } from '@x-ear/ui-web';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { PatientDevice } from '../../types/patient';

interface DeviceReplaceModalProps {
  device: PatientDevice;
  isOpen: boolean;
  onClose: () => void;
  onReplace: (deviceId: string, reason: string, notes: string) => Promise<void>;
}

export const DeviceReplaceModal: React.FC<DeviceReplaceModalProps> = ({
  device,
  isOpen,
  onClose,
  onReplace
}) => {
  const [reason, setReason] = useState('defective');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason) {
      setError('Değişim sebebi seçiniz');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onReplace(device.id, reason, notes);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Cihaz değiştirilemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cihaz Değiştir"
      size="md"
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

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            Değiştir butonuna tıkladığınızda, mevcut cihaz iade edilecek ve yeni cihaz atama formu açılacaktır.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {isSubmitting ? 'Değiştiriliyor...' : 'Değiştir'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
