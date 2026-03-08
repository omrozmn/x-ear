import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import toast from 'react-hot-toast';
import { customInstance } from '@/api/orval-mutator';
import { extractErrorMessage } from '@/utils/error-utils';

interface SegmentOption {
  value: string;
  label: string;
  isCustom?: boolean;
}

interface AcquisitionOption {
  value: string;
  label: string;
  isCustom?: boolean;
}

const INITIAL_SEGMENTS: SegmentOption[] = [
  { value: 'new', label: 'Yeni', isCustom: true },
  { value: 'lead', label: 'Potansiyel Müşteri', isCustom: true },
  { value: 'trial', label: 'Deneme Aşamasında', isCustom: true },
  { value: 'customer', label: 'Müşteri', isCustom: true },
  { value: 'control', label: 'Kontrol Hastası', isCustom: true },
  { value: 'renewal', label: 'Yenileme', isCustom: true },
  { value: 'existing', label: 'Mevcut Hasta', isCustom: true },
  { value: 'vip', label: 'VIP', isCustom: true },
];

const INITIAL_ACQUISITIONS: AcquisitionOption[] = [
  { value: 'referral', label: 'Referans', isCustom: true },
  { value: 'online', label: 'Online', isCustom: true },
  { value: 'walk-in', label: 'Ziyaret', isCustom: true },
  { value: 'social-media', label: 'Sosyal Medya', isCustom: true },
  { value: 'advertisement', label: 'Reklam', isCustom: true },
  { value: 'tabela', label: 'Tabela', isCustom: true },
  { value: 'other', label: 'Diğer', isCustom: true },
];

const STORAGE_KEY_SEGMENTS = 'custom_party_segments';
const STORAGE_KEY_ACQUISITIONS = 'custom_acquisition_types';

export default function PartySegmentsSettings() {
  const [segments, setSegments] = useState<SegmentOption[]>([]);
  const [acquisitions, setAcquisitions] = useState<AcquisitionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [newSegmentLabel, setNewSegmentLabel] = useState('');
  const [newAcquisitionLabel, setNewAcquisitionLabel] = useState('');
  
  const [editingSegment, setEditingSegment] = useState<string | null>(null);
  const [editingAcquisition, setEditingAcquisition] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  
  // Delete confirmation states
  const [deletingSegment, setDeletingSegment] = useState<string | null>(null);
  const [deletingAcquisition, setDeletingAcquisition] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await customInstance<{ data: { segments: SegmentOption[], acquisitionTypes: AcquisitionOption[] } }>({
        url: '/api/settings/party-segments',
        method: 'GET',
      });

      const data = response.data;
      if (data) {
        setSegments(data.segments || []);
        setAcquisitions(data.acquisitionTypes || []);
        
        // Also save to localStorage for offline access
        localStorage.setItem(STORAGE_KEY_SEGMENTS, JSON.stringify(data.segments || []));
        localStorage.setItem(STORAGE_KEY_ACQUISITIONS, JSON.stringify(data.acquisitionTypes || []));
      }
    } catch (error) {
      console.error('Failed to load party segments:', error);
      toast.error('Ayarlar yüklenemedi: ' + extractErrorMessage(error));
      
      // Fallback to localStorage
      try {
        const savedSegments = localStorage.getItem(STORAGE_KEY_SEGMENTS);
        const savedAcquisitions = localStorage.getItem(STORAGE_KEY_ACQUISITIONS);
        
        if (savedSegments && savedAcquisitions) {
          setSegments(JSON.parse(savedSegments));
          setAcquisitions(JSON.parse(savedAcquisitions));
        } else {
          // Use initial defaults
          setSegments(INITIAL_SEGMENTS);
          setAcquisitions(INITIAL_ACQUISITIONS);
        }
      } catch (localError) {
        console.error('Failed to load from localStorage:', localError);
        setSegments(INITIAL_SEGMENTS);
        setAcquisitions(INITIAL_ACQUISITIONS);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSegments: SegmentOption[], newAcquisitions: AcquisitionOption[]) => {
    try {
      setSaving(true);
      
      const payload = {
        segments: newSegments,
        acquisitionTypes: newAcquisitions
      };

      await customInstance({
        url: '/api/settings/party-segments',
        method: 'PUT',
        data: payload,
      });

      // Update localStorage
      localStorage.setItem(STORAGE_KEY_SEGMENTS, JSON.stringify(newSegments));
      localStorage.setItem(STORAGE_KEY_ACQUISITIONS, JSON.stringify(newAcquisitions));
      
      toast.success('Ayarlar kaydedildi');
    } catch (error) {
      console.error('Failed to save party segments:', error);
      toast.error('Kaydetme hatası: ' + extractErrorMessage(error));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const generateValue = (label: string): string => {
    return label
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleAddSegment = async () => {
    if (!newSegmentLabel.trim()) {
      toast.error('Lütfen etiket girin');
      return;
    }

    const newValue = generateValue(newSegmentLabel);
    
    if (segments.find(s => s.value === newValue)) {
      toast.error('Bu etiket için değer zaten mevcut');
      return;
    }

    const newSegment: SegmentOption = {
      value: newValue,
      label: newSegmentLabel.trim(),
      isCustom: true,
    };

    const updatedSegments = [...segments, newSegment];
    
    try {
      await saveSettings(updatedSegments, acquisitions);
      setSegments(updatedSegments);
      setNewSegmentLabel('');
      toast.success('Segment eklendi');
    } catch (error) {
      // Error already handled in saveSettings
    }
  };

  const handleDeleteSegment = async (value: string) => {
    if (deletingSegment === value) {
      // User confirmed deletion, proceed
      const updatedSegments = segments.filter(s => s.value !== value);
      
      try {
        await saveSettings(updatedSegments, acquisitions);
        setSegments(updatedSegments);
        setDeletingSegment(null);
        toast.success('Segment silindi');
      } catch (error) {
        // Error already handled in saveSettings
      }
    } else {
      // Check usage before showing confirmation
      try {
        const response = await customInstance<{ data: { count: number, canDelete: boolean, message: string } }>({
          url: `/api/settings/party-segments/usage/segment/${value}`,
          method: 'GET',
        });

        const usageData = response.data;
        const segment = segments.find(s => s.value === value);
        
        if (usageData.count > 0) {
          toast.error(`⚠️ "${segment?.label}" segmenti ${usageData.count} hasta tarafından kullanılıyor. Silmek istediğinizden emin misiniz? Tekrar tıklayın.`, {
            duration: 6000,
          });
        } else {
          toast.error(`"${segment?.label}" segmentini silmek istediğinizden emin misiniz? Tekrar tıklayın.`, {
            duration: 4000,
          });
        }
        
        setDeletingSegment(value);
      } catch (error) {
        console.error('Failed to check segment usage:', error);
        // Fallback to basic confirmation
        const segment = segments.find(s => s.value === value);
        toast.error(`"${segment?.label}" segmentini silmek istediğinizden emin misiniz? Tekrar tıklayın.`, {
          duration: 4000,
        });
        setDeletingSegment(value);
      }
    }
  };

  const handleCancelDeleteSegment = () => {
    setDeletingSegment(null);
  };

  const handleEditSegment = (value: string) => {
    setEditingSegment(value);
    const segment = segments.find(s => s.value === value);
    if (segment) {
      setEditLabel(segment.label);
    }
  };

  const handleSaveSegmentEdit = async () => {
    if (!editLabel.trim()) {
      toast.error('Label boş olamaz');
      return;
    }

    const updatedSegments = segments.map(s =>
      s.value === editingSegment ? { ...s, label: editLabel.trim() } : s
    );
    
    try {
      await saveSettings(updatedSegments, acquisitions);
      setSegments(updatedSegments);
      setEditingSegment(null);
      setEditLabel('');
      toast.success('Segment güncellendi');
    } catch (error) {
      // Error already handled in saveSettings
    }
  };

  const handleAddAcquisition = async () => {
    if (!newAcquisitionLabel.trim()) {
      toast.error('Lütfen etiket girin');
      return;
    }

    const newValue = generateValue(newAcquisitionLabel);

    if (acquisitions.find(a => a.value === newValue)) {
      toast.error('Bu etiket için değer zaten mevcut');
      return;
    }

    const newAcquisition: AcquisitionOption = {
      value: newValue,
      label: newAcquisitionLabel.trim(),
      isCustom: true,
    };

    const updatedAcquisitions = [...acquisitions, newAcquisition];
    
    try {
      await saveSettings(segments, updatedAcquisitions);
      setAcquisitions(updatedAcquisitions);
      setNewAcquisitionLabel('');
      toast.success('Kazanım türü eklendi');
    } catch (error) {
      // Error already handled in saveSettings
    }
  };

  const handleDeleteAcquisition = async (value: string) => {
    if (deletingAcquisition === value) {
      // User confirmed deletion, proceed
      const updatedAcquisitions = acquisitions.filter(a => a.value !== value);
      
      try {
        await saveSettings(segments, updatedAcquisitions);
        setAcquisitions(updatedAcquisitions);
        setDeletingAcquisition(null);
        toast.success('Kazanım türü silindi');
      } catch (error) {
        // Error already handled in saveSettings
      }
    } else {
      // Check usage before showing confirmation
      try {
        const response = await customInstance<{ data: { count: number, canDelete: boolean, message: string } }>({
          url: `/api/settings/party-segments/usage/acquisition/${value}`,
          method: 'GET',
        });

        const usageData = response.data;
        const acquisition = acquisitions.find(a => a.value === value);
        
        if (usageData.count > 0) {
          toast.error(`⚠️ "${acquisition?.label}" kazanım türü ${usageData.count} hasta tarafından kullanılıyor. Silmek istediğinizden emin misiniz? Tekrar tıklayın.`, {
            duration: 6000,
          });
        } else {
          toast.error(`"${acquisition?.label}" kazanım türünü silmek istediğinizden emin misiniz? Tekrar tıklayın.`, {
            duration: 4000,
          });
        }
        
        setDeletingAcquisition(value);
      } catch (error) {
        console.error('Failed to check acquisition usage:', error);
        // Fallback to basic confirmation
        const acquisition = acquisitions.find(a => a.value === value);
        toast.error(`"${acquisition?.label}" kazanım türünü silmek istediğinizden emin misiniz? Tekrar tıklayın.`, {
          duration: 4000,
        });
        setDeletingAcquisition(value);
      }
    }
  };

  const handleCancelDeleteAcquisition = () => {
    setDeletingAcquisition(null);
  };

  const handleEditAcquisition = (value: string) => {
    setEditingAcquisition(value);
    const acquisition = acquisitions.find(a => a.value === value);
    if (acquisition) {
      setEditLabel(acquisition.label);
    }
  };

  const handleSaveAcquisitionEdit = async () => {
    if (!editLabel.trim()) {
      toast.error('Label boş olamaz');
      return;
    }

    const updatedAcquisitions = acquisitions.map(a =>
      a.value === editingAcquisition ? { ...a, label: editLabel.trim() } : a
    );
    
    try {
      await saveSettings(segments, updatedAcquisitions);
      setAcquisitions(updatedAcquisitions);
      setEditingAcquisition(null);
      setEditLabel('');
      toast.success('Kazanım türü güncellendi');
    } catch (error) {
      // Error already handled in saveSettings
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Ayarlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Hasta Segmentleri</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Hasta segmentlerini ve kazanım türlerini yönetin
            </p>
          </div>
        </div>
      </div>

      {/* Segments Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hasta Segmentleri</h3>
        
        {/* Add New Segment */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Yeni Segment Ekle</h4>
          <div className="flex gap-3">
            <input
              data-allow-raw="true"
              type="text"
              placeholder="Etiket (örn: Premium Müşteri)"
              value={newSegmentLabel}
              onChange={(e) => setNewSegmentLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSegment()}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Button
              onClick={handleAddSegment}
              icon={<Plus className="w-4 h-4" />}
              iconPosition="left"
              disabled={saving}
            >
              {saving ? 'Kaydediliyor...' : 'Ekle'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Değer otomatik oluşturulacak (örn: "Premium Müşteri" → "premium-musteri")
          </p>
        </div>

        {/* Segments List */}
        <div className="space-y-2">
          {segments.map((segment) => (
            <div
              key={segment.value}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              {editingSegment === segment.value ? (
                <div className="flex items-center space-x-2 flex-1">
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-400 min-w-[120px]">
                    {segment.value}
                  </span>
                  <input
                    data-allow-raw="true"
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveSegmentEdit}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingSegment(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400 min-w-[120px]">
                      {segment.value}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {segment.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditSegment(segment.value)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {deletingSegment === segment.value ? (
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSegment(segment.value)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <span className="text-xs font-medium">Evet, Sil</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelDeleteSegment}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSegment(segment.value)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Acquisition Types Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kazanım Türleri</h3>
        
        {/* Add New Acquisition */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Yeni Kazanım Türü Ekle</h4>
          <div className="flex gap-3">
            <input
              data-allow-raw="true"
              type="text"
              placeholder="Etiket (örn: İş Ortağı)"
              value={newAcquisitionLabel}
              onChange={(e) => setNewAcquisitionLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAcquisition()}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Button
              onClick={handleAddAcquisition}
              icon={<Plus className="w-4 h-4" />}
              iconPosition="left"
              disabled={saving}
            >
              {saving ? 'Kaydediliyor...' : 'Ekle'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Değer otomatik oluşturulacak (örn: "İş Ortağı" → "is-ortagi")
          </p>
        </div>

        {/* Acquisitions List */}
        <div className="space-y-2">
          {acquisitions.map((acquisition) => (
            <div
              key={acquisition.value}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              {editingAcquisition === acquisition.value ? (
                <div className="flex items-center space-x-2 flex-1">
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-400 min-w-[120px]">
                    {acquisition.value}
                  </span>
                  <input
                    data-allow-raw="true"
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveAcquisitionEdit}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingAcquisition(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400 min-w-[120px]">
                      {acquisition.value}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {acquisition.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditAcquisition(acquisition.value)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {deletingAcquisition === acquisition.value ? (
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAcquisition(acquisition.value)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <span className="text-xs font-medium">Evet, Sil</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelDeleteAcquisition}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteAcquisition(acquisition.value)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
