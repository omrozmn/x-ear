import React, { useState } from 'react';
import { Modal, Button, Textarea, Select } from '@x-ear/ui-web';
import type { Party } from '../../../types/party/party-base.types';

interface SGKApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (approvalData: SGKApprovalData) => void;
  party: Party | null;
  requestId?: string;
  requestType?: string;
  title?: string;
}

interface SGKApprovalData {
  requestId: string;
  partyId: string;
  approvalType: 'approve' | 'reject' | 'request_info';
  notes: string;
  approvedBy: string;
  approvalDate: string;
}

export const SGKApprovalModal: React.FC<SGKApprovalModalProps> = ({
  isOpen,
  onClose,
  onApprove,
  party,
  requestId = '',
  requestType = 'İşitme Cihazı Talebi',
  title = 'SGK Onay İşlemi'
}) => {
  const [approvalType, setApprovalType] = useState<'approve' | 'reject' | 'request_info'>('approve');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const approvalOptions = [
    { value: 'approve', label: 'Onayla' },
    { value: 'reject', label: 'Reddet' },
    { value: 'request_info', label: 'Ek Bilgi Talep Et' }
  ];

  const handleSubmit = async () => {
    if (!party || !requestId) return;

    setIsSubmitting(true);
    try {
      const approvalData: SGKApprovalData = {
        requestId,
        partyId: party.id || '',
        approvalType,
        notes,
        approvedBy: 'Mevcut Kullanıcı', // Gerçek uygulamada auth context'ten gelecek
        approvalDate: new Date().toISOString()
      };

      await onApprove(approvalData);
      handleClose();
    } catch (error) {
      console.error('Onay işlemi sırasında hata:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setApprovalType('approve');
    setNotes('');
    onClose();
  };

  const getApprovalTypeColor = (type: string) => {
    switch (type) {
      case 'approve':
        return 'text-green-600';
      case 'reject':
        return 'text-red-600';
      case 'request_info':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSubmitButtonText = () => {
    switch (approvalType) {
      case 'approve':
        return 'Onayla';
      case 'reject':
        return 'Reddet';
      case 'request_info':
        return 'Ek Bilgi Talep Et';
      default:
        return 'Gönder';
    }
  };

  const getSubmitButtonVariant = (): "primary" | "danger" | "outline" => {
    switch (approvalType) {
      case 'approve':
        return 'primary';
      case 'reject':
        return 'danger';
      case 'request_info':
        return 'outline';
      default:
        return 'primary';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="md"
      showFooter={false}
    >
      <div className="space-y-6">
        {/* Hasta ve Talep Bilgileri */}
        {party && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Talep Bilgileri</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Hasta:</span>
                <span className="font-medium">{party.firstName} {party.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">TC Kimlik No:</span>
                <span className="font-medium">{party.tcNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Talep Türü:</span>
                <span className="font-medium">{requestType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Talep ID:</span>
                <span className="font-medium">{requestId}</span>
              </div>
            </div>
          </div>
        )}

        {/* Onay Türü Seçimi */}
        <div>
          <Select
            label="Onay Durumu"
            value={approvalType}
            onChange={(e) => setApprovalType(e.target.value as 'approve' | 'reject' | 'request_info')}
            options={approvalOptions}
            fullWidth
          />
        </div>

        {/* Seçilen Onay Türüne Göre Açıklama */}
        <div className={`p-3 rounded-lg border-l-4 ${approvalType === 'approve' ? 'bg-green-50 border-green-400' :
            approvalType === 'reject' ? 'bg-red-50 border-red-400' :
              'bg-yellow-50 border-yellow-400'
          }`}>
          <p className={`text-sm font-medium ${getApprovalTypeColor(approvalType)}`}>
            {approvalType === 'approve' && 'Bu talep onaylanacak ve işleme alınacaktır.'}
            {approvalType === 'reject' && 'Bu talep reddedilecek ve hasta bilgilendirilecektir.'}
            {approvalType === 'request_info' && 'Hastadan ek bilgi ve belge talep edilecektir.'}
          </p>
        </div>

        {/* Notlar */}
        <div>
          <Textarea
            label="Notlar"
            placeholder={
              approvalType === 'approve' ? 'Onay notları (isteğe bağlı)...' :
                approvalType === 'reject' ? 'Red gerekçesi...' :
                  'Talep edilen ek bilgiler...'
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            fullWidth
            error={approvalType !== 'approve' && !notes ? 'Bu alan zorunludur' : ''}
          />
        </div>

        {/* Modal Aksiyonları */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            İptal
          </Button>
          <Button
            variant={getSubmitButtonVariant()}
            onClick={handleSubmit}
            disabled={isSubmitting || (approvalType !== 'approve' && !notes)}
            loading={isSubmitting}
          >
            {getSubmitButtonText()}
          </Button>
        </div>
      </div>
    </Modal>
  );
};