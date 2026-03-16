import React, { useState, useEffect, useCallback } from 'react';
import { Party } from '../../types/party/party-base.types';
import { User, Phone, Mail, MapPin, Tag, AlertCircle, ChevronDown, ChevronUp, ClipboardList, Save, Loader2, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal, Input, Textarea } from '@x-ear/ui-web';
import { customInstance } from '../../api/orval-mutator';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';

interface CollapsibleCardProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({ title, icon, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl shadow-sm">
      <button
        data-allow-raw="true"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-2xl"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-6 border-t dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
};

interface AnamnesisQuestion {
  id: string;
  question: string;
  category: string;
  type: 'text' | 'select' | 'multiselect';
  options?: string[];
  answer?: string | null;
  answers?: string[] | null;
  required?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  isitme_kaybi: 'Isitme Kaybi',
  semptom: 'Semptomlar',
  oykü: 'Aile Oykusu',
  tibbi_gecmis: 'Tibbi Gecmis',
  risk_faktorleri: 'Risk Faktorleri',
  cihaz: 'Cihaz Gecmisi',
  beklenti: 'Beklentiler',
  diger: 'Diger',
};

const AnamnesisCard: React.FC<{ partyId: string }> = ({ partyId }) => {
  const [questions, setQuestions] = useState<AnamnesisQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadAnamnesis = useCallback(async () => {
    try {
      setLoading(true);
      const response = await customInstance<unknown>({
        url: `/api/parties/${partyId}/anamnesis`,
        method: 'GET',
      });
      const envelope = response as Record<string, unknown>;
      const data = (envelope?.data ?? envelope) as Record<string, unknown>;
      setQuestions((data?.questions ?? []) as AnamnesisQuestion[]);
    } catch {
      // Leave empty
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  useEffect(() => { loadAnamnesis(); }, [loadAnamnesis]);

  const handleAnswer = (qId: string, value: string) => {
    setQuestions(prev => prev.map(q =>
      q.id === qId ? { ...q, answer: value } : q
    ));
    setSaved(false);
  };

  const handleMultiAnswer = (qId: string, option: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const current = q.answers || [];
      const updated = current.includes(option)
        ? current.filter(a => a !== option)
        : [...current, option];
      return { ...q, answers: updated };
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const responses = questions.map(q => ({
        questionId: q.id,
        answer: q.answer || null,
        answers: q.answers || null,
      }));
      await customInstance({
        url: `/api/parties/${partyId}/anamnesis`,
        method: 'PUT',
        data: { responses },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Yukluyor...</span>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="pt-4 text-center text-sm text-gray-500 dark:text-gray-400 py-8">
        Henuz anamnez sorusu tanimlanmamis. Hasta Ayarlarindan soru ekleyebilirsiniz.
      </div>
    );
  }

  const grouped = questions.reduce<Record<string, AnamnesisQuestion[]>>((acc, q) => {
    const cat = q.category || 'diger';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(q);
    return acc;
  }, {});

  return (
    <div className="pt-4 space-y-6">
      {Object.entries(grouped).map(([category, catQuestions]) => (
        <div key={category}>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {CATEGORY_LABELS[category] || category}
          </h4>
          <div className="space-y-3">
            {catQuestions.map(q => (
              <div key={q.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                  {q.question}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {q.type === 'text' && (
                  <Textarea
                    data-allow-raw="true"
                    value={q.answer || ''}
                    onChange={(e) => handleAnswer(q.id, e.target.value)}
                    rows={2}
                    className="w-full text-sm"
                    placeholder="Yanitinizi yazin..."
                  />
                )}
                {q.type === 'select' && q.options && (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map(opt => (
                      <button
                        data-allow-raw="true"
                        key={opt}
                        type="button"
                        onClick={() => handleAnswer(q.id, opt)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                          q.answer === opt
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === 'multiselect' && q.options && (
                  <div className="flex flex-wrap gap-2">
                    {q.options.map(opt => {
                      const selected = (q.answers || []).includes(opt);
                      return (
                        <button
                          data-allow-raw="true"
                          key={opt}
                          type="button"
                          onClick={() => handleMultiAnswer(q.id, opt)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                            selected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Save Button */}
      <div className="flex justify-end pt-2 border-t dark:border-gray-700">
        <Button
          onClick={handleSave}
          disabled={saving}
          data-allow-raw="true"
          className="premium-gradient tactile-press text-white"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Kaydediliyor...</>
          ) : saved ? (
            <><Check className="w-4 h-4 mr-2" /> Kaydedildi</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Kaydet</>
          )}
        </Button>
      </div>
    </div>
  );
};

interface PartyOverviewTabProps {
  party: Party;
  onPartyUpdate?: (party: Party) => void;
  showNoteModal?: boolean;
  onCloseNoteModal?: () => void;
}

export const PartyOverviewTab: React.FC<PartyOverviewTabProps> = ({
  party,
  // onPartyUpdate, // Available but not used in this tab
  showNoteModal = false,
  onCloseNoteModal,
}) => {
  const { t } = useTranslation('patients');
  const { hasPermission } = usePermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const canViewContact = hasPermission('sensitive.parties.detail.contact.view');
  const canViewIdentity = hasPermission('sensitive.parties.detail.identity.view');
  const canViewNotes = hasPermission('sensitive.parties.detail.notes.view');

  const getProtectedValue = (value: string | null | undefined, canView: boolean, emptyFallback = 'Belirtilmemis') => {
    if (!canView) {
      return 'Bu rol icin gizli';
    }

    return value || emptyFallback;
  };

  // Use external control for modal state
  const isModalOpen = showNoteModal;

  if (!party) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Hasta Bulunamadı</h3>
        <p className="text-gray-500">Hasta bilgileri yüklenirken bir hata oluştu.</p>
      </div>
    );
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };



  const handleNoteSave = async () => {
    if (!noteContent.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement note saving logic
      console.log('Saving note:', {
        partyId: party.id,
        title: noteTitle || 'Not',
        content: noteContent
      });

      // Close modal and reset form
      if (onCloseNoteModal) {
        onCloseNoteModal();
      }
      setNoteTitle('');
      setNoteContent('');
    } catch (error) {
      console.error('Note save failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    if (onCloseNoteModal) {
      onCloseNoteModal();
    }
    setNoteTitle('');
    setNoteContent('');
  };

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <CollapsibleCard title={t('overview.personal_info', 'Kisisel Bilgiler')} icon={<User className="w-5 h-5 text-gray-500" />} defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ad Soyad</p>
                <p className="text-sm text-gray-900 dark:text-white">{party.firstName} {party.lastName}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Telefon</p>
                <p className="text-sm text-gray-900 dark:text-white">{getProtectedValue(party.phone, canViewContact)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">E-posta</p>
                <p className="text-sm text-gray-900 dark:text-white">{getProtectedValue(party.email, canViewContact)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cinsiyet</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {party.gender === 'M' || party.gender === 'm' ? 'Erkek' : party.gender === 'F' || party.gender === 'f' ? 'Kadin' : 'Belirtilmemis'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Tag className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">TC Kimlik No</p>
                <p className="text-sm text-gray-900 dark:text-white">{getProtectedValue(party.tcNumber, canViewIdentity)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Dogum Tarihi</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {party.birthDate ? formatDate(party.birthDate) : 'Belirtilmemis'}
                </p>
              </div>
            </div>

            {party.branchId && party.branchId !== 'branch-1' && (
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sube</p>
                  <p className="text-sm text-gray-900 dark:text-white">{party.branchId}</p>
                </div>
              </div>
            )}
          </div>
      </CollapsibleCard>

      {/* Address Information */}
      <CollapsibleCard title={t('overview.address_info', 'Adres Bilgileri')} icon={<MapPin className="w-5 h-5 text-gray-500" />} defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Il</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {party.addressCity || 'Belirtilmemis'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ilce</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {party.addressDistrict || 'Belirtilmemis'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 md:col-span-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Adres</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {party.addressFull || 'Adres bilgisi bulunmuyor'}
                </p>
              </div>
            </div>
          </div>
      </CollapsibleCard>

      {/* Additional Details */}
      <CollapsibleCard title={t('overview.extra_info', 'Ek Bilgiler')} icon={<Tag className="w-5 h-5 text-gray-500" />} defaultOpen={false}>
          <div className="space-y-4 pt-4">
            {!canViewNotes && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Not detaylari bu rol icin gizli.
              </div>
            )}

            {canViewNotes && party.notes && party.notes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Son Notlar</p>
                <div className="space-y-2">
                  {party.notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                      <p className="text-sm text-gray-900 dark:text-gray-200">{note.text}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {note.author} - {formatDate(note.date)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {party.tags && party.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Etiketler</p>
                <div className="flex flex-wrap gap-2">
                  {party.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Kayit Tarihi</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {party.createdAt ? formatDate(party.createdAt) : 'Bilinmiyor'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Son Guncelleme</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {party.updatedAt ? formatDate(party.updatedAt) : 'Bilinmiyor'}
                </p>
              </div>
            </div>
          </div>
      </CollapsibleCard>

      {/* Hasta Öyküsü (Anamnesis) */}
      <CollapsibleCard title={t('overview.anamnesis', 'Hasta Oykusu')} icon={<ClipboardList className="w-5 h-5 text-gray-500" />} defaultOpen={false}>
        <AnamnesisCard partyId={party.id!} />
      </CollapsibleCard>

      {/* Note Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Not Ekle"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Başlık (Opsiyonel)
            </label>
            <Input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Not başlığı"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Not <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Notunuzu buraya yazın..."
              rows={5}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              İptal
            </Button>
            <Button
              onClick={handleNoteSave}
              disabled={!noteContent.trim() || isSubmitting}
              className="premium-gradient tactile-press text-white"
            >
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
