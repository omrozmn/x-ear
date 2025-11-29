import React, { useState, useEffect, useRef } from 'react';
import { Input, Button } from '@x-ear/ui-web';
import { Search, User, Plus } from 'lucide-react';
import { usePatients } from '../../hooks/usePatients';
import { Patient } from '../../types/patient';

interface PatientAutocompleteProps {
  value?: string;
  patientId?: string;
  onSelect: (patient: Patient) => void;
  onAddNew?: (name: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function PatientAutocomplete({
  value = '',
  patientId = '',
  onSelect,
  onAddNew,
  placeholder = 'Hasta Seçin',
  className = '',
  error
}: PatientAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const { data, isLoading } = usePatients();
  const patients = data?.patients || [];
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update searchQuery when value prop changes
  useEffect(() => {
    if (value !== searchQuery && !isOpen) {
      setSearchQuery(value);
    }
  }, [value]);

  // Filter patients based on search query
  useEffect(() => {
    if (!patients || !searchQuery.trim()) {
      setFilteredPatients([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = patients.filter(patient => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const tcNumber = patient.tcNumber?.toLowerCase() || '';
      const phone = patient.phone?.toLowerCase() || '';

      return fullName.includes(query) ||
        tcNumber.includes(query) ||
        phone.includes(query);
    });

    setFilteredPatients(filtered.slice(0, 10)); // Limit to 10 results
  }, [searchQuery, patients]);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Debounce search
    const timeout = setTimeout(() => {
      if (query.length >= 1) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    }, 300);

    setSearchTimeout(timeout);
  };

  // Handle patient selection
  const handlePatientSelect = (patient: Patient) => {
    const fullName = `${patient.firstName} ${patient.lastName}`;
    setSearchQuery(fullName);
    setIsOpen(false);
    onSelect(patient);
  };

  // Handle input focus
  const handleFocus = () => {
    if (searchQuery.length === 0 && patients && patients.length > 0) {
      setFilteredPatients(patients.slice(0, 10));
      setIsOpen(true);
    } else if (searchQuery.length >= 1) {
      setIsOpen(true);
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`pr-10 ${error ? 'border-red-500' : ''}`}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Search results dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-sm text-gray-500">Hasta verisi yükleniyor...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-2">
              <div className="p-2 text-sm text-gray-500 text-center mb-2">
                "{searchQuery}" için sonuç bulunamadı
              </div>
              {onAddNew && searchQuery.length > 2 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => {
                    onAddNew(searchQuery);
                    setIsOpen(false);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Hasta Ekle
                </Button>
              )}
            </div>
          ) : (
            <>
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center space-x-3"
                  onClick={() => handlePatientSelect(patient)}
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {patient.firstName} {patient.lastName}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {patient.tcNumber && `TC: ${patient.tcNumber}`}
                      {patient.tcNumber && patient.phone && ' • '}
                      {patient.phone && `Tel: ${patient.phone}`}
                    </div>
                  </div>
                </div>
              ))}
              {onAddNew && (
                <div className="p-2 border-t border-gray-100 sticky bottom-0 bg-white">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full flex items-center justify-center text-sm text-blue-600 hover:bg-blue-50"
                    onClick={() => {
                      onAddNew(searchQuery);
                      setIsOpen(false);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Hasta Ekle
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}