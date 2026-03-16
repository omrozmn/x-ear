import { useCallback, useState } from 'react';
import {
  BadgePercent,
  CalendarClock,
  CheckSquare,
  FileCheck2,
  Goal,
  Loader2,
  PiggyBank,
  Save,
  Settings2,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { Button, Card, Input, Select } from '@x-ear/ui-web';

import {
  usePersonnelSettings,
  useUpdatePersonnelSettings,
  type PersonnelCompensationSettings,
  type PersonnelDocumentPolicy,
  type PersonnelLeavePolicy,
  type PersonnelTierRule,
} from '@/api/client/personnel.client';
import { SettingsSectionHeader } from '../../components/layout/SettingsSectionHeader';

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

function formatModelLabel(value?: string | null) {
  switch (value) {
    case 'fixed_rate':
      return 'Sabit yuzde';
    case 'tiered':
      return 'Kademeli';
    case 'target':
      return 'Hedef bazli';
    case 'target_tiered':
      return 'Hedef + kademeli';
    default:
      return value || '-';
  }
}

function formatCollectionRule(value?: string | null) {
  switch (value) {
    case 'full_collection_only':
      return 'Tam tahsilat sonrasi';
    case 'down_payment_only':
      return 'On odeme kadar';
    case 'down_payment_full_credit':
      return 'On odeme varsa tam prim';
    default:
      return value || '-';
  }
}

const MODEL_OPTIONS = [
  { value: 'fixed_rate', label: 'Sabit yuzde' },
  { value: 'tiered', label: 'Kademeli' },
  { value: 'target', label: 'Hedef bazli' },
  { value: 'target_tiered', label: 'Hedef + kademeli' },
];

const COLLECTION_RULE_OPTIONS = [
  { value: 'full_collection_only', label: 'Tam tahsilat sonrasi' },
  { value: 'down_payment_only', label: 'On odeme kadar' },
  { value: 'down_payment_full_credit', label: 'On odeme varsa tam prim' },
];

const PERIOD_MODE_OPTIONS = [
  { value: 'previous_month', label: 'Onceki ay' },
  { value: 'current_month', label: 'Mevcut ay' },
];

type SectionKey = 'compensation' | 'collection' | 'tiers' | 'leave' | 'documents';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PersonnelSettingsTab() {
  const { data, isLoading } = usePersonnelSettings();
  const updateMutation = useUpdatePersonnelSettings();

  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [draftCompensation, setDraftCompensation] = useState<PersonnelCompensationSettings | null>(null);
  const [draftLeave, setDraftLeave] = useState<PersonnelLeavePolicy | null>(null);
  const [draftDocuments, setDraftDocuments] = useState<PersonnelDocumentPolicy | null>(null);

  const startEditing = useCallback(
    (section: SectionKey) => {
      if (!data) return;
      setDraftCompensation({ ...data.compensation, tiers: data.compensation.tiers.map((t) => ({ ...t })) });
      setDraftLeave({ ...data.leavePolicy, leaveTypes: [...data.leavePolicy.leaveTypes] });
      setDraftDocuments({
        ...data.documentPolicy,
        requiredDocumentTypes: [...data.documentPolicy.requiredDocumentTypes],
        expiringDocumentTypes: [...data.documentPolicy.expiringDocumentTypes],
      });
      setEditingSection(section);
    },
    [data],
  );

  const cancelEditing = () => setEditingSection(null);

  const saveSection = useCallback(
    (section: SectionKey) => {
      if (!draftCompensation || !draftLeave || !draftDocuments) return;
      const payload: Record<string, unknown> = {};
      if (section === 'compensation' || section === 'collection' || section === 'tiers') {
        payload.compensation = draftCompensation;
      }
      if (section === 'leave') payload.leavePolicy = draftLeave;
      if (section === 'documents') payload.documentPolicy = draftDocuments;
      updateMutation.mutate(payload as Parameters<typeof updateMutation.mutate>[0], {
        onSuccess: () => setEditingSection(null),
      });
    },
    [draftCompensation, draftDocuments, draftLeave, updateMutation],
  );

  const addTier = () => {
    if (!draftCompensation) return;
    setDraftCompensation({ ...draftCompensation, tiers: [...draftCompensation.tiers, { threshold: 0, rate: 0 }] });
  };
  const removeTier = (index: number) => {
    if (!draftCompensation) return;
    setDraftCompensation({ ...draftCompensation, tiers: draftCompensation.tiers.filter((_, i) => i !== index) });
  };
  const updateTier = (index: number, field: keyof PersonnelTierRule, value: number) => {
    if (!draftCompensation) return;
    setDraftCompensation({ ...draftCompensation, tiers: draftCompensation.tiers.map((t, i) => (i === index ? { ...t, [field]: value } : t)) });
  };

  /* ---- Data ---- */

  const ruleGroups: Array<{
    key: SectionKey;
    title: string;
    subtitle?: string;
    icon: typeof BadgePercent;
    items: Array<{ label: string; value: string }>;
  }> = [
    {
      key: 'compensation',
      title: 'Prim Hesap Kurallari',
      icon: BadgePercent,
      items: [
        { label: 'Donem secimi', value: data?.compensation.periodMode === 'previous_month' ? 'Onceki ay' : data?.compensation.periodMode === 'current_month' ? 'Mevcut ay' : (data?.compensation.periodMode || '-') },
        { label: 'Hesap gecikme', value: `Donem bitisinden ${data?.compensation.calculationOffsetDays ?? 0} gun sonra` },
        { label: 'Model', value: formatModelLabel(data?.compensation.modelType) },
        { label: 'Bagli kullanici', value: data?.linkedUserRequired ? 'Zorunlu' : 'Opsiyonel' },
      ],
    },
    {
      key: 'collection',
      title: 'Prim Hak Edis Kosullari',
      subtitle: 'Satistan prim kazanmak icin gereken tahsilat kurallari',
      icon: Wallet,
      items: [
        { label: 'Tahsilat kosulu', value: formatCollectionRule(data?.compensation.collectionRule) },
        { label: 'Hedef kullanimi', value: data?.compensation.targetEnabled ? 'Aktif' : 'Kapali' },
        { label: 'Hedef tutari', value: data?.compensation.targetAmount ? `${data.compensation.targetAmount.toLocaleString('tr-TR')} TL` : 'Tanimli degil' },
        { label: 'Kademe sayisi', value: `${data?.compensation.tiers.length ?? 0} adet` },
      ],
    },
    {
      key: 'tiers',
      title: 'Kademe Kurallari',
      subtitle: 'Satis hacmine gore prim oran kademeleri',
      icon: Goal,
      items: data?.compensation.tiers.length
        ? data.compensation.tiers.map((tier) => ({ label: `${tier.threshold.toLocaleString('tr-TR')} TL uzeri`, value: `%${tier.rate}` }))
        : [{ label: 'Kademe', value: 'Tanimli degil — sabit oranla calisir' }],
    },
    {
      key: 'leave',
      title: 'Izin Kurallari',
      icon: CalendarClock,
      items: [
        { label: 'Yillik hak edis', value: `${data?.leavePolicy.annualEntitlementDays ?? 0} gun` },
        { label: 'Devreden izin', value: data?.leavePolicy.carryOverEnabled ? 'Acik' : 'Kapali' },
        { label: 'Izin turleri', value: data?.leavePolicy.leaveTypes.join(', ') || '-' },
      ],
    },
    {
      key: 'documents',
      title: 'Evrak Kurallari',
      icon: FileCheck2,
      items: [
        { label: 'Zorunlu evraklar', value: data?.documentPolicy.requiredDocumentTypes.join(', ') || '-' },
        { label: 'Sureli evraklar', value: data?.documentPolicy.expiringDocumentTypes.join(', ') || '-' },
        { label: 'Hatirlatma', value: `Bitise ${data?.documentPolicy.reminderDaysBeforeExpiry ?? 0} gun kala` },
      ],
    },
  ];

  const shortcuts = [
    {
      title: 'Bagli Kullanici Kontrolu',
      description: data?.linkedUserRequired
        ? 'Her personelin bir tenant kullanicisina baglanmasi bekleniyor.'
        : 'Personel kaydi kullanicidan bagimsiz acilabiliyor.',
      icon: ShieldCheck,
    },
    {
      title: 'Bordro Oncesi Alanlar',
      description: `Prim modeli ${formatModelLabel(data?.compensation.modelType)} olarak ayarli.`,
      icon: PiggyBank,
    },
    {
      title: 'Toplu Kural Guncelleme',
      description: `${data?.leavePolicy.leaveTypes.length ?? 0} izin tipi ve ${data?.documentPolicy.requiredDocumentTypes.length ?? 0} evrak tipi tanimli.`,
      icon: CheckSquare,
    },
  ];

  /* ---- Edit renderers ---- */

  const renderEdit = (section: SectionKey) => {
    if (section === 'compensation' && draftCompensation) {
      return (
        <div className="space-y-3">
          <FieldLabel label="Donem modu">
            <Select value={draftCompensation.periodMode} onChange={(e) => setDraftCompensation({ ...draftCompensation, periodMode: e.target.value })} options={PERIOD_MODE_OPTIONS} />
          </FieldLabel>
          <FieldLabel label="Hesap gecikme gunu">
            <Input type="number" value={draftCompensation.calculationOffsetDays} onChange={(e) => setDraftCompensation({ ...draftCompensation, calculationOffsetDays: Number(e.target.value) })} />
          </FieldLabel>
          <FieldLabel label="Prim modeli">
            <Select value={draftCompensation.modelType} onChange={(e) => setDraftCompensation({ ...draftCompensation, modelType: e.target.value })} options={MODEL_OPTIONS} />
          </FieldLabel>
          <FieldLabel label="Baz oran (%)">
            <Input type="number" step="0.1" value={draftCompensation.baseRate ?? ''} onChange={(e) => setDraftCompensation({ ...draftCompensation, baseRate: Number(e.target.value) })} />
          </FieldLabel>
        </div>
      );
    }
    if (section === 'collection' && draftCompensation) {
      return (
        <div className="space-y-3">
          <FieldLabel label="Tahsilat kosulu">
            <Select value={draftCompensation.collectionRule} onChange={(e) => setDraftCompensation({ ...draftCompensation, collectionRule: e.target.value })} options={COLLECTION_RULE_OPTIONS} />
          </FieldLabel>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={draftCompensation.targetEnabled} onChange={(e) => setDraftCompensation({ ...draftCompensation, targetEnabled: e.target.checked })} className="rounded" />
            Hedef kullanimi aktif
          </label>
          {draftCompensation.targetEnabled && (
            <FieldLabel label="Hedef tutari (TL)">
              <Input type="number" value={draftCompensation.targetAmount ?? ''} onChange={(e) => setDraftCompensation({ ...draftCompensation, targetAmount: Number(e.target.value) })} />
            </FieldLabel>
          )}
        </div>
      );
    }
    if (section === 'tiers' && draftCompensation) {
      return (
        <div className="space-y-3">
          {draftCompensation.tiers.map((tier, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <FieldLabel label="Esik (TL)">
                <Input type="number" value={tier.threshold} onChange={(e) => updateTier(index, 'threshold', Number(e.target.value))} />
              </FieldLabel>
              <FieldLabel label="Oran (%)">
                <Input type="number" step="0.1" value={tier.rate} onChange={(e) => updateTier(index, 'rate', Number(e.target.value))} />
              </FieldLabel>
              <Button variant="ghost" size="sm" className="mb-0.5" onClick={() => removeTier(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addTier}>Kademe ekle</Button>
        </div>
      );
    }
    if (section === 'leave' && draftLeave) {
      return (
        <div className="space-y-3">
          <FieldLabel label="Yillik izin hakki (gun)">
            <Input type="number" value={draftLeave.annualEntitlementDays} onChange={(e) => setDraftLeave({ ...draftLeave, annualEntitlementDays: Number(e.target.value) })} />
          </FieldLabel>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={draftLeave.carryOverEnabled} onChange={(e) => setDraftLeave({ ...draftLeave, carryOverEnabled: e.target.checked })} className="rounded" />
            Devreden izin acik
          </label>
          <FieldLabel label="Izin turleri (virgul ile ayirin)">
            <Input value={draftLeave.leaveTypes.join(', ')} onChange={(e) => setDraftLeave({ ...draftLeave, leaveTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </FieldLabel>
        </div>
      );
    }
    if (section === 'documents' && draftDocuments) {
      return (
        <div className="space-y-3">
          <FieldLabel label="Zorunlu evrak tipleri (virgul ile ayirin)">
            <Input value={draftDocuments.requiredDocumentTypes.join(', ')} onChange={(e) => setDraftDocuments({ ...draftDocuments, requiredDocumentTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </FieldLabel>
          <FieldLabel label="Sureli evrak tipleri (virgul ile ayirin)">
            <Input value={draftDocuments.expiringDocumentTypes.join(', ')} onChange={(e) => setDraftDocuments({ ...draftDocuments, expiringDocumentTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </FieldLabel>
          <FieldLabel label="Hatirlatma (gun)">
            <Input type="number" value={draftDocuments.reminderDaysBeforeExpiry} onChange={(e) => setDraftDocuments({ ...draftDocuments, reminderDaysBeforeExpiry: Number(e.target.value) })} />
          </FieldLabel>
        </div>
      );
    }
    return null;
  };

  /* ---- Render ---- */

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Personel Ayarlari"
        description="Personel yonetimi modulunde kullanilacak tenant bazli kurallari yonetin"
        icon={<Settings2 className="h-5 w-5" />}
      />

      {/* Shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '0.75rem' }}>
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl bg-gray-100 p-2.5 dark:bg-gray-800">
                  <Icon className="h-4 w-4 text-gray-700 dark:text-gray-200" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {isLoading ? 'Yukleniyor...' : item.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Rule groups */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '0.75rem' }}>
        {ruleGroups.map((group) => {
          const Icon = group.icon;
          const isEditing = editingSection === group.key;

          return (
            <Card key={group.key} className="overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2.5">
                <div className="shrink-0 rounded-xl bg-blue-50 p-2.5 dark:bg-blue-900/20">
                  <Icon className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 className="text-sm font-semibold leading-snug text-gray-900 dark:text-white">{group.title}</h3>
                  {group.subtitle && (
                    <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">{group.subtitle}</p>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="mt-4">
                  {renderEdit(group.key)}
                  <div className="mt-4 flex gap-2">
                    <Button className="flex flex-1 items-center justify-center gap-2" onClick={() => saveSection(group.key)} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Kaydet
                    </Button>
                    <Button variant="outline" onClick={cancelEditing} disabled={updateMutation.isPending}>Iptal</Button>
                  </div>
                  {updateMutation.isError && <p className="mt-2 text-sm text-red-600">Kaydetme basarisiz. Tekrar deneyin.</p>}
                </div>
              ) : (
                <>
                  <table className="mt-3 w-full">
                    <tbody>
                      {group.items.map((item) => (
                        <tr key={item.label} className="border-b border-gray-100 last:border-0 dark:border-gray-700/40">
                          <td className="py-2 pr-3 text-xs text-gray-500 dark:text-gray-400" style={{ whiteSpace: 'nowrap' }}>
                            {isLoading ? '...' : item.label}
                          </td>
                          <td className="py-2 text-right text-sm font-medium text-gray-900 dark:text-white" style={{ wordBreak: 'break-word' }}>
                            {isLoading ? '...' : item.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Button variant="outline" className="mt-3 w-full" onClick={() => startEditing(group.key)}>
                    Duzenle
                  </Button>
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default PersonnelSettingsTab;
