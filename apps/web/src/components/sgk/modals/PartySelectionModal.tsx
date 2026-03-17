import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Input, DataTable } from '@x-ear/ui-web';
import type { Party, PartyGender } from '../../../types/party/party-base.types';

interface PartySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (party: Party) => void;
  title?: string;
}

// Mock hasta verileri - gerçek uygulamada API'den gelecek
const mockParties: Party[] = [
  {
    id: 'pat_001',
    tcNumber: '12345678901',
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    phone: '0532 123 4567',
    email: 'ahmet@example.com',
    birthDate: '1980-05-15',
    gender: 'M' as PartyGender,
    addressCity: 'İstanbul',
    addressDistrict: 'Kadıköy',
    status: 'ACTIVE'
  },
  {
    id: 'pat_002',
    tcNumber: '12345678902',
    firstName: 'Fatma',
    lastName: 'Kaya',
    phone: '0533 234 5678',
    email: 'fatma@example.com',
    birthDate: '1975-08-22',
    gender: 'F' as PartyGender,
    addressCity: 'Ankara',
    addressDistrict: 'Çankaya',
    status: 'ACTIVE'
  },
  {
    id: 'pat_003',
    tcNumber: '12345678903',
    firstName: 'Mehmet',
    lastName: 'Demir',
    phone: '0534 345 6789',
    email: 'mehmet@example.com',
    birthDate: '1990-12-10',
    gender: 'M' as PartyGender,
    addressCity: 'İzmir',
    addressDistrict: 'Konak',
    status: 'ACTIVE'
  }
];

export const PartySelectionModal: React.FC<PartySelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = 'Hasta Seçimi'
}) => {
  const { t } = useTranslation('sgk');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);

  // Filtrelenmiş hasta listesi
  const filteredParties = useMemo(() => {
    if (!searchTerm) return mockParties;

    const searchLower = searchTerm.toLowerCase();
    return mockParties.filter(party =>
      (party.firstName || '').toLowerCase().includes(searchLower) ||
      (party.lastName || '').toLowerCase().includes(searchLower) ||
      (party.tcNumber ?? '').includes(searchTerm) ||
      (party.phone || '').includes(searchTerm)
    );
  }, [searchTerm]);

  // Tablo kolonları
  const columns = [
    {
      key: 'fullName',
      title: t('fullName', 'Ad Soyad'),
      render: (value: string | null | undefined, record: Party) => `${record.firstName || ''} ${record.lastName || ''}`
    },
    {
      key: 'tcNumber',
      title: t('tcIdNo', 'TC Kimlik No')
    },
    {
      key: 'phone',
      title: t('phone', 'Telefon')
    },
    {
      key: 'addressCity',
      title: t('city', 'Şehir')
    }
  ];

  const handleClose = () => {
    setSelectedParty(null);
    setSearchTerm('');
    onClose();
  };

  const handleSelect = () => {
    if (selectedParty) {
      onSelect(selectedParty);
      handleClose();
    }
  };

  const handleRowClick = (party: Party) => {
    setSelectedParty(party);
  };

  const actions = [
    {
      key: 'select',
      label: t('select', 'Seç'),
      onClick: handleRowClick,
      variant: 'primary' as const
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
      showFooter={false}
    >
      <div className="space-y-4">
        {/* Arama */}
        <div>
          <Input
            placeholder={t('searchPatientPlaceholder', 'Hasta adı, TC kimlik no veya telefon ile ara...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
          />
        </div>

        {/* Hasta Listesi */}
        <div className="max-h-96 overflow-y-auto">
          <DataTable
            data={filteredParties}
            columns={columns}
            actions={actions}
            rowKey="id"
            hoverable
            emptyText={t('patientNotFound', 'Hasta bulunamadı')}
          />
        </div>

        {/* Seçili Hasta Bilgisi */}
        {selectedParty && (
          <div className="bg-primary/10 p-4 rounded-2xl">
            <h4 className="font-medium text-blue-900 mb-2">{t('selectedPatient', 'Seçili Hasta')}:</h4>
            <p className="text-blue-800">
              {selectedParty.firstName || ''} {selectedParty.lastName || ''} - {selectedParty.tcNumber || ''}
            </p>
          </div>
        )}

        {/* Modal Aksiyonları */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            {t('cancel', 'İptal')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSelect}
            disabled={!selectedParty}
          >
            {t('select', 'Seç')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};