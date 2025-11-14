import { Input, Button } from '@x-ear/ui-web';
import { useState, useEffect, useCallback } from 'react';
import { CheckCircle } from 'lucide-react';
import { usePatients } from '../../hooks/usePatients';
import { Patient } from '../../types/patient';
import { InvoiceAddress } from '../../types/invoice';

interface PatientSearchSectionProps {
  onPatientSelect: (patient: Patient) => void;
  selectedPatient?: {
    patientId?: string;
    patientName: string;
    patientPhone?: string;
    patientTcNumber?: string;
  };
}

export function PatientSearchSection({ onPatientSelect, selectedPatient }: PatientSearchSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedPatientData, setSelectedPatientData] = useState<Patient | null>(null);

  const { patients, isLoading, searchPatients } = usePatients({
    cacheEnabled: true
  });

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchPatients({ search: searchQuery });
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [searchQuery, searchPatients]);

  const handlePatientSelect = useCallback((patient: Patient) => {
    setSelectedPatientData(patient);
    setSearchQuery(`${patient.firstName || ''} ${patient.lastName || ''}`.trim());
    setShowResults(false);
    onPatientSelect(patient);
  }, [onPatientSelect]);

  const handleClearSelection = () => {
    setSelectedPatientData(null);
    setSearchQuery('');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Hasta Ara *
        </label>
        <div className="relative">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hasta adı, TC No veya telefon ile arayın..."
                className="w-full pl-10"
                autoComplete="off"
              />
              <span className="absolute left-3 top-3 text-gray-400">
                🔍
              </span>
              {isLoading && (
                <span className="absolute right-3 top-3 text-gray-400">
                  <i className="fa fa-spinner fa-spin"></i>
                </span>
              )}
            </div>
            {selectedPatientData && (
              <Button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                variant="default">
                Temizle
              </Button>
            )}
          </div>

          {/* Arama Sonuçları */}
          {showResults && patients.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {patients.map((patient: Patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => handlePatientSelect(patient)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {patient.firstName} {patient.lastName}
                      </div>
                      <div className="text-sm text-gray-500 space-x-3">
                        {patient.tcNumber && (
                          <span>TC: {patient.tcNumber}</span>
                        )}
                        {patient.phone && (
                          <span>📞 {patient.phone}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-blue-600">→</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Sonuç Bulunamadı */}
          {showResults && patients.length === 0 && !isLoading && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4">
              <p className="text-sm text-gray-500 text-center">
                Hasta bulunamadı. Yeni hasta bilgilerini manuel girebilirsiniz.
              </p>
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          En az 2 karakter girerek hasta arayabilirsiniz
        </p>
      </div>

      {/* Seçili Hasta Bilgileri */}
      {selectedPatientData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="text-green-400 mr-3 flex-shrink-0" size={24} />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-green-900 mb-2">
                Hasta Seçildi
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Ad Soyad:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {selectedPatientData.firstName} {selectedPatientData.lastName}
                  </span>
                </div>
                {selectedPatientData.tcNumber && (
                  <div>
                    <span className="text-gray-600">TC No:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {selectedPatientData.tcNumber}
                    </span>
                  </div>
                )}
                {selectedPatientData.phone && (
                  <div>
                    <span className="text-gray-600">Telefon:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {selectedPatientData.phone}
                    </span>
                  </div>
                )}
                {selectedPatientData.email && (
                  <div>
                    <span className="text-gray-600">E-posta:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {selectedPatientData.email}
                    </span>
                  </div>
                )}
                {selectedPatientData.addressFull && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Adres:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {selectedPatientData.addressFull}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <CheckCircle className="text-green-600" size={16} />
                <p className="text-xs text-green-700">
                  Hasta bilgileri faturaya otomatik olarak aktarıldı
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
