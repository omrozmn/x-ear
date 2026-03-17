import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Trash2, Edit2, X, Check, ChevronDown, ChevronUp, ClipboardList, Loader2 } from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import toast from 'react-hot-toast';
import { customInstance } from '@/api/orval-mutator';
import { extractErrorMessage } from '@/utils/error-utils';
import { SettingsSectionHeader } from '../../components/layout/SettingsSectionHeader';
import { useTranslation } from 'react-i18next';

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

interface AnamnesisQuestionTemplate {
  id: string;
  question: string;
  category: string;
  type: 'text' | 'select' | 'multiselect';
  options?: string[];
  required?: boolean;
}

const CollapsibleSettingsSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-border">
      <button
        data-allow-raw="true"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between cursor-pointer hover:bg-muted dark:hover:bg-gray-700/50 transition-colors rounded-2xl"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      {isOpen && <div className="px-6 pb-6 border-t dark:border-gray-700">{children}</div>}
    </div>
  );
};

const ANAMNESIS_CATEGORIES = [
  { value: 'isitme_kaybi', label: 'Isitme Kaybi' },
  { value: 'semptom', label: 'Semptomlar' },
  { value: 'oykü', label: 'Aile Oykusu' },
  { value: 'tibbi_gecmis', label: 'Tibbi Gecmis' },
  { value: 'risk_faktorleri', label: 'Risk Faktorleri' },
  { value: 'cihaz', label: 'Cihaz Gecmisi' },
  { value: 'beklenti', label: 'Beklentiler' },
  { value: 'diger', label: 'Diger' },
];

export default function PartySegmentsSettings() {
  const { t } = useTranslation('settings');
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

  // Anamnesis question templates
  const [anamnesisQuestions, setAnamnesisQuestions] = useState<AnamnesisQuestionTemplate[]>([]);
  const [useDefaults, setUseDefaults] = useState(true);
  const [savingAnamnesis, setSavingAnamnesis] = useState(false);
  const [newQ, setNewQ] = useState({ question: '', category: 'diger', type: 'text' as 'text' | 'select' | 'multiselect', required: false });
  const [newOption, setNewOption] = useState('');
  const [newQOptions, setNewQOptions] = useState<string[]>([]);

  const loadAnamnesisQuestions = useCallback(async () => {
    try {
      const response = await customInstance<unknown>({
        url: '/api/settings/anamnesis-questions',
        method: 'GET',
      });
      const envelope = response as Record<string, unknown>;
      const data = (envelope?.data ?? envelope) as Record<string, unknown>;
      const questions = (data?.questions ?? []) as AnamnesisQuestionTemplate[];
      if (questions.length > 0) {
        setAnamnesisQuestions(questions);
        setUseDefaults(false);
      } else {
        // No custom questions saved — load defaults from party endpoint
        try {
          const defaultsRes = await customInstance<unknown>({
            url: '/api/settings/anamnesis-questions/defaults',
            method: 'GET',
          });
          const dEnv = defaultsRes as Record<string, unknown>;
          const dData = (dEnv?.data ?? dEnv) as Record<string, unknown>;
          const defaultQs = (dData?.questions ?? []) as AnamnesisQuestionTemplate[];
          setAnamnesisQuestions(defaultQs);
        } catch {
          setAnamnesisQuestions([]);
        }
        setUseDefaults(true);
      }
    } catch {
      // Keep defaults
    }
  }, []);

  const saveAnamnesisQuestions = async (questions: AnamnesisQuestionTemplate[]) => {
    setSavingAnamnesis(true);
    try {
      await customInstance({
        url: '/api/settings/anamnesis-questions',
        method: 'PUT',
        data: { questions, useDefaults: questions.length === 0 },
      });
      setAnamnesisQuestions(questions);
      setUseDefaults(questions.length === 0);
      toast.success(t('anamnesis.save_success', 'Anamnez sorulari kaydedildi'));
    } catch (error) {
      toast.error(t('anamnesis.save_error', 'Kaydetme hatasi: ') + extractErrorMessage(error));
    } finally {
      setSavingAnamnesis(false);
    }
  };

  const handleAddAnamnesisQuestion = () => {
    if (!newQ.question.trim()) {
      toast.error(t('anamnesis.question_required', 'Soru metni gerekli'));
      return;
    }
    const q: AnamnesisQuestionTemplate = {
      id: `q_${Date.now()}`,
      question: newQ.question.trim(),
      category: newQ.category,
      type: newQ.type,
      required: newQ.required,
      ...(newQ.type !== 'text' && newQOptions.length > 0 ? { options: newQOptions } : {}),
    };
    const updated = [...anamnesisQuestions, q];
    saveAnamnesisQuestions(updated);
    setNewQ({ question: '', category: 'diger', type: 'text', required: false });
    setNewQOptions([]);
  };

  const handleDeleteAnamnesisQuestion = (id: string) => {
    const updated = anamnesisQuestions.filter(q => q.id !== id);
    saveAnamnesisQuestions(updated);
  };

  const handleToggleRequired = (id: string) => {
    const updated = anamnesisQuestions.map(q =>
      q.id === id ? { ...q, required: !q.required } : q
    );
    saveAnamnesisQuestions(updated);
  };

  useEffect(() => {
    loadSettings();
    loadAnamnesisQuestions();
  }, [loadAnamnesisQuestions]);

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
          <p className="text-muted-foreground">Ayarlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
      <SettingsSectionHeader
        title={t('party.title', 'Hasta Ayarlari')}
        description={t('party.description', 'Hasta segmentlerini, kazanim turlerini ve anamnez sorularini yonetin')}
        icon={<Users className="w-6 h-6" />}
      />
      </div>

      {/* Segments Section */}
      <CollapsibleSettingsSection
        title={t('party.segments_title', 'Hasta Segmentleri')}
        icon={<Users className="w-5 h-5 text-muted-foreground" />}
        defaultOpen={true}
      >
        
        {/* Add New Segment */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
          <h4 className="text-sm font-medium text-foreground mb-3">Yeni Segment Ekle</h4>
          <div className="flex gap-3">
            <input
              data-allow-raw="true"
              type="text"
              placeholder="Etiket (örn: Premium Müşteri)"
              value={newSegmentLabel}
              onChange={(e) => setNewSegmentLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSegment()}
              className="flex-1 px-3 py-2 border border-border rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-ring focus:border-blue-500"
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
          <p className="text-xs text-muted-foreground mt-2">
            Değer otomatik oluşturulacak (örn: "Premium Müşteri" → "premium-musteri")
          </p>
        </div>

        {/* Segments List */}
        <div className="space-y-2">
          {segments.map((segment) => (
            <div
              key={segment.value}
              className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl hover:bg-muted dark:hover:bg-gray-900 transition-colors"
            >
              {editingSegment === segment.value ? (
                <div className="flex items-center space-x-2 flex-1">
                  <span className="text-sm font-mono text-muted-foreground min-w-[120px]">
                    {segment.value}
                  </span>
                  <input
                    data-allow-raw="true"
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1 px-3 py-1 border border-border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
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
                    <span className="text-sm font-mono text-muted-foreground min-w-[120px]">
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
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <span className="text-xs font-medium">Evet, Sil</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelDeleteSegment}
                          className="text-muted-foreground hover:text-foreground"
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
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </CollapsibleSettingsSection>

      {/* Acquisition Types Section */}
      <CollapsibleSettingsSection
        title={t('party.acquisitions_title', 'Kazanim Turleri')}
        icon={<Users className="w-5 h-5 text-muted-foreground" />}
        defaultOpen={true}
      >
        
        {/* Add New Acquisition */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
          <h4 className="text-sm font-medium text-foreground mb-3">Yeni Kazanım Türü Ekle</h4>
          <div className="flex gap-3">
            <input
              data-allow-raw="true"
              type="text"
              placeholder="Etiket (örn: İş Ortağı)"
              value={newAcquisitionLabel}
              onChange={(e) => setNewAcquisitionLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAcquisition()}
              className="flex-1 px-3 py-2 border border-border rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-ring focus:border-blue-500"
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
          <p className="text-xs text-muted-foreground mt-2">
            Değer otomatik oluşturulacak (örn: "İş Ortağı" → "is-ortagi")
          </p>
        </div>

        {/* Acquisitions List */}
        <div className="space-y-2">
          {acquisitions.map((acquisition) => (
            <div
              key={acquisition.value}
              className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl hover:bg-muted dark:hover:bg-gray-900 transition-colors"
            >
              {editingAcquisition === acquisition.value ? (
                <div className="flex items-center space-x-2 flex-1">
                  <span className="text-sm font-mono text-muted-foreground min-w-[120px]">
                    {acquisition.value}
                  </span>
                  <input
                    data-allow-raw="true"
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1 px-3 py-1 border border-border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
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
                    <span className="text-sm font-mono text-muted-foreground min-w-[120px]">
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
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <span className="text-xs font-medium">Evet, Sil</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelDeleteAcquisition}
                          className="text-muted-foreground hover:text-foreground"
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
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </CollapsibleSettingsSection>

      {/* Anamnesis Questions Section */}
      <CollapsibleSettingsSection
        title={t('anamnesis.title', 'Anamnez Sorulari')}
        icon={<ClipboardList className="w-5 h-5 text-muted-foreground" />}
        defaultOpen={false}
      >
        <div className="pt-4 space-y-4">
          {useDefaults && anamnesisQuestions.length > 0 && (
            <div className="p-3 bg-primary/10 rounded-xl text-sm text-primary">
              {t('anamnesis.defaults_info', 'Varsayılan odyoloji soruları gösteriliyor. Düzenleyebilir, silebilir veya yeni sorular ekleyebilirsiniz.')}
            </div>
          )}
          {useDefaults && anamnesisQuestions.length === 0 && (
            <div className="p-3 bg-warning/10 rounded-xl text-sm text-yellow-700 dark:text-yellow-300">
              {t('anamnesis.no_defaults', 'Varsayılan sorular yüklenemedi.')}
            </div>
          )}

          {/* Add New Question */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl space-y-3">
            <h4 className="text-sm font-medium text-foreground">{t('anamnesis.add_question', 'Yeni Soru Ekle')}</h4>
            <input
              data-allow-raw="true"
              type="text"
              placeholder={t('anamnesis.question_placeholder', 'Soru metni yazin...')}
              value={newQ.question}
              onChange={e => setNewQ(prev => ({ ...prev, question: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-ring"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('anamnesis.category', 'Kategori')}</label>
                <select
                  data-allow-raw="true"
                  value={newQ.category}
                  onChange={e => setNewQ(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  {ANAMNESIS_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('anamnesis.answer_type', 'Cevap Tipi')}</label>
                <select
                  data-allow-raw="true"
                  value={newQ.type}
                  onChange={e => setNewQ(prev => ({ ...prev, type: e.target.value as 'text' | 'select' | 'multiselect' }))}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="text">{t('anamnesis.type_text', 'Metin')}</option>
                  <option value="select">{t('anamnesis.type_select', 'Tek Secim')}</option>
                  <option value="multiselect">{t('anamnesis.type_multiselect', 'Coklu Secim')}</option>
                </select>
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    data-allow-raw="true"
                    type="checkbox"
                    checked={newQ.required}
                    onChange={e => setNewQ(prev => ({ ...prev, required: e.target.checked }))}
                    className="rounded border-border"
                  />
                  {t('anamnesis.required', 'Zorunlu')}
                </label>
              </div>
            </div>

            {newQ.type !== 'text' && (
              <div className="space-y-2">
                <label className="block text-xs text-muted-foreground">{t('anamnesis.options', 'Secenekler')}</label>
                <div className="flex gap-2">
                  <input
                    data-allow-raw="true"
                    type="text"
                    placeholder={t('anamnesis.option_placeholder', 'Secenek ekle...')}
                    value={newOption}
                    onChange={e => setNewOption(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newOption.trim()) {
                        setNewQOptions(prev => [...prev, newOption.trim()]);
                        setNewOption('');
                      }
                    }}
                    className="flex-1 px-3 py-1.5 border border-border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newOption.trim()) {
                        setNewQOptions(prev => [...prev, newOption.trim()]);
                        setNewOption('');
                      }
                    }}
                    icon={<Plus className="w-3 h-3" />}
                    iconPosition="left"
                  >
                    {t('anamnesis.add', 'Ekle')}
                  </Button>
                </div>
                {newQOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newQOptions.map((opt, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-blue-800 dark:text-blue-200 text-xs rounded-lg">
                        {opt}
                        <button
                          data-allow-raw="true"
                          type="button"
                          onClick={() => setNewQOptions(prev => prev.filter((_, idx) => idx !== i))}
                          className="hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleAddAnamnesisQuestion}
              icon={savingAnamnesis ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              iconPosition="left"
              disabled={savingAnamnesis || !newQ.question.trim()}
            >
              {savingAnamnesis ? t('common.saving', 'Kaydediliyor...') : t('anamnesis.add_question_btn', 'Soru Ekle')}
            </Button>
          </div>

          {/* Questions List */}
          {anamnesisQuestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">
                {t('anamnesis.questions_list', 'Sorular')} ({anamnesisQuestions.length})
              </h4>
              {anamnesisQuestions.map(q => (
                <div
                  key={q.id}
                  className="flex items-start justify-between p-3 bg-gray-50/50 rounded-xl hover:bg-muted dark:hover:bg-gray-900 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{q.question}</span>
                      {q.required && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded">
                          {t('anamnesis.required', 'Zorunlu')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="px-1.5 py-0.5 bg-accent rounded">
                        {ANAMNESIS_CATEGORIES.find(c => c.value === q.category)?.label || q.category}
                      </span>
                      <span className="px-1.5 py-0.5 bg-accent rounded">
                        {q.type === 'text' ? t('anamnesis.type_text', 'Metin') : q.type === 'select' ? t('anamnesis.type_select', 'Tek Secim') : t('anamnesis.type_multiselect', 'Coklu Secim')}
                      </span>
                      {q.options && q.options.length > 0 && (
                        <span>{q.options.length} {t('anamnesis.option_count', 'secenek')}</span>
                      )}
                    </div>
                    {q.options && q.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {q.options.map((o, i) => (
                          <span key={i} className="text-[11px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                            {o}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleRequired(q.id)}
                      title={q.required ? t('anamnesis.make_optional', 'Opsiyonel yap') : t('anamnesis.make_required', 'Zorunlu yap')}
                    >
                      {q.required ? <Check className="w-4 h-4 text-success" /> : <Check className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteAnamnesisQuestion(q.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSettingsSection>
    </div>
  );
}
