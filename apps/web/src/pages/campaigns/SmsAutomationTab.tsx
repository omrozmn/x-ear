import React, { useMemo, useRef, useState } from 'react';
import { Button, Card, Textarea, Input, Select, useToastHelpers, Checkbox } from '@x-ear/ui-web';
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
    Loader2,
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
import { useListSmsHeadersApiSmsHeadersGet, getListSmsHeadersQueryKey } from '@/api/generated';
import { useAuthStore } from '@/stores/authStore';

// SMS Automation Trigger Types
type TriggerType =
    | 'new_patient'           // Yeni hasta kaydı
    | 'device_sale'           // Cihaz satışı
    | 'device_delivery'       // Cihaz teslimi
    | 'promissory_created'    // Senet oluşturma
    | 'promissory_reminder'   // Senet ödeme hatırlatma
    | 'appointment_created'   // Randevu oluşturulduğunda
    | 'appointment_reminder'  // Randevu hatırlatma
    | 'appointment_day'       // Randevu günü sabahı
    | 'trial_started'         // Deneme başladığında
    | 'trial_ending'          // Deneme bitiş yaklaşırken
    | 'birthday'              // Doğum günü
    | 'control_reminder'      // Kontrol hatırlatma
    | 'payment_received'      // Ödeme alındığında
    | 'invoice_created';      // Fatura oluşturulduğunda

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
const TRIGGER_CONFIG: Record<TriggerType, {
    label: string;
    description: string;
    icon: React.ReactNode;
    category: 'patient' | 'sales' | 'appointment' | 'payment' | 'other';
    defaultTiming: { type: 'immediate' | 'before' | 'after'; value?: number; unit?: 'minutes' | 'hours' | 'days' };
    dynamicFields: string[];
}> = {
    new_patient: {
        label: 'Yeni Hasta Kaydı',
        description: 'Sisteme yeni hasta eklendiğinde otomatik hoşgeldiniz mesajı gönderilir.',
        icon: <UserPlus className="w-5 h-5" />,
        category: 'patient',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{AD_SOYAD}}', '{{TELEFON}}', '{{SUBE}}']
    },
    device_sale: {
        label: 'Cihaz Satışı',
        description: 'Hastaya cihaz satışı yapıldığında bilgilendirme mesajı gönderilir.',
        icon: <ShoppingCart className="w-5 h-5" />,
        category: 'sales',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{CIHAZ_ADI}}', '{{CIHAZ_MARKASI}}', '{{TOPLAM_TUTAR}}', '{{SUBE}}']
    },
    device_delivery: {
        label: 'Cihaz Teslimi',
        description: 'Cihaz hastaya teslim edildiğinde kullanım bilgileri gönderilir.',
        icon: <Package className="w-5 h-5" />,
        category: 'sales',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{CIHAZ_ADI}}', '{{SERI_NO}}', '{{GARANTI_BITIS}}']
    },
    promissory_created: {
        label: 'Senet Oluşturma',
        description: 'Taksitli satışlarda senet oluşturulduğunda bilgilendirme yapılır.',
        icon: <FileText className="w-5 h-5" />,
        category: 'payment',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{SENET_TUTARI}}', '{{VADE_TARIHI}}', '{{TAKSIT_SAYISI}}']
    },
    promissory_reminder: {
        label: 'Senet Ödeme Hatırlatma',
        description: 'Senet vade tarihinden önce ödeme hatırlatması gönderilir.',
        icon: <CreditCard className="w-5 h-5" />,
        category: 'payment',
        defaultTiming: { type: 'before', value: 3, unit: 'days' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{SENET_TUTARI}}', '{{VADE_TARIHI}}', '{{KALAN_GUN}}']
    },
    appointment_created: {
        label: 'Randevu Oluşturuldu',
        description: 'Yeni randevu oluşturulduğunda onay mesajı gönderilir.',
        icon: <Calendar className="w-5 h-5" />,
        category: 'appointment',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{RANDEVU_TARIHI}}', '{{RANDEVU_SAATI}}', '{{RANDEVU_TURU}}', '{{SUBE}}']
    },
    appointment_reminder: {
        label: 'Randevu Hatırlatma',
        description: 'Randevu tarihinden önce hatırlatma mesajı gönderilir.',
        icon: <Bell className="w-5 h-5" />,
        category: 'appointment',
        defaultTiming: { type: 'before', value: 1, unit: 'days' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{RANDEVU_TARIHI}}', '{{RANDEVU_SAATI}}', '{{SUBE}}', '{{KALAN_SAAT}}']
    },
    appointment_day: {
        label: 'Randevu Günü Sabahı',
        description: 'Randevu günü sabahı hatırlatma mesajı gönderilir.',
        icon: <Clock className="w-5 h-5" />,
        category: 'appointment',
        defaultTiming: { type: 'before', value: 3, unit: 'hours' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{RANDEVU_SAATI}}', '{{SUBE}}']
    },
    trial_started: {
        label: 'Deneme Başlangıcı',
        description: 'Deneme cihazı verildiğinde bilgilendirme mesajı gönderilir.',
        icon: <TrendingUp className="w-5 h-5" />,
        category: 'sales',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{CIHAZ_ADI}}', '{{DENEME_BITIS}}']
    },
    trial_ending: {
        label: 'Deneme Süresi Bitiyor',
        description: 'Deneme süresi bitmeden önce hatırlatma gönderilir.',
        icon: <AlertTriangle className="w-5 h-5" />,
        category: 'sales',
        defaultTiming: { type: 'before', value: 2, unit: 'days' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{CIHAZ_ADI}}', '{{DENEME_BITIS}}', '{{KALAN_GUN}}']
    },
    birthday: {
        label: 'Doğum Günü',
        description: 'Hastanın doğum gününde tebrik mesajı gönderilir.',
        icon: <User className="w-5 h-5" />,
        category: 'other',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{YAS}}']
    },
    control_reminder: {
        label: 'Kontrol Hatırlatma',
        description: 'Periyodik kontrol zamanı geldiğinde hatırlatma gönderilir.',
        icon: <Settings className="w-5 h-5" />,
        category: 'other',
        defaultTiming: { type: 'before', value: 7, unit: 'days' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{SON_KONTROL}}', '{{CIHAZ_ADI}}']
    },
    payment_received: {
        label: 'Ödeme Alındı',
        description: 'Ödeme alındığında teşekkür mesajı gönderilir.',
        icon: <CheckCircle className="w-5 h-5" />,
        category: 'payment',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{ODEME_TUTARI}}', '{{ODEME_TARIHI}}', '{{KALAN_BORC}}']
    },
    invoice_created: {
        label: 'Fatura Oluşturuldu',
        description: 'Fatura kesildiğinde bilgilendirme mesajı gönderilir.',
        icon: <FileText className="w-5 h-5" />,
        category: 'payment',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{AD}}', '{{SOYAD}}', '{{FATURA_NO}}', '{{FATURA_TUTARI}}', '{{FATURA_TARIHI}}']
    }
};

const CATEGORY_LABELS: Record<string, string> = {
    patient: 'Hasta Yönetimi',
    sales: 'Satış & Cihaz',
    appointment: 'Randevu',
    payment: 'Ödeme & Fatura',
    other: 'Diğer'
};

const SMS_SEGMENT_LENGTH = 155;

// Sample automation rules for demo
const SAMPLE_RULES: AutomationRule[] = [
    {
        id: 'auto_1',
        name: 'Hoşgeldiniz Mesajı',
        trigger: 'new_patient',
        templateName: 'Yeni Hasta Hoşgeldiniz',
        templateContent: 'Sayın {{AD}} {{SOYAD}}, X-Ear ailesine hoş geldiniz! Sağlıklı bir duyuş yolculuğu diliyoruz.',
        isActive: true,
        timing: { type: 'immediate' },
        stats: { sent: 156, delivered: 154, failed: 2 },
        createdAt: '2024-11-01T10:00:00Z',
        updatedAt: '2024-11-28T15:30:00Z'
    },
    {
        id: 'auto_2',
        name: 'Randevu Hatırlatma (1 Gün Önce)',
        trigger: 'appointment_reminder',
        templateName: 'Randevu Hatırlatma',
        templateContent: 'Sayın {{AD}} {{SOYAD}}, yarın saat {{RANDEVU_SAATI}} için {{SUBE}} şubemizde randevunuz bulunmaktadır. Sizi bekliyoruz.',
        isActive: true,
        timing: { type: 'before', value: 1, unit: 'days' },
        stats: { sent: 89, delivered: 88, failed: 1 },
        createdAt: '2024-11-05T14:00:00Z',
        updatedAt: '2024-11-28T09:00:00Z'
    },
    {
        id: 'auto_3',
        name: 'Senet Ödeme Hatırlatma',
        trigger: 'promissory_reminder',
        templateName: 'Senet Hatırlatma',
        templateContent: 'Sayın {{AD}} {{SOYAD}}, {{VADE_TARIHI}} tarihli {{SENET_TUTARI}} TL tutarındaki senet ödemenizi hatırlatmak isteriz.',
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
}

export const SmsAutomationTab: React.FC<SmsAutomationTabProps> = ({ creditBalance, creditLoading }) => {
    const [rules, setRules] = useState<AutomationRule[]>(SAMPLE_RULES);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
    const [expandedCategory, setExpandedCategory] = useState<string | null>('appointment');
    const [showPreview, setShowPreview] = useState(false);
    const [previewContent, setPreviewContent] = useState('');
    const { success: showSuccessToast, error: showErrorToast } = useToastHelpers();
    const { token } = useAuthStore();

    // Get SMS headers for sender selection
    const { data: headersData, isLoading: headersLoading, isError: headersError } = useListSmsHeadersApiSmsHeadersGet({
        query: { queryKey: getListSmsHeadersQueryKey(), refetchOnWindowFocus: false, enabled: !!token }
    });

    // Parse SMS headers and filter only approved ones
    const headerOptions = useMemo(() => {
        let headersRaw: Array<{ id?: string; headerText?: string; status?: string; isDefault?: boolean }> = [];
        if (headersData) {
            if (Array.isArray(headersData)) {
                headersRaw = headersData;
            } else if ((headersData as any)?.data) {
                const innerData = (headersData as any).data;
                if (Array.isArray(innerData)) {
                    headersRaw = innerData;
                } else if (innerData?.data && Array.isArray(innerData.data)) {
                    headersRaw = innerData.data;
                }
            }
        }
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
        trigger: 'new_patient',
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
        showSuccessToast('Otomasyon güncellendi', 'Kural durumu değiştirildi.');
    };

    const handleDeleteRule = (ruleId: string) => {
        setRules(prev => prev.filter(r => r.id !== ruleId));
        showSuccessToast('Otomasyon silindi', 'Kural başarıyla silindi.');
    };

    const handleCreateRule = () => {
        if (!formData.name.trim()) {
            showErrorToast('Hata', 'Kural adı zorunludur.');
            return;
        }
        if (!formData.templateContent.trim()) {
            showErrorToast('Hata', 'Mesaj şablonu zorunludur.');
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
            showSuccessToast('Otomasyon güncellendi', 'Kural başarıyla güncellendi.');
        } else {
            setRules(prev => [...prev, newRule]);
            showSuccessToast('Otomasyon oluşturuldu', 'Yeni kural başarıyla eklendi.');
        }

        setShowCreateModal(false);
        setEditingRule(null);
        setFormData({ name: '', trigger: 'new_patient', templateContent: '', headerId: '', timing: { type: 'immediate' } });
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
            .replace(/\{\{SOYAD\}\}/g, 'Yılmaz')
            .replace(/\{\{AD_SOYAD\}\}/g, 'Ahmet Yılmaz')
            .replace(/\{\{TELEFON\}\}/g, '0532 123 45 67')
            .replace(/\{\{SUBE\}\}/g, 'Merkez Şube')
            .replace(/\{\{RANDEVU_TARIHI\}\}/g, '15 Aralık 2024')
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
            .replace(/\{\{FATURA_TARIHI\}\}/g, '02 Aralık 2024')
            .replace(/\{\{ODEME_TUTARI\}\}/g, '10.000')
            .replace(/\{\{ODEME_TARIHI\}\}/g, '02 Aralık 2024')
            .replace(/\{\{KALAN_BORC\}\}/g, '35.000')
            .replace(/\{\{DENEME_BITIS\}\}/g, '10 Aralık 2024')
            .replace(/\{\{SERI_NO\}\}/g, 'RS2024123456')
            .replace(/\{\{GARANTI_BITIS\}\}/g, '02 Aralık 2026')
            .replace(/\{\{TAKSIT_SAYISI\}\}/g, '12')
            .replace(/\{\{SON_KONTROL\}\}/g, '02 Haziran 2024')
            .replace(/\{\{YAS\}\}/g, '65');

        setPreviewContent(preview);
        setShowPreview(true);
    };

    const smsSegments = formData.templateContent.length > 0
        ? Math.max(1, Math.ceil(formData.templateContent.length / SMS_SEGMENT_LENGTH))
        : 0;

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
                            <p className="text-xs text-gray-500 dark:text-gray-400">Aktif Otomasyon</p>
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
                            <p className="text-xs text-gray-500 dark:text-gray-400">Toplam Gönderim</p>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalSent.toLocaleString('tr-TR')}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Toplam Kural</p>
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
                            setFormData({ name: '', trigger: 'new_patient', templateContent: '', headerId: '', timing: { type: 'immediate' } });
                            setShowCreateModal(true);
                        }}
                    >
                        <Plus className="w-5 h-5" />
                        Yeni Otomasyon
                    </Button>
                </Card>
            </div>

            {/* Automation Rules by Category */}
            <div className="space-y-4">
                {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
                    const categoryRules = groupedRules[category] || [];
                    const isExpanded = expandedCategory === category;

                    return (
                        <Card key={category} className="overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                            <button
                                type="button"
                                className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-colors"
                                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{label}</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">({categoryRules.length} kural)</span>
                                </div>
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                            </button>

                            {isExpanded && (
                                <div className="p-4 space-y-3">
                                    {categoryRules.length === 0 ? (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                            Bu kategoride henüz otomasyon kuralı bulunmuyor.
                                        </p>
                                    ) : (
                                        categoryRules.map((rule) => {
                                            const triggerConfig = TRIGGER_CONFIG[rule.trigger];
                                            return (
                                                <div
                                                    key={rule.id}
                                                    className={`p-4 rounded-lg border ${rule.isActive ? 'border-indigo-200 bg-indigo-50/50 dark:bg-indigo-900/20 dark:border-indigo-800' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'}`}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-start gap-3 flex-1">
                                                            <div className={`p-2 rounded-lg ${rule.isActive ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                                                {triggerConfig?.icon}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-medium text-gray-900 dark:text-white">{rule.name}</h4>
                                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${rule.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                                                                        {rule.isActive ? 'Aktif' : 'Pasif'}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{triggerConfig?.label}</p>
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 line-clamp-2">{rule.templateContent}</p>

                                                                {rule.timing && rule.timing.type !== 'immediate' && (
                                                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        {rule.timing.value} {rule.timing.unit === 'days' ? 'gün' : rule.timing.unit === 'hours' ? 'saat' : 'dakika'} {rule.timing.type === 'before' ? 'önce' : 'sonra'}
                                                                    </p>
                                                                )}

                                                                {rule.stats && (
                                                                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                                                                        <span>Gönderildi: {rule.stats.sent}</span>
                                                                        <span>İletildi: {rule.stats.delivered}</span>
                                                                        <span>Başarısız: {rule.stats.failed}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handlePreview(rule.templateContent)}
                                                                title="Önizle"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleEditRule(rule)}
                                                                title="Düzenle"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleToggleRule(rule.id)}
                                                                title={rule.isActive ? 'Duraklat' : 'Etkinleştir'}
                                                            >
                                                                {rule.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteRule(rule.id)}
                                                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                                                title="Sil"
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
                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Kullanılabilir tetikleyiciler:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(TRIGGER_CONFIG)
                                                .filter(([_, config]) => config.category === category)
                                                .map(([trigger, config]) => (
                                                    <button
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
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        {config.label}
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
                                    {editingRule ? 'Otomasyonu Düzenle' : 'Yeni Otomasyon Oluştur'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setEditingRule(null);
                                    }}
                                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="p-4 space-y-4 overflow-y-auto flex-1">
                                {/* Trigger Selection */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Tetikleyici</label>
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
                                            label: `${config.label} (${CATEGORY_LABELS[config.category]})`
                                        }))}
                                        fullWidth
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{selectedTriggerConfig?.description}</p>
                                </div>

                                {/* Rule Name */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Kural Adı</label>
                                    <Input
                                        type="text"
                                        placeholder="Örn: Hoşgeldiniz Mesajı"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full"
                                    />
                                </div>

                                {/* SMS Header Selection */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Gönderici Başlığı</label>
                                    <Select
                                        value={formData.headerId || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, headerId: e.target.value }))}
                                        options={headersLoading
                                            ? [{ value: '', label: 'Başlıklar Yükleniyor...' }]
                                            : headersError
                                                ? [{ value: '', label: 'Başlık Hatası' }]
                                                : [{ value: '', label: 'Varsayılan' }, ...headerOptions]
                                        }
                                        fullWidth
                                        disabled={headersLoading}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Sadece onaylı başlıklar gösterilir</p>
                                </div>

                                {/* Timing Configuration */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Zamanlama</label>
                                        <Select
                                            value={formData.timing.type}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                timing: { ...prev.timing, type: e.target.value as 'immediate' | 'before' | 'after' }
                                            }))}
                                            options={[
                                                { value: 'immediate', label: 'Anında' },
                                                { value: 'before', label: 'Önce' },
                                                { value: 'after', label: 'Sonra' }
                                            ]}
                                            fullWidth
                                        />
                                    </div>
                                    {formData.timing.type !== 'immediate' && (
                                        <>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Değer</label>
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
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Birim</label>
                                                <Select
                                                    value={formData.timing.unit || 'days'}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        timing: { ...prev.timing, unit: e.target.value as 'minutes' | 'hours' | 'days' }
                                                    }))}
                                                    options={[
                                                        { value: 'minutes', label: 'Dakika' },
                                                        { value: 'hours', label: 'Saat' },
                                                        { value: 'days', label: 'Gün' }
                                                    ]}
                                                    fullWidth
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Dynamic Fields */}
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dinamik Alanlar</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedTriggerConfig?.dynamicFields.map((field) => (
                                            <button
                                                key={field}
                                                type="button"
                                                onClick={() => insertDynamicField(field)}
                                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                                {field.replace(/\{\{|\}\}/g, '')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Message Template */}
                                <div className="flex-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                        Mesaj Şablonu
                                        <span className="text-gray-400 font-normal ml-2">({formData.templateContent.length} karakter)</span>
                                    </label>
                                    <Textarea
                                        ref={textareaRef}
                                        value={formData.templateContent}
                                        onChange={(e) => setFormData(prev => ({ ...prev, templateContent: e.target.value }))}
                                        className="w-full h-full min-h-[150px] resize-none"
                                        placeholder="Mesaj şablonunu buraya yazın..."
                                    />
                                    <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        <span>
                                            SMS Sayısı: {Math.max(1, Math.ceil(formData.templateContent.length / SMS_SEGMENT_LENGTH))}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePreview(formData.templateContent)}
                                            className="h-6 text-xs"
                                            disabled={!formData.templateContent}
                                        >
                                            <Eye className="w-3 h-3 mr-1" /> Önizle
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
                                    İptal
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleCreateRule}
                                >
                                    {editingRule ? 'Güncelle' : 'Oluştur'}
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
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SMS Önizleme</h3>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-300 mb-2">Örnek veri göserimi:</p>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-600">
                                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{previewContent}</p>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                    <p>Karakter sayısı: {previewContent.length}</p>
                                    <p>SMS sayısı: {Math.max(1, Math.ceil(previewContent.length / SMS_SEGMENT_LENGTH))}</p>
                                </div>
                            </div>
                            <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                <Button
                                    variant="primary"
                                    className="w-full"
                                    onClick={() => setShowPreview(false)}
                                >
                                    Tamam
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
