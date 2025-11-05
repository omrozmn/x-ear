import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@x-ear/ui-web';
import { Search, User, Check } from 'lucide-react';
import { usePatients } from '../../hooks/usePatients';
import { type Patient } from '../../types/patient';

interface PatientSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (patient: Patient) => void;
  ocrResult?: any;
}

const PatientSearch: React.FC<PatientSearchProps> = ({
  isOpen,
  onClose,
  onSelect,
  ocrResult,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const { data: patientsData, isLoading } = usePatients({ page: 1, per_page: 200 });
  const patients = patientsData?.patients || [];

  // Auto-suggest based on OCR result
  useEffect(() => {
    if (ocrResult?.matched_patient?.patient) {
      setSelectedPatient(ocrResult.matched_patient.patient);
    }
  }, [ocrResult]);

  const filteredPatients =
    patients?.filter((patient: Patient): patient is Patient & { id: string } => {
      if (!patient.id) {
        return false;
      }
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const tc = patient.tcNumber || '';
      const phone = patient.phone || '';
      const search = searchTerm.toLowerCase();

      return (
        fullName.includes(search) ||
        tc.includes(search) ||
        phone.includes(search)
      );
    }) || [];

  const handleSelect = () => {
    if (selectedPatient) {
      onSelect(selectedPatient);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hasta Seç">
      <div className="space-y-4">
        {/* OCR Suggestion */}
        {ocrResult?.matched_patient && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-1">
              OCR Önerisi
            </div>
            <div className="text-sm text-blue-700">
              {ocrResult.matched_patient.patient?.fullName}
              {ocrResult.matched_patient.match_details?.confidence && (
                <span className="ml-2 text-xs">
                  ({Math.round(ocrResult.matched_patient.match_details.confidence * 100)}% güven)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Search Input */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Hasta Ara
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="İsim, TC veya telefon ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Patient List */}
        <div className="max-h-64 overflow-y-auto border rounded-lg">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Yükleniyor...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? 'Hasta bulunamadı' : 'Arama yapmak için yazın'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredPatients.slice(0, 10).map((patient: Patient) => (
                <div
                  key={patient.id}
                  className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                    selectedPatient?.id === patient.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="font-medium">
                        {patient.firstName} {patient.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {patient.tcNumber && `TC: ${patient.tcNumber}`}
                        {patient.phone && ` • Tel: ${patient.phone}`}
                      </div>
                    </div>
                  </div>
                  {selectedPatient?.id === patient.id && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            İptal
          </Button>
          <Button
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

export default PatientSearch;
