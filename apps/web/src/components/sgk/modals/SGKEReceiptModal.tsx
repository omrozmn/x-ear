import React, { useState } from 'react';
import { Modal, Button, Input, Textarea } from '@x-ear/ui-web';
import type { Party } from '../../../types/party/party-base.types';

interface SGKEReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (receiptData: SGKEReceiptData) => void;
  party: Party | null;
  receiptId?: string;
  mode?: 'view' | 'edit' | 'create';
  title?: string;
}

interface SGKEReceiptData {
  id?: string;
  partyId: string;
  receiptNumber: string;
  receiptDate: string;
  doctorName: string;
  hospitalName: string;
  medications: SGKMedication[];
  totalAmount: number;
  sgkCoverage: number;
  partyPayment: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  notes?: string;
}

interface SGKMedication {
  id: string;
  name: string;
  dosage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sgkCode: string;
}

// Mock e-reçete verisi
const mockEReceipt: SGKEReceiptData = {
  id: 'ereceipt_001',
  partyId: 'pat_001',
  receiptNumber: 'ER2024001234',
  receiptDate: '2024-01-15',
  doctorName: 'Dr. Mehmet Yılmaz',
  hospitalName: 'Ankara Üniversitesi Hastanesi',
  medications: [
    {
      id: 'med_001',
      name: 'İşitme Cihazı Pili',
      dosage: '1.45V',
      quantity: 6,
      unitPrice: 25.50,
      totalPrice: 153.00,
      sgkCode: 'SGK001234'
    },
    {
      id: 'med_002',
      name: 'Kulak Temizlik Spreyi',
      dosage: '50ml',
      quantity: 1,
      unitPrice: 45.00,
      totalPrice: 45.00,
      sgkCode: 'SGK001235'
    }
  ],
  totalAmount: 198.00,
  sgkCoverage: 158.40,
  partyPayment: 39.60,
  status: 'approved',
  notes: 'Düzenli kullanım önerilir'
};

export const SGKEReceiptModal: React.FC<SGKEReceiptModalProps> = ({
  isOpen,
  onClose,
  onSave,
  party,
  receiptId,
  mode = 'view',
  title = 'SGK E-Reçete Detayları'
}) => {
  const [receiptData, setReceiptData] = useState<SGKEReceiptData>(mockEReceipt);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusOptions = [
    { value: 'draft', label: 'Taslak' },
    { value: 'sent', label: 'Gönderildi' },
    { value: 'approved', label: 'Onaylandı' },
    { value: 'rejected', label: 'Reddedildi' }
  ];

  const handleSave = async () => {
    if (!party) return;

    setIsSubmitting(true);
    try {
      await onSave({
        ...receiptData,
        partyId: party.id || ''
      });
      onClose();
    } catch (error) {
      console.error('E-reçete kaydedilirken hata:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'text-gray-600 bg-gray-100';
      case 'sent':
        return 'text-blue-600 bg-blue-100';
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.label : status;
  };

  const isReadOnly = mode === 'view';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="xl"
      showFooter={false}
    >
      <div className="space-y-6">
        {/* Hasta Bilgileri */}
        {party && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Hasta Bilgileri</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Ad Soyad:</span>
                <span className="ml-2 font-medium">{party.firstName} {party.lastName}</span>
              </div>
              <div>
                <span className="text-gray-500">TC Kimlik No:</span>
                <span className="ml-2 font-medium">{party.tcNumber}</span>
              </div>
            </div>
          </div>
        )}

        {/* E-Reçete Bilgileri */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="Reçete Numarası"
              value={receiptData.receiptNumber}
              onChange={(e) => setReceiptData({...receiptData, receiptNumber: e.target.value})}
              disabled={isReadOnly}
              fullWidth
            />
          </div>
          <div>
            <Input
              label="Reçete Tarihi"
              type="date"
              value={receiptData.receiptDate}
              onChange={(e) => setReceiptData({...receiptData, receiptDate: e.target.value})}
              disabled={isReadOnly}
              fullWidth
            />
          </div>
          <div>
            <Input
              label="Doktor Adı"
              value={receiptData.doctorName}
              onChange={(e) => setReceiptData({...receiptData, doctorName: e.target.value})}
              disabled={isReadOnly}
              fullWidth
            />
          </div>
          <div>
            <Input
              label="Hastane"
              value={receiptData.hospitalName}
              onChange={(e) => setReceiptData({...receiptData, hospitalName: e.target.value})}
              disabled={isReadOnly}
              fullWidth
            />
          </div>
        </div>

        {/* Durum */}
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Reçete Durumu</h4>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(receiptData.status)}`}>
            {getStatusText(receiptData.status)}
          </span>
        </div>

        {/* İlaçlar */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">İlaçlar ve Malzemeler</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">İlaç/Malzeme</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Doz</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Adet</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Birim Fiyat</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Toplam</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SGK Kodu</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {receiptData.medications.map((medication) => (
                  <tr key={medication.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">{medication.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{medication.dosage}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{medication.quantity}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">₺{medication.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">₺{medication.totalPrice.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{medication.sgkCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ödeme Bilgileri */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-3">Ödeme Bilgileri</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-600">Toplam Tutar:</span>
              <p className="font-medium text-blue-900">₺{receiptData.totalAmount.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-blue-600">SGK Karşılığı:</span>
              <p className="font-medium text-blue-900">₺{receiptData.sgkCoverage.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-blue-600">Hasta Ödemesi:</span>
              <p className="font-medium text-blue-900">₺{receiptData.partyPayment.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Notlar */}
        {receiptData.notes && (
          <div>
            <Textarea
              label="Notlar"
              value={receiptData.notes}
              onChange={(e) => setReceiptData({...receiptData, notes: e.target.value})}
              disabled={isReadOnly}
              rows={3}
              fullWidth
            />
          </div>
        )}

        {/* Modal Aksiyonları */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex space-x-3">
            {mode === 'view' && (
              <>
                <Button variant="outline">Yazdır</Button>
                <Button variant="outline">İndir</Button>
              </>
            )}
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              {mode === 'view' ? 'Kapat' : 'İptal'}
            </Button>
            {mode !== 'view' && (
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                Kaydet
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};