/**
 * PartySearchInput Component
 * Reusable party search with autocomplete
 */
import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@x-ear/ui-web';
import { Search, X } from 'lucide-react';
import { useParties } from '../../hooks/useParties';

interface Party {
  id?: string;
  firstName: string;
  lastName: string;
  tcNumber?: string;
  phone?: string;
}

interface PartySearchInputProps {
  selectedParty: Party | null;
  onSelectParty: (party: Party | null) => void;
}

export function PartySearchInput({ selectedParty, onSelectParty }: PartySearchInputProps) {
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: partiesData } = useParties({
    cacheEnabled: true,
  });

  // Filter parties locally based on search
  const parties = React.useMemo(() => {
    if (!partiesData?.parties || search.length < 2) return [];

    const searchLower = search.toLowerCase();
    return partiesData.parties.filter((party) => {
      const fullName = `${party.firstName} ${party.lastName}`.toLowerCase();
      const tcNumber = party.tcNumber?.toLowerCase() || '';
      const phone = party.phone?.toLowerCase() || '';

      return (
        fullName.includes(searchLower) ||
        tcNumber.includes(searchLower) ||
        phone.includes(searchLower)
      );
    }).slice(0, 10);
  }, [partiesData?.parties, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedParty) {
    return (
      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div>
          <p className="font-medium text-blue-900">
            {selectedParty.firstName} {selectedParty.lastName}
          </p>
          {selectedParty.tcNumber && (
            <p className="text-sm text-blue-700">TC: {selectedParty.tcNumber}</p>
          )}
        </div>
        <button data-allow-raw="true"
          type="button"
          onClick={() => onSelectParty(null)}
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
          {parties.length > 0 ? (
            parties.map((party) => (
              <div
                key={party.id}
                onClick={() => {
                  onSelectParty(party as unknown as Party);
                  setSearch('');
                  setShowResults(false);
                }}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <p className="font-medium text-gray-900">
                  {party.firstName} {party.lastName}
                </p>
                <p className="text-sm text-gray-500">
                  {[
                    party.tcNumber && `TC: ${party.tcNumber}`,
                    party.phone && `Tel: ${party.phone}`,
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
