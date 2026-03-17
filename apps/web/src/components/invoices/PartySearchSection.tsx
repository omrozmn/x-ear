import { Input, Button } from '@x-ear/ui-web';
import { useState, useEffect, useCallback } from 'react';
import { CheckCircle } from 'lucide-react';
import { useParties } from '../../hooks/useParties';
import { Party } from '../../types/party';

interface PartySearchSectionProps {
  onPartySelect: (party: Party) => void;
  selectedParty?: {
    partyId?: string;
    partyName: string;
    partyPhone?: string;
    partyTcNumber?: string;
  };
}

export function PartySearchSection({ onPartySelect }: PartySearchSectionProps) {
  // Removed unused _selectedParty parameter
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedPartyData, setSelectedPartyData] = useState<Party | null>(null);

  const { parties, isLoading, searchParties } = useParties({
    cacheEnabled: true
  });

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchParties({ search: searchQuery });
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [searchQuery, searchParties]);

  const handlePartySelect = useCallback((party: Party) => {
    setSelectedPartyData(party);
    setSearchQuery(`${party.firstName || ''} ${party.lastName || ''}`.trim());
    setShowResults(false);
    onPartySelect(party);
  }, [onPartySelect]);

  const handleClearSelection = () => {
    setSelectedPartyData(null);
    setSearchQuery('');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
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
              <span className="absolute left-3 top-3 text-muted-foreground">
                🔍
              </span>
              {isLoading && (
                <span className="absolute right-3 top-3 text-muted-foreground">
                  <i className="fa fa-spinner fa-spin"></i>
                </span>
              )}
            </div>
            {selectedPartyData && (
              <Button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-2 bg-destructive/10 text-destructive rounded-xl hover:bg-red-200"
                variant="default">
                Temizle
              </Button>
            )}
          </div>

          {/* Arama Sonuçları */}
          {showResults && parties.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {parties.map((party: Party) => (
                <Button
                  key={party.id}
                  type="button"
                  variant="ghost"
                  onClick={() => handlePartySelect(party)}
                  className="w-full px-4 py-3 text-left hover:bg-primary/10 focus:bg-primary/10 border-b border-border last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {party.firstName} {party.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground space-x-3">
                        {party.tcNumber && (
                          <span>TC: {party.tcNumber}</span>
                        )}
                        {party.phone && (
                          <span>📞 {party.phone}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-primary">→</span>
                  </div>
                </Button>
              ))}
            </div>
          )}

          {/* Sonuç Bulunamadı */}
          {showResults && parties.length === 0 && !isLoading && (
            <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg p-4">
              <p className="text-sm text-muted-foreground text-center">
                Hasta bulunamadı. Yeni hasta bilgilerini manuel girebilirsiniz.
              </p>
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          En az 2 karakter girerek hasta arayabilirsiniz
        </p>
      </div>

      {/* Seçili Hasta Bilgileri */}
      {selectedPartyData && (
        <div className="bg-success/10 border border-green-200 rounded-2xl p-4">
          <div className="flex items-start">
            <CheckCircle className="text-green-400 mr-3 flex-shrink-0" size={24} />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-green-900 mb-2">
                Hasta Seçildi
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Ad Soyad:</span>
                  <span className="ml-2 font-medium text-foreground">
                    {selectedPartyData.firstName} {selectedPartyData.lastName}
                  </span>
                </div>
                {selectedPartyData.tcNumber && (
                  <div>
                    <span className="text-muted-foreground">TC No:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {selectedPartyData.tcNumber}
                    </span>
                  </div>
                )}
                {selectedPartyData.phone && (
                  <div>
                    <span className="text-muted-foreground">Telefon:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {selectedPartyData.phone}
                    </span>
                  </div>
                )}
                {selectedPartyData.email && (
                  <div>
                    <span className="text-muted-foreground">E-posta:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {selectedPartyData.email}
                    </span>
                  </div>
                )}
                {selectedPartyData.addressFull && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Adres:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {selectedPartyData.addressFull}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <CheckCircle className="text-success" size={16} />
                <p className="text-xs text-success">
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
