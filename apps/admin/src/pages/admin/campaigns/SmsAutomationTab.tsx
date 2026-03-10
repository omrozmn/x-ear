import React, { useMemo, useRef, useState } from 'react';
import { Button, Card, Textarea } from '@x-ear/ui-web';
import toast from 'react-hot-toast';
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
    Package,
    Pause,
    Play,
    Plus,
    Settings,
    ShoppingCart,
    Trash2,
    TrendingUp,
    UserPlus,
    X,
    Zap
} from 'lucide-react';

// SMS Automation Trigger Types (tenant-focused)
type TriggerType =
    | 'new_tenant'            // Yeni tenant kaydı
    | 'trial_started'         // Deneme başladığında
    | 'trial_ending'          // Deneme bitiş yaklaşırken
    | 'subscription_created'  // Abonelik oluşturulduğunda
    | 'subscription_expiring' // Abonelik bitiş yaklaşırken
    | 'payment_received'      // Ödeme alındığında
    | 'payment_failed'        // Ödeme başarısız
    | 'feature_limit'         // Özellik limiti aşıldığında
    | 'inactive_tenant';      // Uzun süredir giriş yapmamış

type TimingType = 'immediate' | 'before' | 'after';
type TimingUnit = 'minutes' | 'hours' | 'days';

interface AutomationRule {
    id: string;
    name: string;
    trigger: TriggerType;
    templateName: string;
    templateContent: string;
    isActive: boolean;
    timing?: {
        type: TimingType;
        value?: number;
        unit?: TimingUnit;
    };
    stats?: {
        sent: number;
        delivered: number;
        failed: number;
    };
    createdAt: string;
    updatedAt: string;
}

// Trigger metadata with icons and descriptions (tenant-focused)
const TRIGGER_CONFIG: Record<TriggerType, {
    label: string;
    description: string;
    icon: React.ReactNode;
    category: 'tenant' | 'subscription' | 'payment' | 'other';
    defaultTiming: { type: TimingType; value?: number; unit?: TimingUnit };
    dynamicFields: string[];
}> = {
    new_tenant: {
        label: 'Yeni Tenant Kaydı',
        description: 'Sisteme yeni tenant eklendiğinde otomatik hoşgeldiniz mesajı gönderilir.',
        icon: <UserPlus className="w-5 h-5" />,
        category: 'tenant',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{ABONE_ADI}}', '{{TELEFON}}', '{{EMAIL}}']
    },
    trial_started: {
        label: 'Deneme Başlangıcı',
        description: 'Deneme sürümü başladığında bilgilendirme mesajı gönderilir.',
        icon: <TrendingUp className="w-5 h-5" />,
        category: 'subscription',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{ABONE_ADI}}', '{{DENEME_BITIS}}']
    },
    trial_ending: {
        label: 'Deneme Süresi Bitiyor',
        description: 'Deneme süresi bitmeden önce hatırlatma gönderilir.',
        icon: <AlertTriangle className="w-5 h-5" />,
        category: 'subscription',
        defaultTiming: { type: 'before', value: 3, unit: 'days' },
        dynamicFields: ['{{ABONE_ADI}}', '{{DENEME_BITIS}}', '{{KALAN_GUN}}']
    },
    subscription_created: {
        label: 'Abonelik Oluşturuldu',
        description: 'Yeni abonelik oluşturulduğunda teşekkür mesajı gönderilir.',
        icon: <ShoppingCart className="w-5 h-5" />,
        category: 'subscription',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{ABONE_ADI}}', '{{PAKET}}', '{{ABONELIK_BITIS}}']
    },
    subscription_expiring: {
        label: 'Abonelik Bitiyor',
        description: 'Abonelik bitiş tarihinden önce yenileme hatırlatması gönderilir.',
        icon: <Calendar className="w-5 h-5" />,
        category: 'subscription',
        defaultTiming: { type: 'before', value: 7, unit: 'days' },
        dynamicFields: ['{{ABONE_ADI}}', '{{PAKET}}', '{{ABONELIK_BITIS}}', '{{KALAN_GUN}}']
    },
    payment_received: {
        label: 'Ödeme Alındı',
        description: 'Ödeme alındığında teşekkür mesajı gönderilir.',
        icon: <CheckCircle className="w-5 h-5" />,
        category: 'payment',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{ABONE_ADI}}', '{{ODEME_TUTARI}}', '{{ODEME_TARIHI}}']
    },
    payment_failed: {
        label: 'Ödeme Başarısız',
        description: 'Ödeme başarısız olduğunda bilgilendirme mesajı gönderilir.',
        icon: <CreditCard className="w-5 h-5" />,
        category: 'payment',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{ABONE_ADI}}', '{{ODEME_TUTARI}}', '{{HATA_MESAJI}}']
    },
    feature_limit: {
        label: 'Özellik Limiti Aşıldı',
        description: 'Kullanım limiti aşıldığında upgrade teşvik mesajı gönderilir.',
        icon: <Package className="w-5 h-5" />,
        category: 'other',
        defaultTiming: { type: 'immediate' },
        dynamicFields: ['{{ABONE_ADI}}', '{{OZELLIK}}', '{{LIMIT}}', '{{KULLANIM}}']
    },
    inactive_tenant: {
        label: 'Uzun Süredir Giriş Yok',
        description: 'Belirli süre giriş yapmayan tenant\'lara hatırlatma gönderilir.',
        icon: <Bell className="w-5 h-5" />,
        category: 'other',
        defaultTiming: { type: 'after', value: 30, unit: 'days' },
        dynamicFields: ['{{ABONE_ADI}}', '{{SON_GIRIS}}', '{{GECEN_GUN}}']
    }
};

const CATEGORY_LABELS: Record<string, string> = {
    tenant: 'Tenant Yönetimi',
    subscription: 'Abonelik',
    payment: 'Ödeme',
    other: 'Diğer'
};

const SMS_SEGMENT_LENGTH = 155;

// Sample automation rules for demo
const SAMPLE_RULES: AutomationRule[] = [
    {
        id: 'auto_1',
        name: 'Hoşgeldiniz Mesajı',
        trigger: 'new_tenant',
        templateName: 'Yeni Tenant Hoşgeldiniz',
        templateContent: 'Sayın {{ABONE_ADI}}, X-Ear CRM ailesine hoş geldiniz! Başarılı bir yönetim süreci diliyoruz.',
        isActive: true,
        timing: { type: 'immediate' },
        stats: { sent: 45, delivered: 44, failed: 1 },
        createdAt: '2024-11-01T10:00:00Z',
        updatedAt: '2024-11-28T15:30:00Z'
    },
    {
        id: 'auto_2',
        name: 'Deneme Bitiş Hatırlatma',
        trigger: 'trial_ending',
        templateName: 'Deneme Hatırlatma',
        templateContent: 'Sayın {{ABONE_ADI}}, deneme süreniz {{KALAN_GUN}} gün içinde bitiyor. Şimdi abone olun!',
        isActive: true,
        timing: { type: 'before', value: 3, unit: 'days' },
        stats: { sent: 23, delivered: 23, failed: 0 },
        createdAt: '2024-11-05T14:00:00Z',
        updatedAt: '2024-11-28T09:00:00Z'
    }
];

interface SmsAutomationTabProps {
    creditBalance: number;
    creditLoading: boolean;
}

export const SmsAutomationTab: React.FC<SmsAutomationTabProps> = () => {
    const [rules, setRules] = useState<AutomationRule[]>(SAMPLE_RULES);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
    const [expandedCategory, setExpandedCategory] = useState<string | null>('subscription');
    const [showPreview, setShowPreview] = useState(false);
    const [previewContent, setPreviewContent] = useState('');

    const [formData, setFormData] = useState<{
        name: string;
        trigger: TriggerType;
        templateContent: string;
        timing: { type: TimingType; value?: number; unit?: TimingUnit };
    }>({
        name: '',
        trigger: 'new_tenant',
        templateContent: '',
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
        toast.success('Otomasyon durumu değiştirildi');
    };

    const handleDeleteRule = (ruleId: string) => {
        setRules(prev => prev.filter(r => r.id !== ruleId));
        toast.success('Otomasyon başarıyla silindi');
    };

    const handleCreateRule = () => {
        if (!formData.name.trim()) {
            toast.error('Kural adı zorunludur');
            return;
        }
        if (!formData.templateContent.trim()) {
            toast.error('Mesaj şablonu zorunludur');
            return;
        }

        const newRule: AutomationRule = {
            id: `auto_${Date.now()}`,
            name: formData.name,
            trigger: formData.trigger,
            templateName: formData.name,
            templateContent: formData.templateContent,
            isActive: true,
            timing: formData.timing,
            stats: { sent: 0, delivered: 0, failed: 0 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (editingRule) {
            setRules(prev => prev.map(r => r.id === editingRule.id ? { ...newRule, id: editingRule.id } : r));
            toast.success('Otomasyon başarıyla güncellendi');
        } else {
            setRules(prev => [...prev, newRule]);
            toast.success('Yeni otomasyon başarıyla eklendi');
        }

        setShowCreateModal(false);
        setEditingRule(null);
        setFormData({ name: '', trigger: 'new_tenant', templateContent: '', timing: { type: 'immediate' } });
    };

    const handleEditRule = (rule: AutomationRule) => {
        setEditingRule(rule);
        setFormData({
            name: rule.name,
            trigger: rule.trigger,
            templateContent: rule.templateContent,
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
        preview = preview
            .replace(/\{\{ABONE_ADI\}\}/g, 'Örnek Klinik')
            .replace(/\{\{TELEFON\}\}/g, '0532 123 45 67')
            .replace(/\{\{EMAIL\}\}/g, 'ornek@klinik.com')
            .replace(/\{\{PAKET\}\}/g, 'Pro Plan')
            .replace(/\{\{DENEME_BITIS\}\}/g, '15 Aralık 2024')
            .replace(/\{\{ABONELIK_BITIS\}\}/g, '15 Aralık 2025')
            .replace(/\{\{KALAN_GUN\}\}/g, '3')
            .replace(/\{\{ODEME_TUTARI\}\}/g, '1.500')
            .replace(/\{\{ODEME_TARIHI\}\}/g, '02 Aralık 2024')
            .replace(/\{\{HATA_MESAJI\}\}/g, 'Kart limiti yetersiz')
            .replace(/\{\{OZELLIK\}\}/g, 'Hasta Sayısı')
            .replace(/\{\{LIMIT\}\}/g, '100')
            .replace(/\{\{KULLANIM\}\}/g, '105')
            .replace(/\{\{SON_GIRIS\}\}/g, '02 Kasım 2024')
            .replace(/\{\{GECEN_GUN\}\}/g, '34');

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
                            setFormData({ name: '', trigger: 'new_tenant', templateContent: '', timing: { type: 'immediate' } });
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
                                data-allow-raw="true"
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
                                                    className={`p-4 rounded-2xl border ${rule.isActive ? 'border-indigo-200 bg-indigo-50/50 dark:bg-indigo-900/20 dark:border-indigo-800' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'}`}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-start gap-3 flex-1">
                                                            <div className={`p-2 rounded-2xl ${rule.isActive ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
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
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {editingRule ? 'Otomasyon Düzenle' : 'Yeni Otomasyon Oluştur'}
                            </h3>
                            <button
                                data-allow-raw="true"
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setEditingRule(null);
                                }}
                                className="p-1 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                    Kural Adı *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Örn: Hoşgeldiniz Mesajı"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                    Tetikleyici Olay *
                                </label>
                                <select
                                    value={formData.trigger}
                                    onChange={(e) => {
                                        const trigger = e.target.value as TriggerType;
                                        setFormData(prev => ({
                                            ...prev,
                                            trigger,
                                            timing: TRIGGER_CONFIG[trigger].defaultTiming
                                        }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                >
                                    {Object.entries(TRIGGER_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>
                                            {config.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {selectedTriggerConfig?.description}
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                    Gönderim Zamanlaması
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        value={formData.timing.type}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            timing: { ...prev.timing, type: e.target.value as TimingType }
                                        }))}
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="immediate">Hemen</option>
                                        <option value="before">Önce</option>
                                        <option value="after">Sonra</option>
                                    </select>
                                    {formData.timing.type !== 'immediate' && (
                                        <>
                                            <input
                                                type="number"
                                                value={formData.timing.value || ''}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    timing: { ...prev.timing, value: parseInt(e.target.value) || 0 }
                                                }))}
                                                className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                                min="1"
                                            />
                                            <select
                                                value={formData.timing.unit || 'days'}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    timing: { ...prev.timing, unit: e.target.value as TimingUnit }
                                                }))}
                                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                            >
                                                <option value="minutes">Dakika</option>
                                                <option value="hours">Saat</option>
                                                <option value="days">Gün</option>
                                            </select>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                    Dinamik Alanlar
                                </label>
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
                                            {field}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                    Mesaj Şablonu *
                                </label>
                                <Textarea
                                    ref={textareaRef}
                                    value={formData.templateContent}
                                    onChange={(e) => setFormData(prev => ({ ...prev, templateContent: e.target.value }))}
                                    className="w-full min-h-[150px] resize-none"
                                    placeholder="SMS mesajınızı buraya yazın..."
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {formData.templateContent.length} karakter / {Math.max(1, Math.ceil(formData.templateContent.length / SMS_SEGMENT_LENGTH))} SMS
                                </p>
                            </div>
                        </div>
                        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => handlePreview(formData.templateContent)}
                                disabled={!formData.templateContent.trim()}
                            >
                                <Eye className="w-4 h-4 mr-2" />
                                Önizle
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1"
                                onClick={handleCreateRule}
                            >
                                {editingRule ? 'Güncelle' : 'Oluştur'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
                        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SMS Önizleme</h3>
                            <button
                                data-allow-raw="true"
                                onClick={() => setShowPreview(false)}
                                className="p-1 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4">
                                <p className="text-xs text-gray-500 dark:text-gray-300 mb-2">
                                    Örnek Alıcı: Örnek Klinik
                                </p>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-200 dark:border-gray-600">
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
            )}
        </div>
    );
};

export default SmsAutomationTab;
