import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Textarea, Input, Select, useToastHelpers } from '@x-ear/ui-web';
import {
    AlertTriangle,
    Bell,
    Calendar,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    CreditCard,
    Edit3,
    Eye,
    FileText,
    // Loader2, // Not used - using different loading pattern
    Package,
    Pause,
    Play,
    Plus,
    Settings,
    ShoppingCart,
    Trash2,
    TrendingUp,
    User,
    UserPlus,
    X,
    Zap
} from 'lucide-react';
import { useListSmHeaders, getListSmHeadersQueryKey } from '@/api/client/sms.client';
import type { SmsHeaderRequestRead } from '@/api/generated/schemas';
import { useAuthStore } from '@/stores/authStore';
import { unwrapArray } from '@/utils/response-unwrap';

// SMS Automation Trigger Types
type TriggerType =
    | 'new_party'
    | 'device_sale'
    | 'device_delivery'
    | 'promissory_created'
    | 'promissory_reminder'
    | 'appointment_created'
    | 'appointment_reminder'
    | 'appointment_day'
    | 'trial_started'
    | 'trial_ending'
    | 'birthday'
    | 'control_reminder'
    | 'payment_received'
    | 'invoice_created';

interface AutomationRule {
    id: string;
    name: string;
    trigger: TriggerType;
    templateName: string;
    templateContent: string;
    isActive: boolean;
    headerId?: string;
    timing?: {
        type: 'immediate' | 'before' | 'after';
        value?: number;
        unit?: 'minutes' | 'hours' | 'days';
    };
    conditions?: {
        segment?: string[];
        branch?: string[];
    };
    stats?: {
        sent: number;
        delivered: number;
        failed: number;
    };
    createdAt: string;
    updatedAt: string;
}

// Trigger metadata with icons and descriptions
type TriggerConfigItem = {
    labelKey: string;
    descriptionKey: string;
    icon: React.ReactNode;
    category: 'party' | 'sales' | 'appointment' | 'payment' | 'other';
    defaultTiming: { type: 'immediate' | 'before' | 'after'; value?: number; unit?: 'minutes' | 'hours' | 'days' };
    dynamicFields: string[];
};

const TRIGGER_CONFIG: Record<TriggerType, TriggerConfigItem> = {
    new_party: {
        labelKey: 'automation.triggers.new_party',
        descriptionKey: 'automation.triggers.new_party_desc',
        icon: <UserPlus className="w-5 h-5" />,
        category: 'party',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{AD_SOYAD}}', '{{TELEFON}}', '{{SUBE}}']
    },
    device_sale: {
        labelKey: 'automation.triggers.device_sale',
        descriptionKey: 'automation.triggers.device_sale_desc',
        icon: <ShoppingCart className="w-5 h-5" />,
        category: 'sales',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{CIHAZ_ADI}}', '{{CIHAZ_MARKASI}}', '{{TOPLAM_TUTAR}}', '{{SUBE}}']
    },
    device_delivery: {
        labelKey: 'automation.triggers.device_delivery',
        descriptionKey: 'automation.triggers.device_delivery_desc',
        icon: <Package className="w-5 h-5" />,
        category: 'sales',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{CIHAZ_ADI}}', '{{SERI_NO}}', '{{GARANTI_BITIS}}']
    },
    promissory_created: {
        labelKey: 'automation.triggers.promissory_created',
        descriptionKey: 'automation.triggers.promissory_created_desc',
        icon: <FileText className="w-5 h-5" />,
        category: 'payment',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{SENET_TUTARI}}', '{{VADE_TARIHI}}', '{{TAKSIT_SAYISI}}']
    },
    promissory_reminder: {
        labelKey: 'automation.triggers.promissory_reminder',
        descriptionKey: 'automation.triggers.promissory_reminder_desc',
        icon: <CreditCard className="w-5 h-5" />,
        category: 'payment',
        defaultTiming: { type: 'before', value: 3, unit: 'days' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{SENET_TUTARI}}', '{{VADE_TARIHI}}', '{{KALAN_GUN}}']
    },
    appointment_created: {
        labelKey: 'automation.triggers.appointment_created',
        descriptionKey: 'automation.triggers.appointment_created_desc',
        icon: <Calendar className="w-5 h-5" />,
        category: 'appointment',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{RANDEVU_TARIHI}}', '{{RANDEVU_SAATI}}', '{{RANDEVU_TURU}}', '{{SUBE}}']
    },
    appointment_reminder: {
        labelKey: 'automation.triggers.appointment_reminder',
        descriptionKey: 'automation.triggers.appointment_reminder_desc',
        icon: <Bell className="w-5 h-5" />,
        category: 'appointment',
        defaultTiming: { type: 'before', value: 1, unit: 'days' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{RANDEVU_TARIHI}}', '{{RANDEVU_SAATI}}', '{{SUBE}}', '{{KALAN_SAAT}}']
    },
    appointment_day: {
        labelKey: 'automation.triggers.appointment_day',
        descriptionKey: 'automation.triggers.appointment_day_desc',
        icon: <Clock className="w-5 h-5" />,
        category: 'appointment',
        defaultTiming: { type: 'before', value: 3, unit: 'hours' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{RANDEVU_SAATI}}', '{{SUBE}}']
    },
    trial_started: {
        labelKey: 'automation.triggers.trial_started',
        descriptionKey: 'automation.triggers.trial_started_desc',
        icon: <TrendingUp className="w-5 h-5" />,
        category: 'sales',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{CIHAZ_ADI}}', '{{DENEME_BITIS}}']
    },
    trial_ending: {
        labelKey: 'automation.triggers.trial_ending',
        descriptionKey: 'automation.triggers.trial_ending_desc',
        icon: <AlertTriangle className="w-5 h-5" />,
        category: 'sales',
        defaultTiming: { type: 'before', value: 2, unit: 'days' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{CIHAZ_ADI}}', '{{DENEME_BITIS}}', '{{KALAN_GUN}}']
    },
    birthday: {
        labelKey: 'automation.triggers.birthday',
        descriptionKey: 'automation.triggers.birthday_desc',
        icon: <User className="w-5 h-5" />,
        category: 'other',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{YAS}}']
    },
    control_reminder: {
        labelKey: 'automation.triggers.control_reminder',
        descriptionKey: 'automation.triggers.control_reminder_desc',
        icon: <Settings className="w-5 h-5" />,
        category: 'other',
        defaultTiming: { type: 'before', value: 7, unit: 'days' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{SON_KONTROL}}', '{{CIHAZ_ADI}}']
    },
    payment_received: {
        labelKey: 'automation.triggers.payment_received',
        descriptionKey: 'automation.triggers.payment_received_desc',
        icon: <CheckCircle className="w-5 h-5" />,
        category: 'payment',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{ODEME_TUTARI}}', '{{ODEME_TARIHI}}', '{{KALAN_BORC}}']
    },
    invoice_created: {
        labelKey: 'automation.triggers.invoice_created',
        descriptionKey: 'automation.triggers.invoice_created_desc',
        icon: <FileText className="w-5 h-5" />,
        category: 'payment',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{FATURA_NO}}', '{{FATURA_TUTARI}}', '{{FATURA_TARIHI}}']
    }
};

const CATEGORY_KEYS: Record<string, string> = {
    party: 'automation.categories.party',
    sales: 'automation.categories.sales',
    appointment: 'automation.categories.appointment',
    payment: 'automation.categories.payment',
    other: 'automation.categories.other'
};

const SMS_SEGMENT_LENGTH = 155;

// Sample automation rules for demo
const SAMPLE_RULES: AutomationRule[] = [
    {
        id: 'auto_1',
        name: 'Hosgeldiniz Mesaji',
        trigger: 'new_party',
        templateName: 'Yeni Hasta Hosgeldiniz',
        templateContent: 'Sayin {{AD}} {{SOYAD}}, X-Ear ailesine hos geldiniz! Saglikli bir duyus yolculugu diliyoruz.',
        isActive: true,
        timing: { type: 'immediate' },
        stats: { sent: 156, delivered: 154, failed: 2 },
        createdAt: '2024-11-01T10:00:00Z',
        updatedAt: '2024-11-28T15:30:00Z'
    },
    {
        id: 'auto_2',
        name: 'Randevu Hatirlatma (1 Gun Once)',
        trigger: 'appointment_reminder',
        templateName: 'Randevu Hatirlatma',
        templateContent: 'Sayin {{AD}} {{SOYAD}}, yarin saat {{RANDEVU_SAATI}} icin {{SUBE}} subemizde randevunuz bulunmaktadir. Sizi bekliyoruz.',
        isActive: true,
        timing: { type: 'before', value: 1, unit: 'days' },
        stats: { sent: 89, delivered: 88, failed: 1 },
        createdAt: '2024-11-05T14:00:00Z',
        updatedAt: '2024-11-28T09:00:00Z'
    },
    {
        id: 'auto_3',
        name: 'Senet Odeme Hatirlatma',
        trigger: 'promissory_reminder',
        templateName: 'Senet Hatirlatma',
        templateContent: 'Sayin {{AD}} {{SOYAD}}, {{VADE_TARIHI}} tarihli {{SENET_TUTARI}} TL tutarindaki senet odemenizi hatirlatmak isteriz.',
        isActive: false,
        timing: { type: 'before', value: 3, unit: 'days' },
        stats: { sent: 45, delivered: 44, failed: 1 },
        createdAt: '2024-11-10T11:00:00Z',
        updatedAt: '2024-11-20T16:00:00Z'
    }
];

interface SmsAutomationTabProps {
    creditBalance: number;
    creditLoading: boolean;
    channel?: 'sms' | 'whatsapp' | 'email';
}

export const SmsAutomationTab: React.FC<SmsAutomationTabProps> = ({ channel = 'sms' }) => {
    const { t } = useTranslation('campaigns');
    const [rules, setRules] = useState<AutomationRule[]>(SAMPLE_RULES);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
    const [expandedCategory, setExpandedCategory] = useState<string | null>('appointment');
    const [showPreview, setShowPreview] = useState(false);
    const [previewContent, setPreviewContent] = useState('');
    const { success: showSuccessToast, error: showErrorToast } = useToastHelpers();
    const { token } = useAuthStore();

    const channelLabel = channel === 'email' ? 'E-posta' : channel === 'whatsapp' ? 'WhatsApp' : 'SMS';

    // Sender/header selection is currently SMS-specific.
    const { data: headersData, isLoading: headersLoading, isError: headersError } = useListSmHeaders({
        query: { queryKey: getListSmHeadersQueryKey(), refetchOnWindowFocus: false, enabled: !!token }
    });

    // Approved sender headers are only relevant for SMS channel.
    const headerOptions = useMemo(() => {
        const headersRaw = unwrapArray<SmsHeaderRequestRead>(headersData);
        // Only return approved headers
        return headersRaw
            .filter(h => h.status === 'approved')
            .map((h) => ({
                value: h.id || h.headerText || '',
                label: h.headerText || '',
                isDefault: h.isDefault
            }));
    }, [headersData]);

    // Get default header ID
    const defaultHeaderId = useMemo(() => {
        const defaultHeader = headerOptions.find(h => h.isDefault);
        if (defaultHeader) return defaultHeader.value;
        if (headerOptions.length === 1) return headerOptions[0].value;
        return '';
    }, [headerOptions]);

    // Set default header when opening modal
    React.useEffect(() => {
        if (showCreateModal && !editingRule && defaultHeaderId && !formData.headerId) {
            setFormData(prev => ({ ...prev, headerId: defaultHeaderId }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showCreateModal, editingRule, defaultHeaderId]);

    // Form state for create/edit
    const [formData, setFormData] = useState<{
        name: string;
        trigger: TriggerType;
        templateContent: string;
        headerId?: string;
        timing: { type: 'immediate' | 'before' | 'after'; value?: number; unit?: 'minutes' | 'hours' | 'days' };
    }>({
        name: '',
        trigger: 'new_party',
        templateContent: '',
        headerId: '',
        timing: { type: 'immediate' }
    });

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const groupedRules = useMemo(() => {
        const grouped: Record<string, AutomationRule[]> = {};
        rules.forEach(rule => {
            const category = TRIGGER_CONFIG[rule.trigger]?.category || 'other';
            if (!grouped[category]) grouped[category] = [];
            grouped[category].push(rule);
        });
        return grouped;
    }, [rules]);

    const activeCount = rules.filter(r => r.isActive).length;
    const totalSent = rules.reduce((acc, r) => acc + (r.stats?.sent || 0), 0);

    const handleToggleRule = (ruleId: string) => {
        setRules(prev => prev.map(r =>
            r.id === ruleId ? { ...r, isActive: !r.isActive } : r
        ));
        showSuccessToast(t('automation.toast.updated'), t('automation.toast.statusChanged'));
    };

    const handleDeleteRule = (ruleId: string) => {
        setRules(prev => prev.filter(r => r.id !== ruleId));
        showSuccessToast(t('automation.toast.deleted'), t('automation.toast.deleteSuccess'));
    };

    const handleCreateRule = () => {
        if (!formData.name.trim()) {
            showErrorToast(t('automation.form.error'), t('automation.form.ruleNameRequired'));
            return;
        }
        if (!formData.templateContent.trim()) {
            showErrorToast(t('automation.form.error'), t('automation.form.templateRequired'));
            return;
        }

        const newRule: AutomationRule = {
            id: `auto_${Date.now()}`,
            name: formData.name,
            trigger: formData.trigger,
            templateName: formData.name,
            templateContent: formData.templateContent,
            headerId: formData.headerId,
            isActive: true,
            timing: formData.timing,
            stats: { sent: 0, delivered: 0, failed: 0 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (editingRule) {
            setRules(prev => prev.map(r => r.id === editingRule.id ? { ...newRule, id: editingRule.id } : r));
            showSuccessToast(t('automation.toast.updated'), t('automation.toast.updateSuccess'));
        } else {
            setRules(prev => [...prev, newRule]);
            showSuccessToast(t('automation.toast.created'), t('automation.toast.createSuccess'));
        }

        setShowCreateModal(false);
        setEditingRule(null);
        setFormData({ name: '', trigger: 'new_party', templateContent: '', headerId: '', timing: { type: 'immediate' } });
    };

    const handleEditRule = (rule: AutomationRule) => {
        setEditingRule(rule);
        setFormData({
            name: rule.name,
            trigger: rule.trigger,
            templateContent: rule.templateContent,
            headerId: rule.headerId || '',
            timing: rule.timing || { type: 'immediate' }
        });
        setShowCreateModal(true);
    };

    const insertDynamicField = (fieldKey: string) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            setFormData(prev => ({ ...prev, templateContent: prev.templateContent + fieldKey }));
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentContent = formData.templateContent;
        const newContent = currentContent.slice(0, start) + fieldKey + currentContent.slice(end);
        setFormData(prev => ({ ...prev, templateContent: newContent }));

        setTimeout(() => {
            textarea.focus();
            const newPos = start + fieldKey.length;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const handlePreview = (content: string) => {
        let preview = content;
        // Replace with sample data
        preview = preview
            .replace(/\{\{AD\}\}/g, 'Ahmet')
            .replace(/\{\{SOYAD\}\}/g, 'Yilmaz')
            .replace(/\{\{AD_SOYAD\}\}/g, 'Ahmet Yilmaz')
            .replace(/\{\{TELEFON\}\}/g, '0532 123 45 67')
            .replace(/\{\{SUBE\}\}/g, 'Merkez')
            .replace(/\{\{RANDEVU_TARIHI\}\}/g, '15 Aralik 2024')
            .replace(/\{\{RANDEVU_SAATI\}\}/g, '14:30')
            .replace(/\{\{RANDEVU_TURU\}\}/g, 'Kontrol')
            .replace(/\{\{CIHAZ_ADI\}\}/g, 'ReSound Key')
            .replace(/\{\{CIHAZ_MARKASI\}\}/g, 'ReSound')
            .replace(/\{\{TOPLAM_TUTAR\}\}/g, '45.000')
            .replace(/\{\{SENET_TUTARI\}\}/g, '5.000')
            .replace(/\{\{VADE_TARIHI\}\}/g, '01 Ocak 2025')
            .replace(/\{\{KALAN_GUN\}\}/g, '3')
            .replace(/\{\{KALAN_SAAT\}\}/g, '24')
            .replace(/\{\{FATURA_NO\}\}/g, 'XER2024001234')
            .replace(/\{\{FATURA_TUTARI\}\}/g, '45.000')
            .replace(/\{\{FATURA_TARIHI\}\}/g, '02 Aralik 2024')
            .replace(/\{\{ODEME_TUTARI\}\}/g, '10.000')
            .replace(/\{\{ODEME_TARIHI\}\}/g, '02 Aralik 2024')
            .replace(/\{\{KALAN_BORC\}\}/g, '35.000')
            .replace(/\{\{DENEME_BITIS\}\}/g, '10 Aralik 2024')
            .replace(/\{\{SERI_NO\}\}/g, 'RS2024123456')
            .replace(/\{\{GARANTI_BITIS\}\}/g, '02 Aralik 2026')
            .replace(/\{\{TAKSIT_SAYISI\}\}/g, '12')
            .replace(/\{\{SON_KONTROL\}\}/g, '02 Haziran 2024')
            .replace(/\{\{YAS\}\}/g, '65');

        setPreviewContent(preview);
        setShowPreview(true);
    };

    const selectedTriggerConfig = TRIGGER_CONFIG[formData.trigger];

    return (
        <div className="space-y-6">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/40 dark:to-gray-800 border border-indigo-100 dark:border-indigo-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">{t('automation.stats.activeAutomation')}</p>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{activeCount}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">{t('automation.stats.totalSent')}</p>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalSent.toLocaleString('tr-TR')}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted text-muted-foreground">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">{t('automation.stats.totalRules')}</p>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{rules.length}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <Button
                        variant="primary"
                        className="w-full h-full flex items-center justify-center gap-2"
                        onClick={() => {
                            setEditingRule(null);
                            setFormData({ name: '', trigger: 'new_party', templateContent: '', headerId: '', timing: { type: 'immediate' } });
                            setShowCreateModal(true);
                        }}
                    >
                        <Plus className="w-5 h-5" />
                        {t('automation.newAutomation', { channel: channelLabel })}
                    </Button>
                </Card>
            </div>

            {/* Automation Rules by Category */}
            <div className="space-y-4">
                {Object.entries(CATEGORY_KEYS).map(([category, labelKey]) => {
                    const categoryRules = groupedRules[category] || [];
                    const isExpanded = expandedCategory === category;

                    return (
                        <Card key={category} className="overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                            <button
                                data-allow-raw="true"
                                type="button"
                                className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-muted/50 dark:hover:bg-gray-800 transition-colors"
                                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{t(labelKey)}</span>
                                    <span className="text-sm text-muted-foreground">{t('automation.rules.rulesCount', { count: categoryRules.length })}</span>
                                </div>
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                            </button>

                            {isExpanded && (
                                <div className="p-4 space-y-3">
                                    {categoryRules.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            {t('automation.rules.noRulesInCategory')}
                                        </p>
                                    ) : (
                                        categoryRules.map((rule) => {
                                            const triggerConfig = TRIGGER_CONFIG[rule.trigger];
                                            return (
                                                <div
                                                    key={rule.id}
                                                    className={`p-4 rounded-2xl border ${rule.isActive ? 'border-indigo-200 bg-indigo-50/50 dark:bg-indigo-900/20 dark:border-indigo-800' : 'border-border bg-gray-50 dark:bg-gray-800/50'}`}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-start gap-3 flex-1">
                                                            <div className={`p-2 rounded-2xl ${rule.isActive ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-accent text-muted-foreground'}`}>
                                                                {triggerConfig?.icon}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-medium text-gray-900 dark:text-white">{rule.name}</h4>
                                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${rule.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-accent text-muted-foreground'}`}>
                                                                        {rule.isActive ? t('automation.rules.active') : t('automation.rules.inactive')}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-muted-foreground mt-1">{t(triggerConfig?.labelKey)}</p>
                                                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{rule.templateContent}</p>

                                                                {rule.timing && rule.timing.type !== 'immediate' && (
                                                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        {rule.timing.value} {t(`automation.timing.${rule.timing.unit === 'days' ? 'days' : rule.timing.unit === 'hours' ? 'hours' : 'minutes'}`)} {rule.timing.type === 'before' ? t('automation.timing.before').toLowerCase() : t('automation.timing.after').toLowerCase()}
                                                                    </p>
                                                                )}

                                                                {rule.stats && (
                                                                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                                                        <span>{t('automation.rules.sent', { count: rule.stats.sent })}</span>
                                                                        <span>{t('automation.rules.delivered', { count: rule.stats.delivered })}</span>
                                                                        <span>{t('automation.rules.failed', { count: rule.stats.failed })}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handlePreview(rule.templateContent)}
                                                                title={t('sms.message.preview')}
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleEditRule(rule)}
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleToggleRule(rule.id)}
                                                            >
                                                                {rule.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteRule(rule.id)}
                                                                className="text-destructive hover:text-destructive dark:hover:text-red-300"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}

                                    {/* Available triggers for this category */}
                                    <div className="mt-4 pt-4 border-t border-border">
                                        <p className="text-xs font-medium text-muted-foreground mb-2">{t('automation.rules.availableTriggers')}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(TRIGGER_CONFIG)
                                                .filter(([, config]) => config.category === category)
                                                .map(([trigger, config]) => (
                                                    <button
                                                        data-allow-raw="true"
                                                        key={trigger}
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingRule(null);
                                                            setFormData({
                                                                name: '',
                                                                trigger: trigger as TriggerType,
                                                                templateContent: '',
                                                                headerId: '',
                                                                timing: config.defaultTiming
                                                            });
                                                            setShowCreateModal(true);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground bg-white dark:bg-gray-800 border border-border rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        {t(config.labelKey)}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Create/Edit Modal */}
            {
                showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {editingRule ? t('automation.form.editTitle') : t('automation.form.createTitle')}
                                </h3>
                                <button
                                    data-allow-raw="true"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setEditingRule(null);
                                    }}
                                    className="p-1 rounded-2xl hover:bg-muted dark:hover:bg-gray-700 transition-colors"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>

                            <div className="p-4 space-y-4 overflow-y-auto flex-1">
                                {/* Trigger Selection */}
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1 block">{t('automation.form.trigger')}</label>
                                    <Select
                                        value={formData.trigger}
                                        onChange={(e) => {
                                            const newTrigger = e.target.value as TriggerType;
                                            setFormData(prev => ({
                                                ...prev,
                                                trigger: newTrigger,
                                                timing: TRIGGER_CONFIG[newTrigger].defaultTiming
                                            }));
                                        }}
                                        options={Object.entries(TRIGGER_CONFIG).map(([key, config]) => ({
                                            value: key,
                                            label: `${t(config.labelKey)} (${t(CATEGORY_KEYS[config.category])})`
                                        }))}
                                        fullWidth
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">{t(selectedTriggerConfig?.descriptionKey)}</p>
                                </div>

                                {/* Rule Name */}
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1 block">{t('automation.form.ruleName')}</label>
                                    <Input
                                        type="text"
                                        placeholder={t('automation.form.ruleNamePlaceholder')}
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Sender Header Selection */}
                                <div>
                                    <label className="text-sm font-medium text-foreground mb-1 block">{t('automation.form.senderHeader')}</label>
                                    <Select
                                        value={formData.headerId || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, headerId: e.target.value }))}
                                        options={headersLoading
                                            ? [{ value: '', label: t('sms.filters.headersLoading') }]
                                            : headersError
                                                ? [{ value: '', label: t('sms.filters.headerError') }]
                                                : [{ value: '', label: t('sms.filters.headerDefault') }, ...headerOptions]
                                        }
                                        fullWidth
                                        disabled={headersLoading}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">{t('automation.form.onlyApprovedHeaders')}</p>
                                </div>

                                {/* Timing Configuration */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-sm font-medium text-foreground mb-1 block">{t('automation.timing.label')}</label>
                                        <Select
                                            value={formData.timing.type}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                timing: { ...prev.timing, type: e.target.value as 'immediate' | 'before' | 'after' }
                                            }))}
                                            options={[
                                                { value: 'immediate', label: t('automation.timing.immediate') },
                                                { value: 'before', label: t('automation.timing.before') },
                                                { value: 'after', label: t('automation.timing.after') }
                                            ]}
                                            fullWidth
                                        />
                                    </div>
                                    {formData.timing.type !== 'immediate' && (
                                        <>
                                            <div>
                                                <label className="text-sm font-medium text-foreground mb-1 block">{t('automation.timing.value')}</label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={formData.timing.value || 1}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        timing: { ...prev.timing, value: parseInt(e.target.value) || 1 }
                                                    }))}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-foreground mb-1 block">{t('automation.timing.unit')}</label>
                                                <Select
                                                    value={formData.timing.unit || 'days'}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        timing: { ...prev.timing, unit: e.target.value as 'minutes' | 'hours' | 'days' }
                                                    }))}
                                                    options={[
                                                        { value: 'minutes', label: t('automation.timing.minuteUnit') },
                                                        { value: 'hours', label: t('automation.timing.hourUnit') },
                                                        { value: 'days', label: t('automation.timing.dayUnit') }
                                                    ]}
                                                    fullWidth
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Dynamic Fields */}
                                <div>
                                    <p className="text-sm font-medium text-foreground mb-2">{t('variables.dynamicFields')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedTriggerConfig?.dynamicFields.map((field) => (
                                            <button
                                                data-allow-raw="true"
                                                key={field}
                                                type="button"
                                                onClick={() => insertDynamicField(field)}
                                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                                {field.replace(/\{\{|\}\}/g, '')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Message Template */}
                                <div className="flex-1">
                                    <label className="text-sm font-medium text-foreground mb-1 block">
                                        {t('automation.form.messageTemplate')}
                                        <span className="text-muted-foreground font-normal ml-2">{t('automation.form.charCount', { count: formData.templateContent.length })}</span>
                                    </label>
                                    <Textarea
                                        ref={textareaRef}
                                        value={formData.templateContent}
                                        onChange={(e) => setFormData(prev => ({ ...prev, templateContent: e.target.value }))}
                                        className="w-full h-full min-h-[150px] resize-none"
                                        placeholder={t('automation.form.templatePlaceholder')}
                                    />
                                    <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                                        <span>
                                            {t('automation.form.channelCount', { channel: channelLabel, count: Math.max(1, Math.ceil(formData.templateContent.length / SMS_SEGMENT_LENGTH)) })}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePreview(formData.templateContent)}
                                            className="h-6 text-xs"
                                            disabled={!formData.templateContent}
                                        >
                                            <Eye className="w-3 h-3 mr-1" /> {t('sms.message.previewBtn')}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setEditingRule(null);
                                    }}
                                >
                                    {t('automation.form.cancel')}
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleCreateRule}
                                >
                                    {editingRule ? t('automation.form.update') : t('automation.form.create')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Preview Modal */}
            {
                showPreview && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{channelLabel} {t('sms.message.preview')}</h3>
                                <button
                                    data-allow-raw="true"
                                    onClick={() => setShowPreview(false)}
                                    className="p-1 rounded-2xl hover:bg-muted dark:hover:bg-gray-700 transition-colors"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="bg-muted rounded-2xl p-4">
                                    <p className="text-xs text-muted-foreground mb-2">{t('sms.preview.sampleDataDisplay')}</p>
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-border">
                                        <p className="text-sm text-foreground whitespace-pre-wrap">{previewContent}</p>
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <p>{t('sms.preview.charCount', { count: previewContent.length })}</p>
                                    <p>{t('automation.form.channelCount', { channel: channelLabel, count: Math.max(1, Math.ceil(previewContent.length / SMS_SEGMENT_LENGTH)) })}</p>
                                </div>
                            </div>
                            <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                <Button
                                    variant="primary"
                                    className="w-full"
                                    onClick={() => setShowPreview(false)}
                                >
                                    {t('sms.preview.ok')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default SmsAutomationTab;
