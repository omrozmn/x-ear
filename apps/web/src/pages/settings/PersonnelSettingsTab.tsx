import { useCallback, useMemo, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
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

type SectionKey = 'compensation' | 'collection' | 'tiers' | 'leave' | 'documents';

export function PersonnelSettingsTab() {
  const { t } = useTranslation('personnel');
  const { data, isLoading } = usePersonnelSettings();
  const updateMutation = useUpdatePersonnelSettings();

  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [draftCompensation, setDraftCompensation] = useState<PersonnelCompensationSettings | null>(null);
  const [draftLeave, setDraftLeave] = useState<PersonnelLeavePolicy | null>(null);
  const [draftDocuments, setDraftDocuments] = useState<PersonnelDocumentPolicy | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const formatModelLabel = useCallback((value?: string | null) => {
    if (!value) return '-';
    return t(`models.${value}`, { defaultValue: value });
  }, [t]);

  const formatCollectionRule = useCallback((value?: string | null) => {
    if (!value) return '-';
    return t(`collection_rules.${value}`, { defaultValue: value });
  }, [t]);

  const MODEL_OPTIONS = useMemo(() => [
    { value: 'fixed_rate', label: t('models.fixed_rate') },
    { value: 'tiered', label: t('models.tiered') },
    { value: 'target', label: t('models.target') },
    { value: 'target_tiered', label: t('models.target_tiered') },
  ], [t]);

  const COLLECTION_RULE_OPTIONS = useMemo(() => [
    { value: 'full_collection_only', label: t('collection_rules.full_collection_only') },
    { value: 'down_payment_only', label: t('collection_rules.down_payment_only') },
    { value: 'down_payment_full_credit', label: t('collection_rules.down_payment_full_credit') },
  ], [t]);

  const PERIOD_MODE_OPTIONS = useMemo(() => [
    { value: 'previous_month', label: t('settings.period_modes.previous_month') },
    { value: 'current_month', label: t('settings.period_modes.current_month') },
  ], [t]);

  const startEditing = useCallback(
    (section: SectionKey) => {
      if (!data) return;
      setDraftCompensation({ ...data.compensation, tiers: data.compensation.tiers.map((tier) => ({ ...tier })) });
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

  const cancelEditing = () => { setEditingSection(null); setSaveError(null); };

  const validateDraft = (section: SectionKey): string | null => {
    if ((section === 'compensation' || section === 'collection' || section === 'tiers') && draftCompensation) {
      if (draftCompensation.calculationOffsetDays < 0) return t('settings.validation.offset_negative');
      if (draftCompensation.baseRate != null && draftCompensation.baseRate < 0) return t('settings.validation.base_rate_negative');
      if (draftCompensation.targetEnabled && (draftCompensation.targetAmount ?? 0) <= 0) return t('settings.validation.target_amount_zero');
      for (const tier of draftCompensation.tiers) {
        if (tier.threshold < 0) return t('settings.validation.tier_threshold_negative');
        if (tier.rate < 0 || tier.rate > 100) return t('settings.validation.tier_rate_range');
      }
    }
    if (section === 'leave' && draftLeave) {
      if (draftLeave.annualEntitlementDays < 0) return t('settings.validation.annual_leave_negative');
      if (draftLeave.leaveTypes.length === 0) return t('settings.validation.leave_types_empty');
    }
    if (section === 'documents' && draftDocuments) {
      if (draftDocuments.reminderDaysBeforeExpiry < 0) return t('settings.validation.reminder_negative');
    }
    return null;
  };

  const saveSection = useCallback(
    (section: SectionKey) => {
      if (!draftCompensation || !draftLeave || !draftDocuments) return;
      const validationError = validateDraft(section);
      if (validationError) { setSaveError(validationError); return; }
      setSaveError(null);
      const payload: Record<string, unknown> = {};
      if (section === 'compensation' || section === 'collection' || section === 'tiers') payload.compensation = draftCompensation;
      if (section === 'leave') payload.leavePolicy = draftLeave;
      if (section === 'documents') payload.documentPolicy = draftDocuments;
      updateMutation.mutate(payload as Parameters<typeof updateMutation.mutate>[0], {
        onSuccess: () => { setEditingSection(null); setSaveError(null); },
        onError: () => setSaveError(t('settings.validation.save_failed')),
      });
    },
    [draftCompensation, draftDocuments, draftLeave, updateMutation, t],
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
    setDraftCompensation({ ...draftCompensation, tiers: draftCompensation.tiers.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier)) });
  };

  const ruleGroups: Array<{
    key: SectionKey;
    title: string;
    subtitle?: string;
    icon: typeof BadgePercent;
    items: Array<{ label: string; value: string }>;
  }> = [
    {
      key: 'compensation',
      title: t('settings.sections.compensation_rules'),
      icon: BadgePercent,
      items: [
        { label: t('settings.fields.period_mode'), value: data?.compensation.periodMode === 'previous_month' ? t('settings.period_modes.previous_month') : data?.compensation.periodMode === 'current_month' ? t('settings.period_modes.current_month') : (data?.compensation.periodMode || '-') },
        { label: t('settings.fields.calculation_offset'), value: t('settings.fields.offset_desc', { days: data?.compensation.calculationOffsetDays ?? 0 }) },
        { label: t('settings.fields.model'), value: formatModelLabel(data?.compensation.modelType) },
        { label: t('settings.fields.linked_user'), value: data?.linkedUserRequired ? t('settings.fields.linked_required') : t('settings.fields.linked_optional') },
      ],
    },
    {
      key: 'collection',
      title: t('settings.sections.earning_conditions'),
      subtitle: t('settings.sections.earning_subtitle'),
      icon: Wallet,
      items: [
        { label: t('settings.fields.collection_rule'), value: formatCollectionRule(data?.compensation.collectionRule) },
        { label: t('settings.fields.target_usage'), value: data?.compensation.targetEnabled ? t('settings.fields.target_active') : t('settings.fields.target_inactive') },
        { label: t('settings.fields.target_amount'), value: data?.compensation.targetAmount ? `${data.compensation.targetAmount.toLocaleString('tr-TR')} TL` : t('settings.fields.target_not_set') },
        { label: t('settings.fields.tier_count'), value: t('settings.fields.tier_count_unit', { count: data?.compensation.tiers.length ?? 0 }) },
      ],
    },
    {
      key: 'tiers',
      title: t('settings.sections.tier_rules'),
      subtitle: t('settings.sections.tier_subtitle'),
      icon: Goal,
      items: data?.compensation.tiers.length
        ? data.compensation.tiers.map((tier) => ({ label: t('settings.fields.tier_threshold', { amount: tier.threshold.toLocaleString('tr-TR') }), value: `%${tier.rate}` }))
        : [{ label: t('settings.sections.tier_rules'), value: t('settings.fields.tier_no_tiers') }],
    },
    {
      key: 'leave',
      title: t('settings.sections.leave_rules'),
      icon: CalendarClock,
      items: [
        { label: t('settings.fields.annual_leave'), value: t('settings.fields.annual_leave_unit', { days: data?.leavePolicy.annualEntitlementDays ?? 0 }) },
        { label: t('settings.fields.carry_over'), value: data?.leavePolicy.carryOverEnabled ? t('status.active') : t('status.inactive') },
        { label: t('settings.fields.leave_types'), value: data?.leavePolicy.leaveTypes.join(', ') || '-' },
      ],
    },
    {
      key: 'documents',
      title: t('settings.sections.document_rules'),
      icon: FileCheck2,
      items: [
        { label: t('settings.fields.required_docs'), value: data?.documentPolicy.requiredDocumentTypes.join(', ') || '-' },
        { label: t('settings.fields.expiring_docs'), value: data?.documentPolicy.expiringDocumentTypes.join(', ') || '-' },
        { label: t('settings.fields.reminder_days'), value: t('settings.fields.reminder_desc', { days: data?.documentPolicy.reminderDaysBeforeExpiry ?? 0 }) },
      ],
    },
  ];

  const shortcuts = [
    {
      title: t('settings.shortcuts.linked_user_title'),
      description: data?.linkedUserRequired ? t('settings.shortcuts.linked_user_required') : t('settings.shortcuts.linked_user_optional'),
      icon: ShieldCheck,
    },
    {
      title: t('settings.shortcuts.payroll_title'),
      description: t('settings.shortcuts.payroll_model', { model: formatModelLabel(data?.compensation.modelType) }),
      icon: PiggyBank,
    },
    {
      title: t('settings.shortcuts.bulk_title'),
      description: t('settings.shortcuts.bulk_desc', { leaveCount: data?.leavePolicy.leaveTypes.length ?? 0, docCount: data?.documentPolicy.requiredDocumentTypes.length ?? 0 }),
      icon: CheckSquare,
    },
  ];

  const renderEdit = (section: SectionKey) => {
    if (section === 'compensation' && draftCompensation) {
      return (
        <div className="space-y-3">
          <FieldLabel label={t('settings.edit.period_mode_label')}>
            <Select value={draftCompensation.periodMode} onChange={(e) => setDraftCompensation({ ...draftCompensation, periodMode: e.target.value })} options={PERIOD_MODE_OPTIONS} />
          </FieldLabel>
          <FieldLabel label={t('settings.edit.offset_label')}>
            <Input type="number" min={0} value={draftCompensation.calculationOffsetDays} onChange={(e) => setDraftCompensation({ ...draftCompensation, calculationOffsetDays: Math.max(0, Number(e.target.value)) })} />
          </FieldLabel>
          <FieldLabel label={t('settings.edit.model_label')}>
            <Select value={draftCompensation.modelType} onChange={(e) => setDraftCompensation({ ...draftCompensation, modelType: e.target.value })} options={MODEL_OPTIONS} />
          </FieldLabel>
          <FieldLabel label={t('settings.edit.base_rate_label')}>
            <Input type="number" step="0.1" min={0} max={100} value={draftCompensation.baseRate ?? ''} onChange={(e) => setDraftCompensation({ ...draftCompensation, baseRate: Number(e.target.value) })} />
          </FieldLabel>
        </div>
      );
    }
    if (section === 'collection' && draftCompensation) {
      return (
        <div className="space-y-3">
          <FieldLabel label={t('settings.edit.collection_label')}>
            <Select value={draftCompensation.collectionRule} onChange={(e) => setDraftCompensation({ ...draftCompensation, collectionRule: e.target.value })} options={COLLECTION_RULE_OPTIONS} />
          </FieldLabel>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input data-allow-raw="true" type="checkbox" checked={draftCompensation.targetEnabled} onChange={(e) => setDraftCompensation({ ...draftCompensation, targetEnabled: e.target.checked })} className="rounded" />
            {t('settings.edit.target_enabled')}
          </label>
          {draftCompensation.targetEnabled && (
            <FieldLabel label={t('settings.edit.target_amount_label')}>
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
              <FieldLabel label={t('settings.edit.tier_threshold_label')}>
                <Input type="number" min={0} value={tier.threshold} onChange={(e) => updateTier(index, 'threshold', Math.max(0, Number(e.target.value)))} />
              </FieldLabel>
              <FieldLabel label={t('settings.edit.tier_rate_label')}>
                <Input type="number" step="0.1" min={0} max={100} value={tier.rate} onChange={(e) => updateTier(index, 'rate', Number(e.target.value))} />
              </FieldLabel>
              <Button variant="ghost" size="sm" className="mb-0.5" onClick={() => removeTier(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addTier}>{t('settings.edit.tier_add')}</Button>
        </div>
      );
    }
    if (section === 'leave' && draftLeave) {
      return (
        <div className="space-y-3">
          <FieldLabel label={t('settings.edit.annual_leave_label')}>
            <Input type="number" min={0} max={365} value={draftLeave.annualEntitlementDays} onChange={(e) => setDraftLeave({ ...draftLeave, annualEntitlementDays: Math.max(0, Number(e.target.value)) })} />
          </FieldLabel>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input data-allow-raw="true" type="checkbox" checked={draftLeave.carryOverEnabled} onChange={(e) => setDraftLeave({ ...draftLeave, carryOverEnabled: e.target.checked })} className="rounded" />
            {t('settings.edit.carry_over_label')}
          </label>
          <FieldLabel label={t('settings.edit.leave_types_label')}>
            <Input value={draftLeave.leaveTypes.join(', ')} onChange={(e) => setDraftLeave({ ...draftLeave, leaveTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </FieldLabel>
        </div>
      );
    }
    if (section === 'documents' && draftDocuments) {
      return (
        <div className="space-y-3">
          <FieldLabel label={t('settings.edit.required_docs_label')}>
            <Input value={draftDocuments.requiredDocumentTypes.join(', ')} onChange={(e) => setDraftDocuments({ ...draftDocuments, requiredDocumentTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </FieldLabel>
          <FieldLabel label={t('settings.edit.expiring_docs_label')}>
            <Input value={draftDocuments.expiringDocumentTypes.join(', ')} onChange={(e) => setDraftDocuments({ ...draftDocuments, expiringDocumentTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </FieldLabel>
          <FieldLabel label={t('settings.edit.reminder_label')}>
            <Input type="number" min={0} value={draftDocuments.reminderDaysBeforeExpiry} onChange={(e) => setDraftDocuments({ ...draftDocuments, reminderDaysBeforeExpiry: Math.max(0, Number(e.target.value)) })} />
          </FieldLabel>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title={t('settings.title')}
        description={t('settings.description')}
        icon={<Settings2 className="h-5 w-5" />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '0.75rem' }}>
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-xl bg-muted p-2.5">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {isLoading ? t('common:loading') : item.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '0.75rem' }}>
        {ruleGroups.map((group) => {
          const Icon = group.icon;
          const isEditing = editingSection === group.key;
          return (
            <Card key={group.key} className="overflow-hidden">
              <div className="flex items-center gap-2.5">
                <div className="shrink-0 rounded-xl bg-primary/10 p-2.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 className="text-sm font-semibold leading-snug text-gray-900 dark:text-white">{group.title}</h3>
                  {group.subtitle && <p className="text-xs leading-snug text-muted-foreground">{group.subtitle}</p>}
                </div>
              </div>
              {isEditing ? (
                <div className="mt-4">
                  {renderEdit(group.key)}
                  <div className="mt-4 flex gap-2">
                    <Button className="flex flex-1 items-center justify-center gap-2" onClick={() => saveSection(group.key)} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {t('common:save')}
                    </Button>
                    <Button variant="outline" onClick={cancelEditing} disabled={updateMutation.isPending}>{t('common:cancel')}</Button>
                  </div>
                  {(saveError || updateMutation.isError) && <p className="mt-2 text-sm text-destructive">{saveError || t('settings.validation.save_failed')}</p>}
                </div>
              ) : (
                <>
                  <table className="mt-3 w-full">
                    <tbody>
                      {group.items.map((item) => (
                        <tr key={item.label} className="border-b border-border last:border-0/40">
                          <td className="py-2 pr-3 text-xs text-muted-foreground" style={{ whiteSpace: 'nowrap' }}>{isLoading ? '...' : item.label}</td>
                          <td className="py-2 text-right text-sm font-medium text-gray-900 dark:text-white" style={{ wordBreak: 'break-word' }}>{isLoading ? '...' : item.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Button variant="outline" className="mt-3 w-full" onClick={() => startEditing(group.key)}>
                    {t('settings.edit.button')}
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
    <label className="block text-sm font-medium text-foreground">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default PersonnelSettingsTab;
