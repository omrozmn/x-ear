/**
 * PatientSearchInput Component
 * Reusable patient search with autocomplete
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@x-ear/ui-web';
import { Search, X } from 'lucide-react';
import { usePatients } from '../../hooks/usePatients';

interface Patient {
  id?: string;
  firstName: string;
  lastName: string;
  tcNumber?: string;
  phone?: string;
}

interface PatientSearchInputProps {
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient | null) => void;
}

export function PatientSearchInput({ selectedPatient, onSelectPatient }: PatientSearchInputProps) {
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: patientsData } = usePatients({
    cacheEnabled: true,
  });

  // Filter patients locally based on search
  const patients = React.useMemo(() => {
    if (!patientsData?.patients || search.length < 2) return [];
    
    const searchLower = search.toLowerCase();
    return patientsData.patients.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const tcNumber = patient.tcNumber?.toLowerCase() || '';
      const phone = patient.phone?.toLowerCase() || '';
      
      return (
        fullName.includes(searchLower) ||
        tcNumber.includes(searchLower) ||
        phone.includes(searchLower)
      );
    }).slice(0, 10);
  }, [patientsData?.patients, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedPatient) {
    return (
      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div>
          <p className="font-medium text-blue-900">
            {selectedPatient.firstName} {selectedPatient.lastName}
          </p>
          {selectedPatient.tcNumber && (
            <p className="text-sm text-blue-700">TC: {selectedPatient.tcNumber}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onSelectPatient(null)}
          className="text-blue-600 hover:text-blue-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={searchRef} className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        placeholder="Hasta adı, TC veya telefon ile ara..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowResults(true);
        }}
        onFocus={() => setShowResults(true)}
        className="pl-10"
      />
      {showResults && search.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {patients.length > 0 ? (
            patients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => {
                  onSelectPatient(patient);
                  setSearch('');
                  setShowResults(false);
                }}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <p className="font-medium text-gray-900">
                  {patient.firstName} {patient.lastName}
                </p>
                <p className="text-sm text-gray-500">
                  {[
                    patient.tcNumber && `TC: ${patient.tcNumber}`,
                    patient.phone && `Tel: ${patient.phone}`,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              </div>
            ))
          ) : (
            <div className="p-3 text-sm text-gray-500">Hasta bulunamadı</div>
          )}
        </div>
      )}
    </div>
  );
}
