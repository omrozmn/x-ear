import React, { useState, useCallback, useMemo } from 'react';
import { Users, AlertTriangle, CheckCircle, X, Eye, Merge, Phone, Mail, Calendar, User, Settings, Search } from 'lucide-react';
import { Button, Modal, useModal, Card, Badge, useToastHelpers, Checkbox, Input, Select } from '@x-ear/ui-web';
import { Party } from '../../types/party';
import {
  PartyMatcher,
  PartyMatch,
  DEFAULT_MATCHING_CONFIG,
  getMatchColor,
  getRiskColor
} from '../../utils/party-matching';

interface PartyMatchingProps {
  parties: Party[];
  onMergeParties: (primaryId: string, duplicateIds: string[]) => void;
  onRefresh: () => void;
}

interface MergePreview {
  primary: Party;
  duplicates: Party[];
  mergedData: Partial<Party>;
  conflicts: Array<{
    field: string;
    values: Array<{ partyId: string; value: any; partyName: string }>;
  }>;
}

export const PartyMatching: React.FC<PartyMatchingProps> = ({
  parties,
  onMergeParties,
  onRefresh
}) => {
  const [matches, setMatches] = useState<PartyMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<PartyMatch | null>(null);
  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterConfidence, setFilterConfidence] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [matchingConfig] = useState(DEFAULT_MATCHING_CONFIG);
  const [autoMergeEnabled, setAutoMergeEnabled] = useState(false);

  const detailModal = useModal();
  const mergeModal = useModal();
  const settingsModal = useModal();
  const { success, error } = useToastHelpers();

  // Party matcher instance
  const partyMatcher = useMemo(() => new PartyMatcher(matchingConfig), [matchingConfig]);

  // Hasta eşleştirmelerini analiz et
  const analyzeMatches = useCallback(async () => {
    setIsAnalyzing(true);

    try {
      const foundMatches = partyMatcher.findAllMatches(parties);
      setMatches(foundMatches);
      success(`${foundMatches.length} potansiyel eşleşme bulundu`);

    } catch (err) {
      error('Eşleşme analizi sırasında hata oluştu');
    } finally {
      setIsAnalyzing(false);
    }
  }, [parties, partyMatcher, success, error]);

  // Birleştirme önizlemesi oluştur
  const createMergePreview = useCallback((match: PartyMatch) => {
    const [primary, ...duplicates] = match.parties;
    const conflicts: MergePreview['conflicts'] = [];
    const mergedData: Partial<Party> = { ...primary };

    // Çakışmaları tespit et
    const fields = ['name', 'phone', 'email', 'birthDate', 'address'];

    fields.forEach(field => {
      const values = match.parties
        .map(p => ({
          partyId: p.id || '',
          value: (p as unknown as Record<string, unknown>)[field],
          partyName: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown'
        }))
        .filter(v => v.value && v.partyId);

      if (values.length > 1) {
        const uniqueValues = [...new Set(values.map(v => v.value))];
        if (uniqueValues.length > 1) {
          conflicts.push({ field, values });
        }
      }
    });

    return {
      primary,
      duplicates,
      mergedData,
      conflicts
    };
  }, []);

  // Eşleşme detayını göster
  const showMatchDetail = useCallback((match: PartyMatch) => {
    setSelectedMatch(match);
    detailModal.openModal();
  }, [detailModal]);

  // Birleştirme modalını aç
  const showMergeModal = useCallback((match: PartyMatch) => {
    const preview = createMergePreview(match);
    setMergePreview(preview);
    setSelectedMatch(match);
    mergeModal.openModal();
  }, [createMergePreview, mergeModal]);

  // Hastaları birleştir
  const handleMergeParties = useCallback(async () => {
    if (!selectedMatch || !mergePreview) return;

    try {
      const primaryId = mergePreview.primary.id;
      const duplicateIds = mergePreview.duplicates.map(p => p.id).filter(Boolean) as string[];

      if (!primaryId) {
        throw new Error('Primary party ID is required');
      }

      await onMergeParties(primaryId, duplicateIds);

      // Eşleşmeyi güncelle
      setMatches(prev => prev.map(m =>
        m.id === selectedMatch.id
          ? { ...m, status: 'merged' as const }
          : m
      ));

      success('Hastalar başarıyla birleştirildi');
      mergeModal.closeModal();
      onRefresh();

    } catch (err) {
      error('Hasta birleştirme sırasında hata oluştu');
    }
  }, [selectedMatch, mergePreview, onMergeParties, success, error, mergeModal, onRefresh]);

  // Eşleşmeyi yoksay
  const ignoreMatch = useCallback((matchId: string) => {
    setMatches(prev => prev.map(m =>
      m.id === matchId
        ? { ...m, status: 'ignored' as const }
        : m
    ));
  }, []);

  // Filtrelenmiş eşleşmeler
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      // Status filtresi
      if (filterStatus !== 'all' && match.status !== filterStatus) return false;

      // Confidence filtresi
      if (filterConfidence !== 'all' && match.confidence !== filterConfidence) return false;

      // Risk filtresi
      if (filterRisk !== 'all' && match.riskLevel !== filterRisk) return false;

      // Arama filtresi
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = match.parties.some(party =>
          party.firstName?.toLowerCase().includes(searchLower) ||
          party.lastName?.toLowerCase().includes(searchLower) ||
          party.phone?.includes(searchTerm) ||
          party.email?.toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [matches, filterStatus, filterConfidence, filterRisk, searchTerm]);

  // Bekleyen eşleşmeler
  const pendingMatches = useMemo(() =>
    filteredMatches.filter(m => m.status === 'pending'),
    [filteredMatches]
  );

  // Güven seviyesi etiketi
  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'Yüksek';
      case 'medium': return 'Orta';
      case 'low': return 'Düşük';
      default: return 'Bilinmeyen';
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık ve Kontroller */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Hasta Eşleştirme</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Potansiyel duplikat hastaları tespit edin ve birleştirin
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={autoMergeEnabled}
              onChange={(e) => setAutoMergeEnabled(e.target.checked)}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Otomatik birleştirme</span>
          </div>

          <Button
            variant="outline"
            onClick={() => settingsModal.openModal()}
          >
            <Settings className="w-4 h-4 mr-2" />
            Ayarlar
          </Button>

          <Button
            onClick={analyzeMatches}
            loading={isAnalyzing}
            disabled={parties.length < 2}
          >
            <Users className="w-4 h-4 mr-2" />
            Analiz Et
          </Button>
        </div>
      </div>

      {/* Filtreler */}
      {matches.length > 0 && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Arama
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Hasta ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>



            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Durum
              </label>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: 'all', label: 'Tümü' },
                  { value: 'pending', label: 'Beklemede' },
                  { value: 'reviewed', label: 'İncelendi' },
                  { value: 'merged', label: 'Birleştirildi' },
                  { value: 'ignored', label: 'Yoksayıldı' }
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Güven Seviyesi
              </label>
              <Select
                value={filterConfidence}
                onChange={(e) => setFilterConfidence(e.target.value)}
                options={[
                  { value: 'all', label: 'Tümü' },
                  { value: 'high', label: 'Yüksek' },
                  { value: 'medium', label: 'Orta' },
                  { value: 'low', label: 'Düşük' }
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Risk Seviyesi
              </label>
              <Select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                options={[
                  { value: 'all', label: 'Tümü' },
                  { value: 'critical', label: 'Kritik' },
                  { value: 'high', label: 'Yüksek' },
                  { value: 'medium', label: 'Orta' },
                  { value: 'low', label: 'Düşük' }
                ]}
              />
            </div>
          </div>
        </Card>
      )
      }

      {/* İstatistikler */}
      {
        matches.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Eşleşme</p>
                  <p className="text-xl font-semibold dark:text-white">{matches.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Yüksek Güven</p>
                  <p className="text-xl font-semibold dark:text-white">
                    {matches.filter(m => m.confidence === 'high').length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Birleştirildi</p>
                  <p className="text-xl font-semibold dark:text-white">
                    {matches.filter(m => m.status === 'merged').length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <X className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Beklemede</p>
                  <p className="text-xl font-semibold dark:text-white">{pendingMatches.length}</p>
                </div>
              </div>
            </Card>
          </div>
        )
      }

      {
        filteredMatches.length > 0 ? (
          <div className="space-y-4">
            {filteredMatches.map(match => (
              <Card key={match.id} className="p-4 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Badge className={getMatchColor(match.confidence)}>
                        {getConfidenceLabel(match.confidence)} Güven
                      </Badge>
                      <Badge className={getRiskColor(match.riskLevel)}>
                        {match.riskLevel} Risk
                      </Badge>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        %{Math.round(match.similarity * 100)} benzerlik
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      {match.parties.map((party) => (
                        <div key={party.id} className="border dark:border-gray-700 rounded-lg p-3 dark:bg-gray-700/30">
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="font-medium dark:text-white">{party.firstName} {party.lastName}</span>
                          </div>

                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            {party.phone && (
                              <div className="flex items-center space-x-2">
                                <Phone className="w-3 h-3" />
                                <span>{party.phone}</span>
                              </div>
                            )}

                            {party.email && (
                              <div className="flex items-center space-x-2">
                                <Mail className="w-3 h-3" />
                                <span>{party.email}</span>
                              </div>
                            )}

                            {party.birthDate && (
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-3 h-3" />
                                <span>{party.birthDate}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <strong className="text-gray-700 dark:text-gray-300">Eşleşme Nedenleri:</strong> {match.matchReasons.join(', ')}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => showMatchDetail(match)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => showMergeModal(match)}
                      disabled={match.status !== 'pending'}
                    >
                      <Merge className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => ignoreMatch(match.id)}
                      disabled={match.status !== 'pending'}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : matches.length > 0 ? (
          <Card className="p-8 text-center dark:bg-gray-800 dark:border-gray-700">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Filtre kriterlerine uygun eşleşme bulunamadı
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Farklı filtre seçeneklerini deneyin veya filtreleri temizleyin.
            </p>
          </Card>
        ) : (
          <Card className="p-8 text-center dark:bg-gray-800 dark:border-gray-700">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Henüz analiz yapılmadı
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Potansiyel duplikat hastaları bulmak için analiz başlatın.
            </p>
            <Button onClick={analyzeMatches} disabled={parties.length < 2}>
              <Users className="w-4 h-4 mr-2" />
              Analiz Et
            </Button>
          </Card>
        )
      }

      {/* Detay Modal */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={detailModal.closeModal}
        title="Eşleşme Detayları"
        size="lg"
      >
        {selectedMatch && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Badge className={getMatchColor(selectedMatch.confidence)}>
                {getConfidenceLabel(selectedMatch.confidence)} Güven
              </Badge>
              <Badge className={getRiskColor(selectedMatch.riskLevel)}>
                {selectedMatch.riskLevel} Risk
              </Badge>
              <span className="text-sm text-gray-600">
                %{Math.round(selectedMatch.similarity * 100)} benzerlik
              </span>
            </div>

            <div>
              <h4 className="font-medium mb-2 dark:text-gray-200">Eşleşme Nedenleri:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {selectedMatch.matchReasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2 dark:text-gray-200">Hasta Bilgileri:</h4>
              <div className="space-y-3">
                {selectedMatch.parties.map((party, index) => (
                  <div key={party.id} className="border dark:border-gray-700 rounded-lg p-3 dark:bg-gray-800">
                    <h5 className="font-medium mb-2 dark:text-white">Hasta {index + 1}: {party.firstName} {party.lastName}</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm dark:text-gray-400">
                      <div><strong>Telefon:</strong> {party.phone || 'Yok'}</div>
                      <div><strong>E-posta:</strong> {party.email || 'Yok'}</div>
                      <div><strong>Doğum Tarihi:</strong> {party.birthDate || 'Yok'}</div>
                      <div><strong>Adres:</strong> {(() => {
                        const address = party.address;
                        if (typeof address === 'object' && address !== null) {
                          interface AddressObj { fullAddress?: string; district?: string; city?: string; }
                          const addressObj = address as AddressObj;
                          return addressObj.fullAddress ||
                            `${addressObj.district || ''} ${addressObj.city || ''}`.trim() ||
                            'Yok';
                        }
                        return party.addressFull || (typeof address === 'string' ? address : '') || 'Yok';
                      })()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Birleştirme Modal */}
      <Modal
        isOpen={mergeModal.isOpen}
        onClose={mergeModal.closeModal}
        title="Hastaları Birleştir"
        size="lg"
      >
        {mergePreview && (
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                <span className="font-medium text-yellow-800 dark:text-yellow-400">Dikkat</span>
              </div>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                Bu işlem geri alınamaz. Seçilen hastalar birleştirilecek ve duplikat kayıtlar silinecektir.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2 dark:text-white">Ana Hasta (Korunacak):</h4>
              <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50 dark:bg-green-900/20">
                <div className="font-medium dark:text-green-300">{`${mergePreview.primary.firstName || ''} ${mergePreview.primary.lastName || ''}`.trim() || 'Unknown'}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {mergePreview.primary.phone} • {mergePreview.primary.email}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2 dark:text-white">Silinecek Hastalar:</h4>
              <div className="space-y-2">
                {mergePreview.duplicates.map(party => (
                  <div key={party.id} className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-900/20">
                    <div className="font-medium dark:text-red-300">{party.firstName} {party.lastName}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {party.phone} • {party.email}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {mergePreview.conflicts.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-orange-600 dark:text-orange-400">Çakışan Alanlar:</h4>
                <div className="space-y-2">
                  {mergePreview.conflicts.map((conflict, index) => (
                    <div key={index} className="border border-orange-200 dark:border-orange-800 rounded-lg p-3 bg-orange-50 dark:bg-orange-900/20">
                      <div className="font-medium capitalize dark:text-orange-300">{conflict.field}</div>
                      <div className="space-y-1 mt-1">
                        {conflict.values.map((value, valueIndex) => (
                          <div key={valueIndex} className="text-sm dark:text-gray-300">
                            <strong className="dark:text-white">{value.partyName}:</strong> {value.value}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={mergeModal.closeModal}
              >
                İptal
              </Button>
              <Button
                onClick={handleMergeParties}
                className="bg-red-600 hover:bg-red-700"
              >
                Birleştir
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div >
  );
};

export default PartyMatching;