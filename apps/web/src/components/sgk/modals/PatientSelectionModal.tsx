import React, { useState, useMemo } from 'react';
import { Modal, Button, Input, DataTable } from '@x-ear/ui-web';
import type { Patient, PatientGender } from '../../../types/patient/patient-base.types';

interface PatientSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (patient: Patient) => void;
  title?: string;
}

// Mock hasta verileri - gerçek uygulamada API'den gelecek
const mockPatients: Patient[] = [
  {
    id: 'pat_001',
    tcNumber: '12345678901',
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    phone: '0532 123 4567',
    email: 'ahmet@example.com',
    birthDate: '1980-05-15',
    gender: 'M' as PatientGender,
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
    gender: 'F' as PatientGender,
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
    gender: 'M' as PatientGender,
    addressCity: 'İzmir',
    addressDistrict: 'Konak',
    status: 'ACTIVE'
  }
];

export const PatientSelectionModal: React.FC<PatientSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = 'Hasta Seçimi'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Filtrelenmiş hasta listesi
  const filteredPatients = useMemo(() => {
    if (!searchTerm) return mockPatients;
    
    const searchLower = searchTerm.toLowerCase();
    return mockPatients.filter(patient => 
      patient.firstName.toLowerCase().includes(searchLower) ||
      patient.lastName.toLowerCase().includes(searchLower) ||
      (patient.tcNumber ?? '').includes(searchTerm) ||
      patient.phone.includes(searchTerm)
    );
  }, [searchTerm]);

  // Tablo kolonları
  const columns = [
    {
      key: 'fullName',
      title: 'Ad Soyad',
      render: (value: any, record: Patient) => `${record.firstName} ${record.lastName}`
    },
    {
      key: 'tcNumber',
      title: 'TC Kimlik No'
    },
    {
      key: 'phone',
      title: 'Telefon'
    },
    {
      key: 'addressCity',
      title: 'Şehir'
    }
  ];

  const handleClose = () => {
    setSelectedPatient(null);
    setSearchTerm('');
    onClose();
  };

  const handleSelect = () => {
    if (selectedPatient) {
      onSelect(selectedPatient);
      handleClose();
    }
  };

  const handleRowClick = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const actions = [
    {
      key: 'select',
      label: 'Seç',
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
            placeholder="Hasta adı, TC kimlik no veya telefon ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
          />
        </div>

        {/* Hasta Listesi */}
        <div className="max-h-96 overflow-y-auto">
          <DataTable
            data={filteredPatients}
            columns={columns}
            actions={actions}
            rowKey="id"
            hoverable
            emptyText="Hasta bulunamadı"
          />
        </div>

        {/* Seçili Hasta Bilgisi */}
        {selectedPatient && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Seçili Hasta:</h4>
            <p className="text-blue-800">
              {selectedPatient.firstName} {selectedPatient.lastName} - {selectedPatient.tcNumber}
            </p>
          </div>
        )}

        {/* Modal Aksiyonları */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            İptal
          </Button>
          <Button
            variant="primary"
            onClick={handleSelect}
            disabled={!selectedPatient}
          >
            Seç
          </Button>
        </div>
      </div>
    </Modal>
  );
};