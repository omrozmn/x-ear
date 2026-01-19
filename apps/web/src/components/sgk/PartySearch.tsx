import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@x-ear/ui-web';
import { Search, User, Check } from 'lucide-react';
import { useParties } from '../../hooks/useParties';
import { type Party } from '../../types/party';

interface PartySearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (party: Party) => void;
  ocrResult?: any;
}

const PartySearch: React.FC<PartySearchProps> = ({
  isOpen,
  onClose,
  onSelect,
  ocrResult,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const { data: partiesData, isLoading } = useParties({});
  const parties = partiesData?.parties || [];

  // Auto-suggest based on OCR result
  useEffect(() => {
    if (ocrResult?.matched_party?.party) {
      setSelectedParty(ocrResult.matched_party.party);
    }
  }, [ocrResult]);

  const filteredParties =
    parties?.filter((party: Party): party is Party & { id: string } => {
      if (!party.id) {
        return false;
      }
      const fullName = `${party.firstName} ${party.lastName}`.toLowerCase();
      const tc = party.tcNumber || '';
      const phone = party.phone || '';
      const search = searchTerm.toLowerCase();

      return (
        fullName.includes(search) ||
        tc.includes(search) ||
        phone.includes(search)
      );
    }) || [];

  const handleSelect = () => {
    if (selectedParty) {
      onSelect(selectedParty);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hasta Seç">
      <div className="space-y-4">
        {/* OCR Suggestion */}
        {ocrResult?.matched_party && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-1">
              OCR Önerisi
            </div>
            <div className="text-sm text-blue-700">
              {ocrResult.matched_party.party?.fullName}
              {ocrResult.matched_party.match_details?.confidence && (
                <span className="ml-2 text-xs">
                  ({Math.round(ocrResult.matched_party.match_details.confidence * 100)}% güven)
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

        {/* Party List */}
        <div className="max-h-64 overflow-y-auto border rounded-lg">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Yükleniyor...</div>
          ) : filteredParties.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? 'Hasta bulunamadı' : 'Arama yapmak için yazın'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredParties.slice(0, 10).map((party: Party) => (
                <div
                  key={party.id}
                  className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                    selectedParty?.id === party.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedParty(party)}
                >
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="font-medium">
                        {party.firstName} {party.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {party.tcNumber && `TC: ${party.tcNumber}`}
                        {party.phone && ` • Tel: ${party.phone}`}
                      </div>
                    </div>
                  </div>
                  {selectedParty?.id === party.id && (
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
            disabled={!selectedParty}
          >
            Seç
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PartySearch;
